# Phase 2 identity and access decisions

## Identity provider

Firebase Authentication is the selected managed identity provider for Google and verified phone sign-in. Firebase proves
the external identity only. It does not own Geo-Kurdistan roles, permissions, account status, invitations, or sessions.

The browser exchanges a short-lived Firebase ID token with NestJS. NestJS verifies it with the Firebase Admin SDK,
links the Firebase subject to an internal user, and issues a random opaque session cookie. Firebase tokens and role claims
are never accepted as application authorization.

## Sessions and request protection

- Session and CSRF tokens are generated from cryptographically secure random bytes; only SHA-256 hashes are stored.
- The session cookie is HTTP-only, secure in production, same-site, revocable, and backed by PostgreSQL.
- Unsafe authenticated requests require a session-bound CSRF cookie/header pair.
- The sign-in exchange uses a separate pre-authentication CSRF challenge to prevent login CSRF.
- High-risk actions require a recent provider authentication; privileged MFA can be required when Firebase Identity
  Platform MFA is enabled.
- Disabling an account or changing its role revokes its active sessions.

## Roles and invitations

Exactly three fixed roles exist: `visitor`, `teacher`, and `admin`. Permission bundles are defined in NestJS, mirrored
into PostgreSQL by the idempotent seed for inspection, and are not client-editable.

Public sign-in creates a visitor. A teacher or admin role requires a pending invitation whose recipient matches the
verified email or phone on the Firebase identity. The first admin is created through a one-time maintenance invitation;
there is no public bootstrap endpoint. Administrators cannot change their own role/status, and the last active admin
cannot be demoted or disabled.

## Audit boundary

Identity linking, invitations, role/status changes, privileged reauthentication failures, and authorization denials
produce server-side security events. There is deliberately no raw audit-log dashboard. Events exclude credentials,
tokens, cookies, and protected content.
