# Firebase Authentication setup

## Provider configuration

1. Create a Firebase project dedicated to the correct Geo-Kurdistan environment.
2. In Firebase Authentication, enable Google and Phone providers.
3. Add the exact production and development hostnames to Authorized domains; do not include protocols or ports.
4. Configure SMS-region policy, quotas, and abuse monitoring before enabling public phone sign-in.
5. Register a web application and place its public configuration in the `NEXT_PUBLIC_FIREBASE_*` deployment values.
6. Create a narrowly controlled Firebase service account for backend token verification. Store its JSON outside Git at
   the path configured by `AUTH_FIREBASE_SERVICE_ACCOUNT_PATH` for PM2/local execution (relative paths resolve from the repository root), and restrict filesystem access to the deployment account. Docker Compose uses `FIREBASE_SERVICE_ACCOUNT_FILE` to mount that JSON as a secret instead.
7. Enable Identity Platform MFA before setting `AUTH_PRIVILEGED_MFA_REQUIRED=true`.

## Initial administrator

After migrations and the configuration/role seed succeed, create the first admin invitation from a maintenance shell:

```bash
INITIAL_ADMIN_EMAIL=admin@example.org docker compose run --rm api \
  node dist/identity/create-initial-admin.js
```

Use `INITIAL_ADMIN_PHONE=+964...` instead of email when required; set exactly one. The command refuses to run after an
active admin exists, revokes older unused bootstrap invitations, and prints the new token once. Deliver it through a
separate trusted channel and append it to the account URL as a fragment:

```text
https://example.org/account#invite=<one-time-token>
```

The invited person must authenticate with the matching verified email or phone before the role is applied.

## Production checks

- A normal first sign-in creates only a visitor.
- A mismatched, expired, accepted, or revoked invitation is rejected.
- Sign-out invalidates the PostgreSQL session immediately.
- Role changes and account disablement revoke existing sessions.
- Teacher and admin endpoints deny visitor sessions even if a request identifier is changed.
- Cookies have `Secure`, `HttpOnly` where applicable, `SameSite=Lax`, and no domain wider than required.
- CORS contains only the deployed frontend origins.
- No Firebase service-account file, ID token, invitation token, session token, or CSRF value appears in Git or logs.
