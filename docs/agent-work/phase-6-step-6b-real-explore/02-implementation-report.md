# Implementation report

Status: `IMPLEMENTED_AWAITING_REVIEW`

Implementation commit: `564579ed8f21378978c0f45fa47ea6138ea3d696`

## Delivered

- Replaced Explore's mock repository with a fail-closed server API client and explicit public-data mapping.
- Converted Explore, category, and record routes to runtime rendering with live metadata, loading, not-found, unavailable, empty, and missing-image states.
- Kept descendant records discoverable from their root collection while retaining direct subcategory routes.
- Rendered only published fields, safe location presentation, verified references, and same-origin public image endpoints.
- Replaced the static nginx export with the standalone Next.js server and added the private Compose API address.
- Removed obsolete showcase language and dead mock-category links from the footer visible on Explore.

## Checks run

- Frontend tests: 21 files, 190 tests passed.
- ESLint and TypeScript passed.
- Next.js production build passed; all three Explore routes were reported as dynamic.
- Compose rebuilt cleanly and the frontend, API, database, proxy, worker, and scanner were healthy.
- Signed-out live smoke tests returned 200 for Explore, a root collection, a descendant record, its detail API, and its inline WebP image.
- Browser navigation from collection list to category and record was completed successfully.
