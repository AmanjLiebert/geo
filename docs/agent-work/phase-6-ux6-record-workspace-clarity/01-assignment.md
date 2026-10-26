# Phase 6 / UX-6 — Record workspace clarity and visibility

## Objective

Make the scientific record workspace usable by geology teachers rather than exposing normalized database structures as disconnected forms.

## Authorized scope

- Show record details, scientific fields, sources, locations, related items, media, and review state for draft, in-review, and published records.
- In non-editable states, show saved content as read-only summaries and hide mutation controls.
- Add concise loaded item counts/state to workspace navigation.
- Remove avoidable duplicate input: public locations reuse exact coordinates; approximate locations retain a separate approved public point; initial media upload asks for one description rather than purpose/caption/alt text separately.
- Put scientific-field save success/error feedback next to the save action.
- Keep existing backend contracts, authorization, location privacy, publication readiness, media processing, revisions, and audit behavior unchanged.

## Completion gate

1. A teacher opening a published or in-review record can inspect every saved section before deciding what to do next.
2. Draft navigation shows loaded section counts/state.
3. Public-location entry does not ask for duplicate coordinate pairs; approximate-location entry still protects the exact point.
4. Initial media upload asks once what the file shows and maps that description safely to existing metadata.
5. Long-form save feedback is visible beside the save button.
6. Focused frontend tests, lint, typecheck, and production build pass.

## Boundaries

- No schema or backend policy changes.
- No destructive rewrite of existing content.
- Do not merge sections that have distinct scientific meaning; simplify their presentation and entry only.
- Do not expose exact restricted coordinates, private storage URLs, or internal identifiers.
