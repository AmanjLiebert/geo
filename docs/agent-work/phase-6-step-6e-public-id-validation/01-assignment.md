# Phase 6 Step 6E — Public identifier validation

## Objective

Fix public Explore collection routes that reject deterministic UUIDv5 public record identifiers as invalid data.

## Scope

- Accept canonical non-nil UUID versions used by managed public records instead of UUIDv4 only.
- Keep malformed and unsafe identifiers rejected.
- Add focused validator and live-route verification across every published category.
- Do not change public data, permissions, publication rules, or API projections.

## Gate

All published category routes render successfully, the validator accepts UUIDv4 and UUIDv5 identifiers, malformed identifiers remain rejected, and frontend tests, lint, typecheck, and production build pass.
