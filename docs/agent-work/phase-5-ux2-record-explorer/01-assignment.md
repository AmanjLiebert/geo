# Phase 5 UX-2 — Record Explorer

Status: `READY_FOR_IMPLEMENTATION`

## Goal

Replace the oversized scientific-record card list with a compact, searchable index designed around the teacher’s frequent tasks: find a record, understand its category and state, and reopen the correct editable draft.

## Scope

- Add bounded, parameterized title search to the protected record-list endpoint.
- Extend the minimal list projection with translated category title and one primary/fallback image attachment identifier; do not expose attributes, ownership, storage keys, template identifiers, or other record internals.
- Render square protected thumbnails with a same-size no-image/processing state.
- Show title, category context, record status, updated date, and one obvious Edit or Classify action.
- Keep Add record prominent, retain status filtering and pagination, and use real empty/loading/error states.
- Use a compact responsive list rather than large cards.

## Boundaries

- Do not change record mutation, classification, review, publication, media attachment, or authorization rules.
- Do not redesign the record editor in this task.
- Do not expose public or permanent media URLs.
- Preserve deny-by-default teacher/admin access and private no-store caching.

## Gate

A teacher or admin can search and filter the full protected record collection, distinguish records using title/category/state/image, and reopen an editable draft without excessive scrolling. Visitors and signed-out users remain denied.
