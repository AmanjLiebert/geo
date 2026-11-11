# Phase 6 / UX-8 — Protected-action identity guidance

## Objective

Make high-impact publication actions understandable without weakening their recent-identity security requirement.

## Authorized scope

- Give the backend problem response a stable, safe code for expired recent identity confirmation.
- Preserve the distinction between reauthentication and a genuine permission denial in the shared dashboard API error model.
- On record publication, explain that identity confirmation is required, provide a direct confirmation action, and return to the same record afterward.
- Do not repeatedly offer the blocked publication request while confirmation is pending.
- Keep category publication compatible with the same distinction.
- Add focused backend and frontend tests.

## Completion gate

1. A stale authorized teacher receives a clear identity-confirmation prompt rather than an access-denied message.
2. The confirmation link returns to the same record.
3. A true 403 permission denial remains neutral and does not imply identity confirmation will grant access.
4. Recent-authentication, CSRF, role authorization, audit recording, and safe error disclosure remain enforced.
