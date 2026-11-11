# Implementation Report — Phase 5 Step 5A

## Status

`IMPLEMENTED_AWAITING_REVIEW`

## Branch and commit

- Branch: `feature/phase5-step5a-category-publication`
- Commit: `3d4a9fe006e5686ed1479256a693a3371c8cc5a7`

## Changed files

### Backend (Core, Service, and Controller)
- `backend/src/scientific-content/scientific-content.types.ts`: Defined `CategoryReadinessResult` and `CategoryReadinessIssue`.
- `backend/src/scientific-content/scientific-structure.service.ts`:
  - Added `evaluateCategoryReadiness` checking category active status, parent active and published status, English translation length constraints, and approved rights-cleared image asset.
  - Extended `listCategories` query with left joins on `media_assets` and `content_audit_events` to compute readiness, honest display states (`draft`, `published`, `unpublished`, `archived`), and `hasUnpublishedChanges`.
  - Added `getCategoryReadiness(categoryId)` returning safe, field-level readiness issues.
  - Added `publishCategory(actorUserId, categoryId)` with row-level locking (`FOR UPDATE OF c`), readiness validation, share locking on media assets, atomic promotion of pending `category_draft_revisions` to live projection and English translations, and logging of `category.published` audit event.
  - Added `unpublishCategory(actorUserId, categoryId)` with row-level locking (`FOR UPDATE`), 409 conflict checks, transition to `publication_status = 'draft'`, and logging of `category.unpublished` audit event.
- `backend/src/scientific-content/scientific-structure.controller.ts`:
  - Exposed `GET categories/:categoryId/readiness` (protected by `@Roles('teacher', 'admin')`).
  - Exposed `POST categories/:categoryId/publish` (protected by `@Roles('teacher', 'admin')`).
  - Exposed `POST categories/:categoryId/unpublish` (protected by `@Roles('teacher', 'admin')`).

### Backend Tests
- `backend/src/scientific-content/category-publication.spec.ts`: Comprehensive unit tests covering readiness validation, atomic draft revision promotion, subcategory parent publication enforcement, unpublish state preservation, 409 conflict handling, and content audit event logging.
- `backend/src/scientific-content/records-http.spec.ts`: HTTP integration tests verifying readiness, publish, unpublish, unauthenticated 401, visitor 403, CSRF enforcement, and invalid parameter rejection.

### Frontend (API & Management Page)
- `frontend/src/lib/category-management-api.ts`:
  - Added `CategoryReadinessIssue`, `CategoryReadiness`, `CategoryDisplayState`, and `CategoryBadgeState` types.
  - Updated `listManagedCategories` to parse readiness, display state, and draft changes.
  - Added `getCategoryReadiness`, `publishCategory`, and `unpublishCategory`.
  - Exported pure UI helper functions `getCategoryBadgeState` and `getCategoryActions` for consistent status badge and button availability logic.
- `frontend/src/lib/category-management-api.test.ts`: Unit tests covering category API client methods and comprehensive UI-state distinctions (Draft, Published, Unpublished, Removed, Unpublished changes).
- `frontend/src/app/dashboard/categories/page.tsx`: Updated management view to render honest status badges, user-actionable readiness issues for blocked categories, and distinct Publish / Publish changes, Unpublish, Remove, and Restore actions.
- `frontend/src/app/dashboard/categories/page.module.css`: Styles for status badges (`badgeDraft`, `badgePublished`, `badgeUnpublished`, `badgeRemoved`, `badgeChanges`, `badgeReady`), readiness issue listings, and lifecycle action buttons.

## Behavior delivered

1. **Category Readiness Assessment:** Authorized teachers and admins receive concise, structured field-level issues for incomplete categories (e.g. missing English summary/description, missing or unapproved rights-cleared image, or unpublished parent for subcategories) without revealing storage paths or internal details.
2. **Atomic Publication:**
   - Evaluates category readiness under transaction row lock (`FOR UPDATE OF c`).
   - If a pending draft revision exists in `category_draft_revisions`, its title, summary, description, image, and position are promoted into the live `categories` and `category_translations` tables.
   - Deletes the applied draft revision while retaining historical entries in `category_draft_revision_history`.
   - Updates `publication_status` to `'published'` and emits a `category.published` audit event in `content_audit_events`.
   - Stable identifier and slug remain unchanged.
3. **Subcategory Parent Invariants:** A subcategory cannot be published unless its parent category is active and already published.
4. **Non-destructive Unpublication:**
   - Row-locked transition of `publication_status` back to `'draft'`.
   - Emits a `category.unpublished` audit event.
   - Preserves all category data, translations, drafts, revision history, records, and media references.
   - Subcategories under an unpublished parent become non-public by parent status without mutating descendant rows.
5. **Conflict Handling:** Returns deterministic 409 Conflict when attempting to publish an archived category, publish an already-published category without draft changes, or unpublish an archived or non-published category.
6. **Dashboard Distinction:**
   - Clearly differentiates `Draft`, `Published`, `Unpublished`, `Removed`, and `Unpublished changes`.
   - Shows "Ready to publish" badge when requirements are met.
   - Shows user-fixable requirement issues beside blocked categories.
   - Disables or displays appropriate actions (Publish, Publish changes, Unpublish, Remove, Restore) based on category state.

## Verification performed

- **Backend Category Publication Unit Tests:**
  `npm test -- src/scientific-content/category-publication.spec.ts` (in `backend`)
  Result: 13 passed (13 tests)
- **Backend Records HTTP Tests:**
  `npm test -- src/scientific-content/records-http.spec.ts` (in `backend`)
  Result: 87 passed (87 tests)
- **Frontend Category API & UI-State Unit Tests:**
  `npm test -- --run src/lib/category-management-api.test.ts` (in `frontend`)
  Result: 11 passed (11 tests)
- **Backend TypeScript Check:**
  `npm run typecheck` (in `backend`)
  Result: Passed (0 errors)
- **Frontend TypeScript Check:**
  `npx tsc --noEmit` (in `frontend`)
  Result: Passed (0 errors)
- **Backend Lint:**
  `npm run lint` (in `backend`)
  Result: Passed (0 errors)
- **Frontend Lint:**
  `npm run lint` (in `frontend`)
  Result: Passed (0 errors)
- **Backend Production Build:**
  `npm run build` (in `backend`)
  Result: Passed (`nest build` completed successfully)
- **Frontend Production Build:**
  `npm run build` (in `frontend`)
  Result: Passed (`next build` SSG/Turbopack completed successfully)
- **Git Diff Whitespace Check:**
  `git diff --check`
  Result: Passed (0 errors)

## Schema and migration impact

- Zero schema migrations were required or introduced.
- Existing schema already provides `ck_categories_publication_status` (`CHECK (publication_status IN ('draft', 'published'))`), `category_draft_revisions`, `category_draft_revision_history`, and `content_audit_events`.
- Display state distinction between newly created `draft` and `unpublished` is derived from audit history (`action = 'category.unpublished'`).

## Security and data-preservation notes

- **Authorization:** `GET readiness`, `POST publish`, and `POST unpublish` are strictly protected by `@Roles('teacher', 'admin')`. Unauthenticated calls yield 401; visitor calls yield 403.
- **CSRF:** Enforced via Fastify `AccessGuard` on mutating endpoints (`POST`).
- **Data Protection:** Zero hard deletes or silent overwrites. Unpublishing leaves all draft revisions, records, media, and child relationships fully intact.
- **Data Minimization:** No raw storage paths, internal SQL, tokens, or unnecessary identifiers are exposed in API responses or user interfaces.

## Browser smoke

- Status: Not run. No pre-existing authenticated browser or running development server was available (ports 3000 and 4000 were verified inactive), and rebuilding Docker was explicitly excluded.

## Known limitations

- Category publication only: does not publish records or expose public Explore pages for unpublished categories (governed by Phase 5 Step 5B and Phase 6).
- Public Explore integration will reflect published categories once public category read endpoints are introduced.

## Reviewer focus

- Atomic promotion of draft revisions in `publishCategory` (`scientific-structure.service.ts`).
- Row locking with `FOR UPDATE OF c` and `FOR SHARE` on media assets.
- Clean distinction in `listCategories` and UI between fresh Drafts and categories that were previously Unpublished.
- Subcategory readiness check enforcing published parent status.

## Correction round

- Correction commit: `54a2706f5704b3c95f77cd33a77e46cb38735bcf`
- Category publish and unpublish now explicitly require `PUBLISH_SCIENTIFIC_CONTENT` and recent privileged authentication through `@HighRiskAction()`.
- Publication now locks and re-reads the current parent and selected media asset before evaluating readiness. Missing, rejected, unapproved, non-rights-cleared, archived-parent, and unpublished-parent states abort without promotion.
- Frontend parsing now requires the readiness/display-state contract and rejects malformed issue values instead of coercing them.
- Focused backend tests: 107 passed. Focused frontend tests: 16 passed. Backend/frontend type checks and lint passed. `git diff --check` passed.
- No schema, migration, routing, dependency, or build-configuration changes were made, so production builds were not repeated during the correction round.

