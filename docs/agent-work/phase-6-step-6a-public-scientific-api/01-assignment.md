# Phase 6 Step 6A — Minimal public scientific read APIs

## Objective

Create the public NestJS data boundary needed to replace Explore mock data later, without changing the public frontend in this task.

## Authorized scope

- Add signed-out public endpoints for published category lists/details and published record lists/details.
- Use English published content only for this first API contract while keeping the response shape locale-ready.
- Include only active, published category branches and published records whose category branch remains active and published.
- Support bounded pagination and optional category filtering that includes published descendants.
- Return public-safe category, record-type, structured field, verified reference, approved primary-image presentation, and location projections.
- Use only `public_record_locations`; never query or return exact geometry, sensitivity reasons, embargo details, ownership, reviewer IDs, revisions, audit data, template IDs, raw storage keys, or raw attribute objects.
- Add controlled public primary-image viewing that verifies current publication and approval state before streaming an inline derivative through the same-origin API.
- Use conservative revalidation/no-store headers so unpublish or archive actions do not leave stale public content available.

## Out of scope

- Replacing frontend mock repositories or changing Explore pages.
- Public search, maps, multilingual routing, saved-record changes, news, research, or managed-page integration.
- Direct original-file delivery, download actions, public video, or unrestricted media-library endpoints.
- Schema changes unless a measured query requires an index and a reviewed migration.

## Completion gate

- Signed-out requests can list and open published categories and records.
- Draft, in-review, archived, unpublished, or invalid-parent content returns no public data.
- Record detail exposes only labelled template fields, verified references, public-safe locations, and approved presentation media metadata.
- Category filtering includes published descendants without leaking hidden branches.
- Public image streams work only for an approved primary image attached to currently published content and never expose originals, storage hosts, signed queries, or storage keys.
- Malformed pagination, slug, public ID, and category filters return safe `400` responses; unknown or hidden resources return neutral `404` responses.
- Focused HTTP/service tests, authorization/disclosure tests, lint, typecheck, builds, and diff checks pass.
