# opendys — Planning & Engineering Docs

This folder is the **canonical blueprint** for opendys: the source of truth for _intent_, decisions,
and roadmap. Code implements what is decided here.

## Document types

| Type | File(s) | Purpose |
| --- | --- | --- |
| **ROADMAP** | [`ROADMAP.md`](./ROADMAP.md) | Master phased plan and current status (the index). |
| **HLD** | [`hld.md`](./hld.md) | High-Level Design: architecture, data flow, constraints. |
| **FRD** | [`frd.md`](./frd.md) | Functional Requirements: personas, user stories, `FR-NN` table. |
| **WBS** | [`wbs.md`](./wbs.md) | Work Breakdown Structure: phases decomposed into tasks. |
| **ADR** | [`adr/ADR-00NN-*.md`](./adr/) | Architecture Decision Record — one accepted decision, immutable. |
| **RFC** | [`rfc/RFC-00NN-*.md`](./rfc/) | Request For Comments — a proposal under discussion. |
| **PoC** | `<feature>/PoC/README.md` | Throwaway experiment proving a risky approach before it enters `src/`. |

## Naming conventions

- Files are `kebab-case`.
- ADRs: `ADR-00NN-short-slug.md`, zero-padded, monotonically increasing, never renumbered.
- RFCs: `RFC-00NN-short-slug.md`, same scheme.
- Feature working folders are `kebab-case` matching the feature (`thai-parsing/`, `ocr/`, `offline/`).
- Top-level design docs stay lowercase: `hld.md`, `frd.md`, `wbs.md`; `ROADMAP.md` and `README.md`
  keep their conventional casing.

## Status legend

Used in the ROADMAP, WBS, and any checklist:

| Mark | Meaning |
| --- | --- |
| `[ ]` | Not started |
| `[~]` | In progress |
| `[x]` | Complete |
| `[-]` | Skipped / deferred |

## Workflow

```
RFC (if the direction is open)  →  PoC (if the approach is risky)  →  ADR (record the decision)
   →  Implement in src/  →  Update ROADMAP / WBS status
```

- Experiments belong in `docs/plans/<feature>/PoC/`, never spiked directly into `src/`.
- ADRs are **immutable**. To change a decision, write a new ADR and set the old one's status to
  `Superseded by ADR-00XX`.

## Templates

- ADR: [`adr/ADR-0000-template.md`](./adr/ADR-0000-template.md)
- RFC: [`rfc/RFC-0000-template.md`](./rfc/RFC-0000-template.md)

### PoC README template

```markdown
# PoC — <what is being proven>

## Hypothesis
## What was tried
## Result
## Verdict   (Proceed / iterate / abandon — link to the resulting ADR/RFC)
```
