# Implementation report

Status: `IMPLEMENTED_AWAITING_REVIEW`

## Delivered

- Replaced the technical evidence forms with clear new-source and saved-source paths.
- Added source-specific labels for journal articles, books, research/reports, websites or online images, maps, datasets, institutions, and catalogues.
- Combined new-source creation and record connection into one action, with recoverable handling when creation succeeds but connection fails.
- Replaced the evidence-kind control with automatic mapping from source type.
- Added plain whole-record or scientific-field targeting and optional supporting notes.
- Added compact citation cards showing source type, verification state, target, and notes.
- Added optional year, pages/figure, and rights metadata supported by the existing API.
- Normalized scheme-less web addresses to HTTPS while rejecting insecure or invalid protocols.

## Checks run

- Focused source, API, and navigation tests passed.
- Full frontend suite: 18 files, 177 tests passed.
- Frontend lint and TypeScript checks passed.
- Next.js production build passed and generated 131 pages.
- Rebuilt frontend container became healthy; records and direct editor routes returned HTTP 200.
- `git diff --check` passed.

No backend, database, authorization, verification, publication, or storage behavior was changed.
