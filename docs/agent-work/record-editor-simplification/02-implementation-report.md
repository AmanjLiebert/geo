# Teacher record editor simplification — implementation report

Status: `IMPLEMENTED_AWAITING_REVIEW`

Implementer: Codex, under the user's explicit override after OpenCode usage was unavailable.

Implementation commit: `730ac55`

## Delivered

- Replaced seven equal editor destinations with four stages: **Record**, **Evidence**, **Optional**, and **Review**.
- Combined English details and scientific facts into Record. Required scientific facts remain visible; empty optional facts and manual URL-slug editing are progressively disclosed, while existing optional values remain visible.
- Made one new source the primary evidence path, moved saved-source reuse to a secondary action, defaulted support to the whole record, and moved publication/year/pages/rights/field targeting/notes under citation details.
- Made the approved main image the required media task. The first upload accepts images only and is automatically marked primary; additional images/documents/video are labelled optional, collapsed, and described honestly as absent from the current public record page.
- Made location explicitly optional and closed by default. Exact/general/private choices are visible; embargo is advanced; approximate precision uses recognizable presets; sensitive reasons use concise choices with an `Other` path. Exact/public geometry payload behavior is unchanged.
- Removed relationships from primary navigation, delayed candidate loading until Optional is opened, preserved existing relationships, and stated that they are not currently public.
- Added a plain-language review explanation while retaining authoritative backend readiness and direct repair routing.
- Expanded public presentation of verified citations and public-safe locations. Geometry is rendered only for `public`/`approximate` values received from the established public projection; restricted-looking extra data is ignored by a focused test.
- Changed no backend source, schema, migration, permission, evidence policy, media policy, lifecycle, revision, audit, or stored data.

## Verification actually run

- Focused editor/public tests: 7 files / 22 tests passed.
- Final affected correction tests: 4 files / 12 tests passed.
- Full frontend suite: 29 files / 322 tests passed.
- Frontend `npx tsc --noEmit`: passed.
- Frontend `npm run lint`: passed.
- Frontend `npm run build`: passed; the existing Atkinson Hyperlegible Next fallback-font warning remains.
- `git diff --check`: passed.

## Limitations and review state

- Docker frontend rebuild was attempted but Docker Desktop was not running; no service or data was changed.
- No authenticated live browser session or responsive/RTL interactive smoke was available. Those remain independent-review requirements.
- Codebase-memory graph calls were attempted but its transport was closed; implementation used direct reads of every affected source and test instead.
- The same Codex agent prepared and implemented this critical task after the user's explicit override. It has not self-approved the result. `03-verification.md` was intentionally not created; independent review is still required before release.

## User-authorized evidence-policy correction — 2026-11-08

- Removed second-person source verification from readiness, publication enforcement, public projections, protected API contracts, dashboard status labels, and the curated publication utility.
- An attached source now immediately satisfies the applicable minimum-count and evidence-kind policy.
- Added teacher/admin source editing through `PATCH /api/v1/references/:id`; changes are validated and audited against every linked record.
- Added migration `1792478400000-trusted-author-evidence.ts`; it preserves all source rows and links, replaces only the publication function, and restores the former verified-reference filter on rollback.
- Preserved permissions, CSRF, restricted geography, media approval, lifecycle, and public HTTPS/source-field projection.

The task remains `CHANGES_REQUIRED` until an independent reviewer evaluates both the earlier findings and this policy correction.

Correction verification actually run:

- Focused backend policy/API/migration tests: 5 files / 143 tests passed; final service/migration rerun: 2 files / 18 tests passed.
- Focused frontend evidence/public-contract tests: 4 files / 12 tests passed.
- Full backend suite: 51 files / 408 tests passed.
- Full frontend suite: 29 files / 323 tests passed.
- Backend and frontend type checks: passed after the final test correction.
- Backend and frontend lint: passed.
- Backend and frontend production builds: passed; the existing Atkinson Hyperlegible Next fallback-font warning remains.
- `git diff --check`: passed (Git emitted only the repository's existing LF/CRLF conversion warnings).
- Docker images for the local `migrate`, `api`, and `frontend` services rebuilt successfully. The forward migration applied once to the local Compose database; rebuilt API and frontend containers became healthy, and HTTP smoke returned 200 for `/dashboard/records` and `/health/ready`.
- No live authenticated browser, push, merge, deployment, or shared-database operation occurred.

## Signed-in publication correction — 2026-11-08

- Removed the recent-login/step-up identity gate from scientific-record publish and unpublish actions. A currently signed-in teacher/admin must still have `PUBLISH_SCIENTIFIC_CONTENT`, pass CSRF protection, and all readiness/database publication rules; the action remains audited.
- Removed the unreachable identity-confirmation prompt from the record Review panel and replaced the stale “verified evidence” explanation with “source.”
- Category publication and translation-review security were not changed.

## Visitor record reading-path correction — 2026-11-08

- Reorganized the public record into one connected reading path: classification, title and summary, primary image, plain-language description, key facts, optional place/context, sources, and compact publication metadata.
- Added the human-readable category trail so visitors can recognize where the record belongs without decoding internal slugs.
- Replaced developer-facing labels such as “Structured evidence” and raw evidence-kind text with visitor language. Sources remain available in a clearly labelled progressive disclosure instead of competing with the main explanation.
- Kept the existing public projection and safety boundaries unchanged. The page uses only already-public fields, public-safe locations, projected sources, and the approved primary image; no private coordinates, storage data, or unpublished relationships were added.
- Added responsive layout rules for desktop, tablet, and narrow screens, including a 44px source-disclosure target on mobile.

Correction verification actually run:

- Full frontend suite: 30 files / 325 tests passed before the final semantic breadcrumb correction.
- Focused public record tests after the final correction: 2 files / 4 tests passed.
- Frontend type check, lint, and production build: passed; the existing Atkinson Hyperlegible Next fallback-font warning remains.
- Local Docker frontend image rebuilt and the container became healthy. The public record was inspected live at desktop and narrow widths; reading order and semantic labels were also checked through the accessibility tree.
- `git diff --check`: passed (Git emitted only the repository's LF/CRLF conversion warnings).

### Neo layout and navigation follow-up — 2026-11-10

- Removed the desktop sticky left-image rail. The approved primary image is now a wide, non-sticky record hero within the same centered reading column as the information it explains.
- Restored the product's neo-brutalist visual language with strong two-pixel borders, offset shadows, ochre/iron accents, and explicit interactive states instead of subtle editorial cards.
- Added a large end-of-record navigator that names the previous and next records. The compact top controls remain available and now expose record names through accessible labels.
- Reworked the summary and key facts into a balanced two-column card on wide screens and a single recognition-first flow on narrow screens.
- Corrected the live summary contrast after browser inspection found an inherited dark-header text color.

Follow-up verification actually run:

- Full frontend suite: 30 files / 325 tests passed.
- Frontend type check, lint, and production build: passed; the existing Atkinson Hyperlegible Next fallback-font warning remains.
- Local Docker frontend image rebuilt after the final contrast correction and the service responded successfully.
- Live browser inspection passed at the default desktop viewport and at 390 × 844. The page had no horizontal overflow; the image was non-sticky and full-width; the summary was readable; and the named previous/next navigator remained visible and keyboard-focusable on mobile.
