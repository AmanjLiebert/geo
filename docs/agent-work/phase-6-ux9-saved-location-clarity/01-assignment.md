# Phase 6 / UX-9 — Saved location clarity

## Objective

Make a successful location save visible and understandable to an authorized teacher without changing public location privacy.

## Authorized scope

- Preserve and validate the protected exact/public GeoJSON points already returned to authorized editors.
- Show saved location label, region, exact coordinates, visibility, and applicable public-display information.
- Separate saved locations from the add-new-location form.
- Close the add form after a successful save and provide a clear **Add another location** action.
- Add focused frontend tests; do not change public API projections or location authorization.

## Completion gate

1. Saved coordinates remain visible to an authorized teacher after the form resets.
2. The blank form is clearly an add-new action, not the saved item.
3. Multiple locations remain listed without overwriting one another.
4. Restricted coordinates remain absent from visitor-facing public responses.
