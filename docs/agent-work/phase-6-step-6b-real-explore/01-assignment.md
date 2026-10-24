# Phase 6 Step 6B — Real public Explore

## Objective

Connect the established public Explore experience to the verified public scientific APIs and remove showcase geological data from Explore, category, and record routes.

## Authorized scope

- Add a strictly validated, server-side public scientific API client.
- Render published category and record lists plus record details from the Phase 6 Step 6A endpoints.
- Support root-category browsing with published descendant records and direct subcategory/record URLs.
- Preserve the existing visual language and useful client interactions while removing mock-only scientific claims, statuses, filters, and details.
- Replace static-export routing with a production Next.js server so newly published URLs work without a rebuild.
- Update the frontend container and Compose wiring for the dynamic Next runtime and private server-to-API address.
- Provide intentional zero-category, zero-record, missing-image, not-found, loading, and service-unavailable states.
- Keep public images on same-origin API paths with no original-file or storage URL disclosure.

## Out of scope

- Search, maps, research, news, managed pages, accounts, saved records, multilingual routing, or dashboard changes.
- Public video, document download, additional media-gallery APIs, or fabricated fallback scientific content.
- Redesigning the established Explore interface.

## Completion gate

- `/explore`, `/explore/:category`, and `/explore/:category/:record` are runtime routes backed only by published API data.
- Publishing, unpublishing, and archiving are reflected without rebuilding the frontend.
- Root collections include records from published subcategories; hidden branches and records remain absent.
- Empty and unavailable states contain no mock records or misleading claims.
- API response validators fail closed, route metadata uses live content, and direct URLs work after a clean Compose rebuild.
- Focused frontend tests, lint, typecheck, production build, live signed-out smoke tests, and diff checks pass.
