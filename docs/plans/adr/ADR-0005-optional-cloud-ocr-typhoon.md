# ADR-0005 — Optional Opt-In Cloud OCR (Typhoon) with a Server-Side Key

- **Status:** Accepted — amends [ADR-0001](./ADR-0001-client-side-ocr-architecture.md) (the zero-egress
  guarantee now holds **by default**; an opt-in path may egress one image when the user enables it)
- **Date:** 2026-07-04

## Context

On-device Tesseract (ADR-0001, ADR-0004) is genuinely limited on hard real-world Thai — book pages with
decorative layouts, uneven lighting, and stylized fonts — where a per-line LSTM underperforms a modern
vision-language model. On such inputs recognition is often unusable, and no amount of client-side
preprocessing closes the gap. (The float `tessdata_best` models also **crash the tesseract.js WASM core**
— `Aborted: missing function DotProductSSE` — so even a bigger on-device model is off the table.) Users
asked for a higher-accuracy option for exactly these documents.

**Typhoon OCR** (opentyphoon.ai) is a Thai-tuned VLM that materially outperforms Tesseract on these
cases. Its open weights are ~2–7B params requiring a GPU, so it cannot run in the browser; it is used via
a cloud API. That conflicts with ADR-0001's zero-egress guarantee, and its API key must not be exposed:
opendys is a **public** deployment, and Vite bakes any browser-visible env var into the shipped bundle,
so a client-side key is trivially stolen.

## Decision

**We will offer Typhoon as an explicitly opt-in "Enhanced Thai OCR (Cloud)" engine, OFF by default, with
the API key injected server-side.** On-device Tesseract stays the default and the sole path when no key
is configured.

- **Server-side key via nginx.** A same-origin `POST /api/typhoon-ocr` location proxies to Typhoon and
  injects `Authorization: Bearer $TYPHOON_API`, where `TYPHOON_API` comes from the container environment
  (rendered by envsubst at container start — never in git, the image, or the client bundle). The browser
  only ever calls same-origin `/api/…`, so the strict `connect-src 'self'` CSP is unchanged and the
  browser-level zero-egress guarantee is intact — only nginx egresses, and only when the user opts in.
- **Off by default, discoverable only when configured.** The client probes `GET /api/ocr-capabilities`;
  the toggle appears only when a key is set. With no key the proxy returns `503` and the app stays 100%
  on-device — a deployment without `TYPHOON_API` is byte-for-byte the ADR-0001 experience.
- **Explicit consent.** Selecting the cloud engine shows a persistent notice that the image is sent to
  opentyphoon.ai; nothing is uploaded unless the user both enables the engine and runs a recognition.

## Consequences

**Positive**

- VLM-tier Thai accuracy for the hard documents Tesseract mangles, without giving up the private default.
- The key is never exposed to the browser; the CSP and the default zero-egress story are preserved.
- Self-hosters opt in with a single env var; omitting it changes nothing.

**Negative / trade-offs accepted**

- When enabled and used, one image per recognition egresses to a third party — a real, user-visible
  departure from "nothing ever leaves the device." Mitigated by opt-in + off-by-default + a clear notice.
- Adds a server-side proxy to a previously backend-free deployment (nginx templating + a runtime secret).
- Introduces a cloud dependency, rate limits, and (beyond the free tier) per-page cost for that path.

## Alternatives Considered

- **Client-side key / direct browser→Typhoon call** — rejected: leaks the key on a public site and would
  need a CORS-permissive third party; also violates `connect-src 'self'`.
- **Self-host the Typhoon model** — rejected: needs a GPU backend, incompatible with a static nginx site.
- **Keep on-device only** — rejected for these users: Tesseract cannot reach the needed accuracy on hard
  Thai, and the float `best` models don't run in tesseract.js.
- **Bake the key at build time** — rejected: it would live in the image/bundle; `.dockerignore` excludes
  `.env` specifically to prevent this.
