# Contributing to opendys

Thanks for helping make reading easier! opendys is **100% client-side, offline, and privacy-first** —
please keep every contribution within those constraints: no backend, no telemetry, and no network
egress of user data (captured images or recognized text must never leave the browser).

## Dev setup

Requires Node 20+ and npm (or just Docker).

```sh
git clone https://github.com/lumduan/opendys && cd opendys
npm install
npm run dev            # http://localhost:5173
```

With Docker: `docker compose up` (dev server + HMR on :5173).

## Quality gates (all must pass — CI enforces them)

```sh
npm run lint
npm run typecheck
npm run test:coverage   # utils must hold ≥90% lines / 80% branches
npm run build
```

## Conventions

- TypeScript strict everywhere; **named exports** for components (default export only for `App`);
  use the `@/` alias for intra-`src` imports.
- Keep components thin — pure algorithms live in `src/utils/**` (side-effect-free and unit-tested);
  side effects live in `src/hooks/**`.
- **No user-facing strings inlined in components** — route them through `src/i18n/`.
- Design decisions are recorded in [`docs/plans/`](docs/plans/README.md) following
  `RFC → PoC → ADR → Implement → Update ROADMAP`. Non-trivial changes should reference or add an ADR.

## Commits & PRs

- Conventional-commit prefixes (`feat:`, `fix:`, `chore:`, `docs:`…).
- Open PRs against `main`; keep `main` green.

## Adding a language

opendys is script-agnostic where possible. To add support for a new language:

1. **OCR model** — add `<lang>.traineddata.gz` under `public/tesseract/lang/` (see
   `scripts/fetch-ocr-models.mjs`) and extend the options in `src/utils/ocr/language.ts`.
2. **UI strings** — add them to `src/i18n/strings.ts`.
3. **Font** — if the script needs a specific face, self-host it via `@fontsource` in `src/fonts.ts`.
4. **Parsing** — complex scripts may need their own utilities under `src/utils/` (see
   `src/utils/thai/` for the Thai 4-level engine as a reference).
