# Implementation report

Status: `IMPLEMENTED_AWAITING_REVIEW`

Implementation commit: `f281c05d3a72111f7ed16357ee9169ad39571ef8`

## Delivered

- Added signed-out category list/detail and record list/detail endpoints under `/api/v1/public/scientific`.
- Enforced active/published category branches, published records and translations, bounded query input, neutral not-found responses, and descendant category filtering.
- Returned minimal public projections: public IDs/slugs, labelled template fields, verified references, safe public-location views, and approved primary-image presentation metadata.
- Added same-origin inline derivative image endpoints. Originals, storage hosts, object keys, signed storage queries, ownership, review data, exact/private locations, revisions, and raw attribute objects are not returned.
- Added focused service and HTTP boundary tests. No schema, seed, frontend, or private-data changes were made.

## Implementation checks

- Focused tests: 2 files, 16 tests passed.
- Full backend tests: 48 files, 367 tests passed.
- Backend lint, typecheck, format check, build, and `git diff --check`: passed.
