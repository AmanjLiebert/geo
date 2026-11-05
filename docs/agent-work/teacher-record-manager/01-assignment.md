# Teacher Record Manager — category-first record discovery

Status: `READY_FOR_IMPLEMENTATION`

Risk: CRITICAL (protected shared record-list contract and protected dashboard routing state)

## Problem

Teachers and administrators cannot locate existing scientific records efficiently. The protected Records page supports text search and a status select, but there is no category hierarchy for browsing, filters cannot be combined clearly, and opening a record loses the search/filter/pagination context.

## Authorized scope

- Add a category navigator to `/dashboard/records` built from the existing active scientific category hierarchy.
- Extend the protected `GET /api/v1/records` list request with an optional, validated category slug filter.
- Apply exact-category plus active-descendant filtering server-side before pagination and counting, in both the list and count queries, without N+1 queries.
- Keep category, status, and title/category search composable; reset pagination when a filter changes.
- Represent category, status, search, and 1-based page in the Records page URL (page size 30) and restore state on Back/Forward.
- Carry a safe internal return destination from the list into the record workspace so back, cancel, error, and successful create navigation return to the same list context.
- Keep the compact list projection: title with untitled fallback, category or “Not classified”, human-readable status, protected thumbnail/placeholder, updated date, and exactly one primary action (`Classify`, `Edit`, `Review`, `Manage`, or read-only `View` for archived).
- Add focused backend and frontend tests, then run the relevant broader type checks and production builds.

## Non-goals

- No record schema, migration, domain-model, or template change.
- No record editor section redesign, autosave, bulk operations, ownership/“My records” filtering, or advanced search syntax.
- No publication, archive/restore, media, evidence, location, or translation behavior changes.
- No permission, ownership, classification, review, or media authorization changes.
- No new dependencies, deployment, push, merge, shared-database operation, or unrelated visual redesign.

## Permissions and security

- `GET /api/v1/records` retains `MANAGE_SCIENTIFIC_CONTENT` and deny-by-default behavior.
- Responses retain `Cache-Control: private, no-store`.
- The category identifier is a slug validated against `^[a-z0-9]+(?:-[a-z0-9]+)*$` (max 120) and bound as a query parameter.
- Return destinations accept only internal `/dashboard/records` URLs with the known `category`, `status`, `query`, and `page` parameters. External, protocol-relative, other-path, and unknown-parameter destinations are rejected or dropped.
- No UUIDs, template IDs, storage keys, permanent media URLs, owner identifiers, attributes, or internal security details are displayed.

## Recovery

Backward-compatible and schema-free. Reverting the task commit restores the previous list contract and page behavior; no stored record or category data requires transformation.

## Verification plan

Backend focused tests:

- category slug validation (valid, malformed, overlong, wrong type);
- exact and descendant category filtering SQL shape in list and count queries;
- combined category + status + search parameters;
- filtered totals and pagination parameters;
- permission denial, missing session, and `private, no-store` response;
- backward compatibility without a category.

Frontend focused tests:

- URL state parse/serialize round-trip and invalid value rejection;
- filter change resets page and clear resets all filters;
- safe `returnTo` accepts only known internal list URLs and rejects external/malformed destinations;
- category tree building/order, All categories, selection, and descendant hint rendering;
- summary and primary-action mapping for every status;
- API request includes `category`;
- loading, empty, filtered-empty, error, and category-load-failure rendering where the current server-rendering test stack supports it.

Broader gate:

- backend typecheck and production build;
- frontend TypeScript, lint, and production build;
- full backend and frontend Vitest suites.

Known limitation: this repository has no live PostgreSQL integration test harness and no browser/E2E stack. Descendant filtering is verified by parameterized SQL-shape tests and reviewer/live verification; interactive keyboard, touch, and responsive behavior is verified by static/accessibility assertions and source review, not by an automated browser.

## Acceptance gate

Passes only when a teacher or administrator can find a record through a category branch without scanning the entire collection, combine category/status/search, open the correct management action, and return to exactly the same list context. Signed-out users and visitors remain denied, record lifecycle behavior is unchanged, and Codex independently verifies the implementation.

Implementation stops at `IMPLEMENTED_AWAITING_REVIEW`. Only the reviewer writes `03-verification.md` and changes the task to a final status.
