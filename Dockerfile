# syntax=docker/dockerfile:1.7

# ── Stage 1 — build the static site with Vite ────────────────────────────────
FROM node:20-alpine AS build
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

# Server block: SPA fallback + security headers + long-cache for hashed assets.
COPY <<'EOF' /etc/nginx/conf.d/default.conf
server {
  listen 8080;
  server_name _;
  root /usr/share/nginx/html;
  index index.html;

  add_header X-Content-Type-Options nosniff always;
  add_header X-Frame-Options SAMEORIGIN always;
  add_header Referrer-Policy no-referrer always;

  # PWA service worker + registration must NOT be long-cached — autoUpdate relies on revalidation.
  # Exact-match locations outrank the hashed-asset regex below.
  location = /sw.js {
    add_header Cache-Control "no-cache";
    add_header X-Content-Type-Options nosniff always;
  }
  location = /registerSW.js {
    add_header Cache-Control "no-cache";
    add_header X-Content-Type-Options nosniff always;
  }
  location = /manifest.webmanifest {
    default_type application/manifest+json;
    add_header Cache-Control "no-cache";
  }

  # Immutable, content-hashed build assets + OCR models/wasm — cache hard.
  location ~* \.(?:js|css|woff2?|png|jpe?g|gif|svg|ico|wasm|traineddata|gz)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }

  # Never cache the entry document so new deploys are picked up immediately.
  location = /index.html {
    expires -1;
    add_header Cache-Control "no-cache";
  }

  # SPA fallback: unknown routes resolve to the app shell.
  location / {
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
