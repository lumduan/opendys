#!/usr/bin/env bash
# Tests that verify-deploy.sh actually FAILS on broken deployments.
#
# Proving the happy path is not evidence. A verify step in the sibling smart-hand-math repo ended
# in `... | grep -o X | sed ... || echo FAIL` and could only ever print "pass", because a
# pipeline's exit status is its last command's and sed succeeds on empty input; another used
# `uniq -d && echo DUPLICATE` and reported a duplicate on a perfectly good deploy, since uniq
# exits 0 whether or not it prints. Both looked like verification and were noise. So each check
# here is watched failing against a deliberately-broken variant of the real image.
#
# Requires docker. Takes ~40s.
#
#   ./scripts/test-verify-deploy.sh

set -uo pipefail
cd "$(dirname "$0")/.."
VERIFY=./scripts/verify-deploy.sh
IMG=ghcr.io/lumduan/opendys:latest
TMP=$(mktemp -d)
PORT=8079
PASS=0; FAIL=0

cleanup() { docker rm -f opendys-verifytest >/dev/null 2>&1; rm -rf "$TMP"; }
trap cleanup EXIT

serve() { # $1 = extra docker run args
  docker rm -f opendys-verifytest >/dev/null 2>&1
  # shellcheck disable=SC2086
  docker run -d --name opendys-verifytest -e TYPHOON_API=dummy-key-for-test \
    -p 127.0.0.1:$PORT:8080 $1 "$IMG" >/dev/null
  for _ in $(seq 1 40); do curl -sf -o /dev/null "http://127.0.0.1:$PORT/" 2>/dev/null && return 0; sleep 0.3; done
  echo "  (container never came up)"; return 1
}

# $1 = case name, $2 = expect "pass"|"fail", $3 = grep for this text when expecting fail
expect() {
  out=$($VERIFY "http://127.0.0.1:$PORT" 2>&1); rc=$?
  if [ "$2" = "pass" ]; then
    if [ $rc -eq 0 ]; then echo "  ✓ $1: passed as expected"; PASS=$((PASS+1));
    else echo "  ✗ $1: expected pass, got FAIL"; echo "$out" | sed 's/^/      /'; FAIL=$((FAIL+1)); fi
  else
    if [ $rc -ne 0 ] && grep -qi "$3" <<<"$out"; then
      echo "  ✓ $1: failed as expected"; PASS=$((PASS+1))
    else
      echo "  ✗ $1: expected FAIL matching '$3', got rc=$rc"; echo "$out" | sed 's/^/      /'; FAIL=$((FAIL+1))
    fi
  fi
}

echo "== control: the real image should pass =="
serve "" && expect "healthy image" pass

echo
echo "== duplicate precache entry (what silently killed smart-hand-math's SW for two weeks) =="
docker run --rm --entrypoint sh "$IMG" -c 'cat /usr/share/nginx/html/sw.js' > "$TMP/sw.js"
first=$(grep -o '{url:"[^"]*",revision:"[^"]*"}' "$TMP/sw.js" | head -1)
if [ -n "$first" ]; then
  url=$(sed 's/{url:"//;s/".*//' <<<"$first")
  sed -i "s|$first|$first,{url:\"$url\",revision:null}|" "$TMP/sw.js"
  serve "-v $TMP/sw.js:/usr/share/nginx/html/sw.js:ro" && expect "duplicate precache entry" fail "only .* unique"
else
  echo "  - skipped: no revisioned precache entry to duplicate"
fi

echo
echo "== sw.js long-cached (pins returning visitors to a stale build) =="
docker run --rm --entrypoint sh "$IMG" -c 'cat /etc/nginx/conf.d/default.conf' > "$TMP/stale.conf"
# drop the sw.js no-cache carve-out so it falls into the 1y bucket
python3 - "$TMP/stale.conf" <<'PY'
import re, sys
p = sys.argv[1]
s = open(p).read()
s = re.sub(r'location = /sw\.js \{[^}]*\}', '', s, flags=re.S)
open(p, 'w').write(s)
PY
serve "-v $TMP/stale.conf:/etc/nginx/conf.d/default.conf:ro" && expect "sw.js long-cached" fail "expected no-cache"

echo
echo "== microphone=() (the ASR reading assessment silently cannot record) =="
docker run --rm --entrypoint sh "$IMG" -c 'cat /etc/nginx/snippets/security-headers.conf' > "$TMP/hdr.conf"
sed -i 's/microphone=(self)/microphone=()/' "$TMP/hdr.conf"
serve "-v $TMP/hdr.conf:/etc/nginx/snippets/security-headers.conf:ro" && expect "microphone=()" fail "microphone=(self) missing"

echo
echo "== no CSP at all =="
printf 'add_header X-Content-Type-Options "nosniff" always;\n' > "$TMP/nocsp.conf"
serve "-v $TMP/nocsp.conf:/etc/nginx/snippets/security-headers.conf:ro" && expect "CSP stripped" fail "Content-Security-Policy MISSING"

echo
echo "== /api swallowed by the SPA fallback (returns index.html with HTTP 200) =="
# Simulate the templated proxy failing to render: the include glob becomes a no-op, so /api/*
# falls through to `location /`. A status-code check would call this healthy.
docker run --rm --entrypoint sh "$IMG" -c 'cat /etc/nginx/conf.d/default.conf' > "$TMP/noapi.conf"
sed -i 's|include /tmp/nginx-api/\*.conf;||' "$TMP/noapi.conf"
serve "-v $TMP/noapi.conf:/etc/nginx/conf.d/default.conf:ro" && expect "/api falls through to SPA" fail "returned HTML"

echo
[ "$FAIL" -eq 0 ] && { echo "PASS — $PASS/$((PASS+FAIL)) cases; every check was observed failing"; exit 0; }
echo "FAIL — $FAIL/$((PASS+FAIL)) cases did not behave as expected"; exit 1
