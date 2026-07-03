# Functional Requirements Document (FRD)

## 1. Product Summary

opendys helps people with dyslexia read English and Thai. A user captures or uploads an image of
text; the app recognizes it offline, then presents it in a customizable, dyslexia-friendly reader
with color-coded Thai orthography, a reading ruler, and offline text-to-speech. It is free,
open-source, and runs entirely client-side.

Cross-references: [HLD](./hld.md) · [WBS](./wbs.md) · [ROADMAP](./ROADMAP.md).

## 2. Personas

- **Nong (child reader) — PRIMARY.** A Thai primary-school student with dyslexia. Needs large,
  well-spaced, looped Thai type, color cues that separate vowels/tones from consonants, and the
  ability to hear a word read aloud.
- **Khru (teacher).** Prepares accessible versions of worksheets and signage for a mixed EN/TH
  classroom. Needs fast OCR and print-friendly, high-contrast rendering.
- **Parent.** Sits with a child at home, often offline. Needs a zero-setup, private tool that never
  uploads their child's schoolwork anywhere.

## 3. User Stories

- As **Nong**, I can tap a word and hear it, so I can check a word I cannot decode.
- As **Nong**, I see vowels, tone marks, and silent letters in different colors, so Thai stacking is
  less visually confusing.
- As **Khru**, I can photograph a worksheet and get editable, restyleable text in seconds, offline.
- As a **Parent**, I am certain no image or text leaves our device.
- As any user, I can enlarge text and spacing until letters stop visually overlapping.

## 4. Functional Requirements

| ID | Requirement | Maps to |
| --- | --- | --- |
| **FR-01** | Capture (camera) or upload an image of text, in-browser only. | Phase 3 |
| **FR-02** | Offline OCR for English (`eng`) and Thai (`tha`) via Tesseract.js in a Web Worker. | Phase 3 |
| **FR-03** | Self-host all OCR models/wasm; cache them for fully offline reuse. | Phase 3 / 5 |
| **FR-04** | Adjustable font family, size, line/word/letter spacing for both scripts. | Phase 4 |
| **FR-05** | Dyslexia fonts: OpenDyslexic (Latin) and a looped Thai face (Sarabun); Mitr as alternate. | Phase 4 |
| **FR-06** | Thai 4-level color coding: consonant, vowel, tone mark, silent/final. | Phase 2 / 4 |
| **FR-07** | Toggleable 4-line horizontal guide lines behind Thai text. | Phase 4 |
| **FR-08** | Universal reading ruler that dims unread lines (mouse / touch / keyboard). | Phase 4 |
| **FR-09** | Offline TTS via Web Speech API, switching EN/TH voices; tap word or sentence. | Phase 4 |
| **FR-10** | Installable PWA that runs fully offline after first visit. | Phase 5 |
| **FR-11** | WCAG AA contrast for text and the 4-level color palette on both themes. | Phase 5 |
| **FR-12** | No network egress of images or text; no telemetry. | All phases |

## 5. Non-Functional Requirements

- **Privacy:** zero data egress (see HLD §6). **Offline:** works with no connection post-install.
- **Accessibility:** keyboard operable; screen-reader labelled; respects `prefers-reduced-motion`.
- **Performance:** OCR runs off the main thread; UI stays responsive during recognition.
- **Portability:** anyone can self-host their own instance via Docker.
