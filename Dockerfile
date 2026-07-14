# syntax=docker/dockerfile:1.7

# ── Stage 1 — build the static site with Vite ────────────────────────────────
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

# ── Stage 2 — serve with a hardened, non-root nginx ──────────────────────────
FROM nginx:1.31-alpine AS production

# Opt-in Typhoon cloud OCR: the /api proxy is rendered from a template at container start, injecting the
# TYPHOON_API secret SERVER-SIDE (never in the client bundle). Output goes to /tmp (writable by the
# non-root UID 101); FILTER ensures ONLY ${TYPHOON_API} is substituted, leaving nginx's own $variables
# intact. No key set ⇒ the proxy renders with an empty key ⇒ graceful 503 / capabilities:false.
ENV NGINX_ENVSUBST_OUTPUT_DIR=/tmp/nginx-api \
    NGINX_ENVSUBST_FILTER=TYPHOON_API|NGINX_LOCAL_RESOLVERS|NGINX_RESOLVER_FLAGS \
    NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1 \
    NGINX_RESOLVER_FLAGS="ipv6=off" \
    TYPHOON_API=""
# ^ TYPHOON_API: empty default so envsubst always has the var DEFINED (an UNSET var would leave the
# literal ${TYPHOON_API} in the config and nginx would reject it). Deployers override it at runtime
# (docker run -e TYPHOON_API=… / compose env_file) to turn on cloud OCR; unset ⇒ graceful 503.
#
# NGINX_RESOLVER_FLAGS: tunes how the Typhoon upstream hostname is resolved. Default "ipv6=off" keeps
# the historical IPv4-only behaviour for IPv4/dual-stack hosts. On an IPv6-ONLY-egress host (e.g. an
# EC2 box with no public IPv4 that reaches api.opentyphoon.ai over IPv6) set "ipv4=off ipv6=on" so
# nginx resolves the AAAA and never stalls trying an unreachable A record. (nginx ≥1.23.1 supports ipv4=off.)

# Main config: pid + temp paths under /tmp so the unprivileged UID 101 can write.
COPY <<'EOF' /etc/nginx/nginx.conf
worker_processes auto;
pid /tmp/nginx.pid;
error_log /dev/stderr warn;
events { worker_connections 1024; }
http {
  client_body_temp_path /tmp/client_temp;
  proxy_temp_path       /tmp/proxy_temp;
  fastcgi_temp_path     /tmp/fastcgi_temp;
  uwsgi_temp_path       /tmp/uwsgi_temp;
  scgi_temp_path        /tmp/scgi_temp;

  include       /etc/nginx/mime.types;
  default_type  application/octet-stream;
  access_log /dev/stdout;
  sendfile on;
  keepalive_timeout 65;

  gzip on;
  gzip_comp_level 6;
  gzip_min_length 1024;
  gzip_types text/plain text/css application/json application/javascript
             text/xml application/xml image/svg+xml application/wasm;

  include /etc/nginx/conf.d/*.conf;
}
EOF

# Security headers. Kept in a snippet because nginx `add_header` does NOT inherit into a location
# that declares any add_header of its own — so this must be re-included in every such location.
# CSP `connect-src 'self'` makes the zero-egress guarantee browser-enforced; `wasm-unsafe-eval`
# + `worker-src blob:` keep the tesseract.js OCR worker working.
COPY <<'EOF' /etc/nginx/snippets/security-headers.conf
add_header Content-Security-Policy "default-src 'self'; base-uri 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; worker-src 'self' blob:; manifest-src 'self'; media-src 'self'; object-src 'none'; frame-src 'none'; frame-ancestors 'none'; form-action 'self'" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "no-referrer" always;
add_header X-Frame-Options "DENY" always;
add_header Permissions-Policy "accelerometer=(), autoplay=(), bluetooth=(), browsing-topics=(), camera=(self), display-capture=(), encrypted-media=(), fullscreen=(self), geolocation=(), gyroscope=(), hid=(), idle-detection=(), local-fonts=(), magnetometer=(), microphone=(self), midi=(), payment=(), publickey-credentials-get=(), screen-wake-lock=(), serial=(), usb=(), xr-spatial-tracking=()" always;
add_header Cross-Origin-Opener-Policy "same-origin" always;
add_header Cross-Origin-Resource-Policy "same-origin" always;
EOF

# Opt-in cloud OCR proxy — envsubst renders this to /tmp/nginx-api/typhoon-api.conf at container start
# and it is `include`d into the server block below. `${TYPHOON_API}` is the ONLY substituted token; every
# `$typhoon_*` below is a real nginx variable left untouched by the FILTER.
COPY <<'EOF' /etc/nginx/templates/typhoon-api.conf.template
resolver ${NGINX_LOCAL_RESOLVERS} valid=30s ${NGINX_RESOLVER_FLAGS};
set $typhoon_key "${TYPHOON_API}";

# Capability probe the SPA calls on load to decide whether to offer the cloud toggles. One key
# (TYPHOON_API) gates both the cloud OCR and the ASR reading-assessment features.
location = /api/ocr-capabilities {
  include /etc/nginx/snippets/security-headers.conf;
  default_type application/json;
  if ($typhoon_key = "") { return 200 '{"typhoon":false,"asr":false}'; }
  return 200 '{"typhoon":true,"asr":true}';
}

# Same-origin proxy → Typhoon OCR. The browser never sees the key; nginx injects it here.
location = /api/typhoon-ocr {
  include /etc/nginx/snippets/security-headers.conf;
  if ($typhoon_key = "") { return 503 '{"error":"typhoon_not_configured"}'; }
  set $typhoon_upstream "api.opentyphoon.ai";
  proxy_pass https://$typhoon_upstream/v1/ocr;
  proxy_http_version 1.1;
  proxy_ssl_server_name on;
  proxy_ssl_name $typhoon_upstream;
  proxy_set_header Host $typhoon_upstream;
  proxy_set_header Authorization "Bearer $typhoon_key";
  proxy_set_header Cookie "";
  client_max_body_size 25m;
  proxy_read_timeout 120s;
  proxy_send_timeout 120s;
}

# Same-origin proxy → Typhoon ASR (OpenAI-compatible batch transcription). Reuses the SAME
# server-side key; the browser posts short audio windows here and never sees the key.
location = /api/typhoon-asr {
  include /etc/nginx/snippets/security-headers.conf;
  if ($typhoon_key = "") { return 503 '{"error":"typhoon_not_configured"}'; }
  set $typhoon_upstream "api.opentyphoon.ai";
  proxy_pass https://$typhoon_upstream/v1/audio/transcriptions;
  proxy_http_version 1.1;
  proxy_ssl_server_name on;
  proxy_ssl_name $typhoon_upstream;
  proxy_set_header Host $typhoon_upstream;
  proxy_set_header Authorization "Bearer $typhoon_key";
  proxy_set_header Cookie "";
  client_max_body_size 25m;
  proxy_read_timeout 120s;
  proxy_send_timeout 120s;
}
EOF

# Server block: SPA fallback + security headers (snippet re-included per location) + caching.
COPY <<'EOF' /etc/nginx/conf.d/default.conf
server {
  listen 8080;
  server_name _;
  root /usr/share/nginx/html;
  index index.html;

  include /etc/nginx/snippets/security-headers.conf;

  # Opt-in cloud OCR proxy — present only when TYPHOON_API is set at runtime (the glob is a harmless
  # no-op otherwise, keeping the site 100% static/private by default).
  include /tmp/nginx-api/*.conf;

  # PWA service worker + registration must NOT be long-cached — autoUpdate relies on revalidation.
  location = /sw.js {
    include /etc/nginx/snippets/security-headers.conf;
    add_header Cache-Control "no-cache";
  }
  location = /registerSW.js {
    include /etc/nginx/snippets/security-headers.conf;
    add_header Cache-Control "no-cache";
  }
  location = /manifest.webmanifest {
    include /etc/nginx/snippets/security-headers.conf;
    default_type application/manifest+json;
    add_header Cache-Control "no-cache";
  }

  # Immutable, content-hashed build assets + OCR models/wasm — cache hard.
  location ~* \.(?:js|css|woff2?|png|jpe?g|gif|svg|ico|wasm|traineddata|gz)$ {
    include /etc/nginx/snippets/security-headers.conf;
    expires 1y;
    add_header Cache-Control "public, immutable";
  }

  # Never cache the entry document so new deploys are picked up immediately.
  location = /index.html {
    include /etc/nginx/snippets/security-headers.conf;
    expires -1;
    add_header Cache-Control "no-cache";
  }

  # SPA fallback: unknown routes resolve to the app shell.
  location / {
    include /etc/nginx/snippets/security-headers.conf;
    try_files $uri $uri/ /index.html;
  }
}
EOF

# The stock envsubst entrypoint does not create its output dir; make it before 20-envsubst runs (as the
# non-root user — /tmp is 1777) so the templated proxy config renders. `15-local-resolvers.envsh` (base
# image) exports NGINX_LOCAL_RESOLVERS from /etc/resolv.conf for the resolver above.
COPY <<'EOF' /docker-entrypoint.d/19-mkdir-nginx-api.sh
#!/bin/sh
mkdir -p /tmp/nginx-api
EOF
RUN chmod +x /docker-entrypoint.d/19-mkdir-nginx-api.sh

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080
USER 101
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:8080/ || exit 1
CMD ["nginx", "-g", "daemon off;"]
