# Phase 6 / UX-7 — Media readiness repair

## Objective

Close the workflow gap where publication requires image rights and accessible alternative text but the existing-attachment editor cannot repair all required metadata.

## Authorized scope

- Extend the protected attachment update contract to accept usage-rights statement, credit, and licence while preserving validation, ownership checks, transactions, and audit history.
- Replace the technical existing-file form with clear fields for file description, image accessibility description, usage rights, optional credit, and optional licence.
- Keep processing approval automated; do not add a manual approval bypass.
- Split the combined primary-image readiness failure into exact actionable or waiting states.
- Give media readiness issues a clear **Fix main image** or **View files** action and prevent the action label from overflowing.
- Add focused backend and frontend tests.

## Completion gate

1. A teacher can add or correct rights and accessible image description after upload without replacing the file.
2. The saved values are returned by the existing attachment list and affect the next readiness check.
3. Processing/rejection states do not blame the teacher or imply a manual approval control.
4. Review guidance identifies the exact issue and uses a clear, correctly sized destination action.
5. Authorization, archival/category invariants, input bounds, no-store behavior, audit history, and private storage boundaries remain intact.
