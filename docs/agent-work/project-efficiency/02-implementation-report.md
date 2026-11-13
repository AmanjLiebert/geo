# Implementation report

Status: IMPLEMENTED_AWAITING_REVIEW. Implementer: Codex under the session override. Branch: codex/project-efficiency. Base HEAD: 115af81. Changes remain uncommitted to preserve the existing mixed working tree; no push/merge/remote release.

## Changes

- ExploreBrowser uses native history for search, filter, pagination and gallery query changes on the current path. Local query/draft state restores on popstate. Category/record path navigation still uses Next router and fresh public reads. No permanent public-data cache.
- Static artwork is deterministically encoded as content-hashed WebP assets, with smaller PNG browser/apple icons. Updated only the corresponding asset references in hero, shared/mobile brand, account and layout. Original images retained. Only /assets/optimized gets immutable public caching; scientific images, dashboard and sessions do not.
- RecordThumbnail waits until within 160px of the viewport, requests once per mount/asset and prefers the processed thumbnail. Cleanup ignores stale asynchronous results. Missing IntersectionObserver falls back to loading normally. getOnlineMediaPages includes thumbnails only through an explicit option; normal document/image viewers retain their original full-size/page selection and private no-store authenticated calls.
- Editor starts categories and existing record reads together; after both resolve, pinned/active template and permitted record types load together. Existing writes, dirty state, validation, revisions and permission handling retained.
- Public category pagination carries the total from a window count instead of a second count query on nonempty pages. Pagination is inside selected_categories before recursive descendant/record counting, avoiding work on off-page category subtrees. Exact count fallback retained for empty/out-of-range pages. Eligibility filters/public DTO unchanged.
- Tests added for deferred previews, derivative fallback, stale completion, API viewer behavior, editor concurrency/create mode/pinned templates/unmount, and category count/fallback.

## Evidence

- Hero: 2,545,242 -> 298,414 bytes. Shared brand: 1,476,870 -> 44,714 bytes. Account artwork: 2,808,557 -> 314,064 bytes. Browser icon: 5,373 bytes; apple icon: 29,040 bytes. Deterministic compression, no generated replacement subjects. Live asset responses all 200 and public max-age=31536000 immutable.
- Before: collection search triggered category and record list reads. Live after: clear, Back, Forward and empty-result search between 11:42:37 UTC and the recorded end made zero scientific API requests. Record path navigation still fetched details; viewer open/close worked.
- Live public category JSON exactly equals ignored before snapshot, including names, summaries, descriptions, image endpoints, ordering and counts. limit=1 offsets 0/1/999 return 1/1/0 items and unchanged total. Category detail 200, unsupported locale 400, signed-out protected records 401.
- Small local sequential sample (10 each, not a load test): category list p50 16ms, max/p95 index 18ms; collection records p50 16ms, max/p95 index 29ms. No comparable load baseline; do not infer capacity or sustained CPU improvements.
- Local api/frontend rebuilt and restarted with --no-deps; all existing services healthy. No database mutation, schema migration or worker rebuild.

## Checks run

- Focused backend public service/HTTP tests: 23 passed, including final pagination-before-recursion refinement.
- Full backend npm test: 52 files / 419 tests passed before the final SQL refinement; focused tests/typecheck/lint/build/live response comparison rerun after that refinement.
- Full frontend npm test: 31 files / 332 tests passed. Subsequently added editor scheduling tests: 1 file / 4 passed. Preview lifecycle: 5 tests; API option regression included in full suite.
- Both TypeScript checks and scoped ESLint passed; production Docker builds passed. Scoped git diff --check passed for changed tracked implementation files.
- Browser: search/empty/clear, Back/Forward URL restoration, fresh record navigation, full-size viewer open/close, homepage artwork and account artwork inspected. Screenshots under ignored backups/project-efficiency-2026-11-13/.

## Limits and recovery

Independent review NOT performed; no production readiness or full-project capacity claim. Signed-in teacher end-to-end save/publication and mobile regression not run; hook tests cover changed dashboard request lifecycles. Existing record-editor CHANGES_REQUIRED findings remain unresolved. Existing homepage showcase content and unrelated account/layout edits preserved.

Build retains existing Atkinson Hyperlegible fallback-font warning; backend npm prune reports 13 existing dependency vulnerabilities. No dependency upgrades attempted in this performance scope. No secrets inspected or printed.

Recover this pass using per-file source-before snapshots; preserve the earlier user changes in those snapshots. Original static assets remain available. Rebuild the two local application services after a selective rollback. Prior formal task history remains unchanged. Graph service transport was unavailable; source inspected directly.
