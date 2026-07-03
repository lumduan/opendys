// Self-hosted, Vite-bundled dyslexia fonts (see ADR-0002). Side-effect-only: importing this module
// injects the @font-face CSS and Vite fingerprints the woff2 into the build — zero CDN egress.
// Import order matters: this must be the FIRST import in main.tsx so faces are declared before app CSS.
//
// Per-subset/per-weight imports keep the bundle minimal. OpenDyslexic ships Latin only; Thai glyphs
// fall through to Sarabun (looped / มีหัว) via unicode-range. font-display: swap is the Fontsource default.

// OpenDyslexic — Latin-only, primary dyslexia face.
import '@fontsource/opendyslexic/400.css';
import '@fontsource/opendyslexic/700.css';

// Sarabun — Latin + Thai (looped). The Thai fallback for the OpenDyslexic stack, and a face option.
import '@fontsource/sarabun/latin-400.css';
import '@fontsource/sarabun/latin-700.css';
import '@fontsource/sarabun/thai-400.css';
import '@fontsource/sarabun/thai-700.css';

// Mitr — rounded, geometric alternate face (Latin + Thai), 400 + 500 only.
import '@fontsource/mitr/latin-400.css';
import '@fontsource/mitr/latin-500.css';
import '@fontsource/mitr/thai-400.css';
import '@fontsource/mitr/thai-500.css';
