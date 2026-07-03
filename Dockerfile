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
add_header Permissions-Policy "accelerometer=(), autoplay=(), bluetooth=(), browsing-topics=(), camera=(self), display-capture=(), encrypted-media=(), fullscreen=(self), geolocation=(), gyroscope=(), hid=(), idle-detection=(), local-fonts=(), magnetometer=(), microphone=(), midi=(), payment=(), publickey-credentials-get=(), screen-wake-lock=(), serial=(), usb=(), xr-spatial-tracking=()" always;
add_header Cross-Origin-Opener-Policy "same-origin" always;
add_header Cross-Origin-Resource-Policy "same-origin" always;
EOF

# Server block: SPA fallback + security headers (snippet re-included per location) + caching.
COPY <<'EOF' /etc/nginx/conf.d/default.conf
server {
  listen 8080;
  server_name _;
  root /usr/share/nginx/html;
  index index.html;

  include /etc/nginx/snippets/security-headers.conf;

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

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080
USER 101
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:8080/ || exit 1
CMD ["nginx", "-g", "daemon off;"]
