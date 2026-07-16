#!/usr/bin/env bash
# Verify an opendys deployment. Works against the origin on the box (http://127.0.0.1:8080) or the
# public edge (https://opendys.com) — it detects which and adjusts, because Cloudflare rewrites
# some headers.
#
#   ./scripts/verify-deploy.sh                     # defaults to https://opendys.com
#   ./scripts/verify-deploy.sh http://127.0.0.1:8080  # on the box, inside the EIP window
#
# Exits non-zero if any check fails. See DEPLOY-AWS.md.
#
# NOTE ON STYLE: every check ends in an explicit test ([ ... ] or grep -q), never a bare pipeline.
# A pipeline's exit status is its LAST command's, so `... | grep -o X | sed ... || echo FAIL` can
# never report failure — sed succeeds on empty input. A check that cannot fail is worse than no
# check, so scripts/test-verify-deploy.sh exercises each one against a deliberately-broken
# deployment. Ported from the sibling smart-hand-math repo, which shares this instance.

set -uo pipefail

ORIGIN="${1:-https://opendys.com}"
PASS=0
FAIL=0

ok()   { printf '  \033[32m✓\033[0m %s\n' "$1"; PASS=$((PASS + 1)); }
bad()  { printf '  \033[31m✗\033[0m %s\n' "$1"; FAIL=$((FAIL + 1)); }
info() { printf '    %s\n' "$1"; }

echo "Verifying $ORIGIN"

head=$(curl -sI --max-time 15 "$ORIGIN/" 2>/dev/null)
body=$(curl -s  --max-time 15 "$ORIGIN/" 2>/dev/null)
sw=$(curl -s    --max-time 20 "$ORIGIN/sw.js" 2>/dev/null)
swhead=$(curl -sI --max-time 15 "$ORIGIN/sw.js" 2>/dev/null)

if grep -qi '^cf-ray:' <<<"$head"; then EDGE=1; info "(behind Cloudflare)"; else EDGE=0; info "(direct origin)"; fi

# --- reachable -------------------------------------------------------------------------------
code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$ORIGIN/" 2>/dev/null)
[ "$code" = "200" ] && ok "GET / -> 200" || bad "GET / -> ${code:-no response}"

# --- it is the built app, not a dev server ---------------------------------------------------
if grep -q '@vite/client' <<<"$body"; then
  bad "serving the VITE DEV SERVER, not the production build"
elif grep -q 'registerSW.js' <<<"$body"; then
  ok "serving the production build"
else
  bad "response looks like neither the dev server nor the built app"
fi

# --- a single duplicate precache entry disables the whole service worker ----------------------
# workbox rejects two entries for one URL with different revisions, and precacheAndRoute runs
# inside sw.js's async AMD factory, so the throw is swallowed: no install handler, no routes,
# nothing cached — while the SW still installs, activates and reports healthy. The sibling
# smart-hand-math app shipped exactly this for two weeks (a favicon matched by both globPatterns
# and the webmanifest icon) and nobody noticed, because the only symptom is that offline quietly
# does not work.
if [ -z "$sw" ]; then
  bad "could not fetch /sw.js"
else
  entries=$(grep -o '{url:"[^"]*"' <<<"$sw" | wc -l | tr -d ' ')
  uniques=$(grep -o '{url:"[^"]*"' <<<"$sw" | sort -u | wc -l | tr -d ' ')
  if [ "$entries" -eq 0 ]; then
    bad "/sw.js has no precache manifest at all"
  elif [ "$entries" -eq "$uniques" ]; then
    ok "precache manifest: $entries entries, no duplicates"
  else
    bad "precache manifest: $entries entries but only $uniques unique — the SW will cache NOTHING"
    grep -o '{url:"[^"]*"' <<<"$sw" | sed 's/{url:"//;s/"$//' | sort | uniq -d \
      | while read -r d; do info "duplicate: $d"; done
    info "fix: add it to workbox.globIgnores in vite.config.ts"
  fi
fi

# --- sw.js must stay revalidatable or deploys never reach returning visitors -------------------
cc=$(grep -i '^cache-control:' <<<"$swhead" | tr -d '\r' | sed 's/^[Cc]ache-[Cc]ontrol: //')
if [ "$EDGE" = "1" ]; then
  cfs=$(curl -sI --max-time 15 "$ORIGIN/sw.js" 2>/dev/null | grep -i '^cf-cache-status:' | tr -d '\r' | awk '{print $2}')
  case "$cfs" in
    REVALIDATED|MISS|DYNAMIC|EXPIRED|BYPASS) ok "sw.js edge cache: $cfs (revalidates against origin)" ;;
    HIT) bad "sw.js served from edge cache as HIT — returning visitors can be pinned to a stale build" ;;
    *)   bad "sw.js unexpected cf-cache-status: ${cfs:-none}" ;;
  esac
  info "browser-facing Cache-Control: ${cc:-none} (Cloudflare's TTL; fine given updateViaCache:'imports')"
else
  grep -qi 'no-cache' <<<"$cc" \
    && ok "sw.js Cache-Control: $cc" \
    || bad "sw.js Cache-Control is '${cc:-none}', expected no-cache — a CDN would pin a stale service worker"
fi

# --- security headers -------------------------------------------------------------------------
grep -qi '^content-security-policy:' <<<"$head" \
  && ok "Content-Security-Policy present" \
  || bad "Content-Security-Policy MISSING"

# opendys needs BOTH: camera for document capture, microphone for the ASR reading assessment.
# It deliberately does NOT grant autoplay — nothing here plays media without a user gesture.
# (The sibling smart-hand-math app does grant it, because it auto-starts a camera on load.)
pp=$(grep -i '^permissions-policy:' <<<"$head" | tr -d '\r')
grep -q 'camera=(self)' <<<"$pp" \
  && ok "Permissions-Policy: camera=(self)" \
  || bad "Permissions-Policy camera=(self) missing — document capture will not start"
grep -q 'microphone=(self)' <<<"$pp" \
  && ok "Permissions-Policy: microphone=(self)" \
  || bad "Permissions-Policy microphone=(self) missing — the ASR reading assessment cannot record"

# --- the /api proxy must not be swallowed by the SPA fallback ---------------------------------
# /api/* is rendered from a template into /tmp/nginx-api at container start and `include`d into
# the server block. If that render or include ever fails, the glob is a silent no-op and these
# paths fall through to `location /` — returning index.html with HTTP 200. A status-code check
# would call that healthy, so assert the CONTENT TYPE instead.
capct=$(curl -sI --max-time 15 "$ORIGIN/api/ocr-capabilities" 2>/dev/null | grep -i '^content-type' | tr -d '\r')
capbody=$(curl -s --max-time 15 "$ORIGIN/api/ocr-capabilities" 2>/dev/null)
if grep -qi 'text/html' <<<"$capct"; then
  bad "/api/ocr-capabilities returned HTML — the templated proxy did not load; it fell through to the SPA fallback"
  info "check the container's /docker-entrypoint.d/19-mkdir-nginx-api.sh and NGINX_ENVSUBST_* env"
elif grep -qE '"typhoon":(true|false)' <<<"$capbody"; then
  ok "/api/ocr-capabilities serves JSON (proxy config rendered)"
  # Env vars are read at CREATE time only: a container recreated without --env-file silently
  # loses the key and every cloud OCR/ASR call degrades to 503. This endpoint is the only
  # external signal that TYPHOON_API survived the last recreate.
  if grep -q '"typhoon":true' <<<"$capbody"; then
    ok "cloud OCR/ASR enabled: $capbody"
  else
    info "cloud OCR/ASR DISABLED: $capbody"
    info "intentional for a zero-egress deploy; otherwise the last recreate lost --env-file /opt/opendys/.env"
  fi
else
  bad "/api/ocr-capabilities returned neither JSON nor HTML: ${capbody:0:60}"
fi

# --- SPA fallback (BrowserRouter) --------------------------------------------------------------
# Assert the app shell comes back, not merely a 200 — a fallback returns index.html for ANY path,
# so a bare status check passes even against a totally different app.
spa_bad=0
for p in /reader /read /dev/thai-colors /no-such-route-xyz; do
  h=$(curl -s --max-time 15 "$ORIGIN$p" 2>/dev/null)
  grep -q '<div id="root">' <<<"$h" || { bad "SPA fallback $p did not return the app shell"; spa_bad=1; }
done
[ "$spa_bad" = "0" ] && ok "SPA fallback: /reader /read /dev/* and unknown routes all serve the app shell"

# --- nothing is injected at the edge ----------------------------------------------------------
# Invisible to a plain curl: Cloudflare injects its analytics beacon for real browsers only, so
# comparing the two is the only way to see it. The CSP blocks it, which means a console error on
# every visit and no analytics collected — do not "fix" that by widening the CSP.
if [ "$EDGE" = "1" ]; then
  UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36'
  asbrowser=$(curl -s --max-time 15 -H "User-Agent: $UA" "$ORIGIN/" 2>/dev/null)
  if [ "$asbrowser" = "$body" ]; then
    ok "edge injects nothing (browser and curl get identical HTML)"
  else
    bad "the edge is INJECTING into the HTML — a third-party script the CSP will block"
    grep -o 'src="[^"]*"' <<<"$asbrowser" | grep -v "$ORIGIN" | head -3 | while read -r s; do info "$s"; done
    info "turn it off at the zone (e.g. Web Analytics); do NOT widen the CSP"
  fi
fi

echo
if [ "$FAIL" -eq 0 ]; then
  echo "PASS — $PASS checks"
  echo "Not covered: this reads headers and config only."
  echo "  - the PWA: only cutting the network proves it. devtools -> (await caches.keys()).length > 0,"
  echo "    then Network -> Offline -> reload -> the app must still render."
  echo "  - cloud OCR/ASR reachability: capabilities only reports that the key is SET. On an"
  echo "    IPv6-only-egress host it can read true while api.opentyphoon.ai is unreachable if"
  echo "    NGINX_RESOLVER_FLAGS is wrong (see DEPLOY-AWS.md). Exercising it costs a real API call."
  exit 0
fi
echo "FAIL — $FAIL failed, $PASS passed"
exit 1
