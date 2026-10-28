# Render demo image pipeline

## Objective

Provide a seven-day, explicitly enabled Render demo path for JPEG, PNG, and WebP uploads without changing or bypassing the production worker, ClamAV, quarantine, authorization, ownership, or publication invariants.

## Authorized scope

- Add a fail-closed demo deployment profile and image-only processing flag.
- Keep originals private under a demo quarantine prefix.
- Enforce a 3 MB encoded limit and a bounded decoded pixel limit.
- Fully decode with Sharp, re-encode metadata-free WebP derivatives, and delete the private original.
- Reuse the existing approved-media and publication workflow only after successful sanitization.
- Disable PDF and video upload choices in the demo interface.
- Add focused security, isolation, image-validation, authorization, and publication tests.
- Add a Render Blueprint and deployment instructions using a separate free PostgreSQL database and separate credentials.

## Excluded scope

- No changes to the production media worker or ClamAV processor.
- No production deployment, shared-database migration, secret access, merge, or push.
- No PDF processing or video transcoding in demo mode.
- No direct approval of arbitrary quarantined media.

## Gate

With the demo profile explicitly enabled, an authorized teacher can upload a valid bounded image, attach the sanitized approved derivative as primary media, publish the record, and view it publicly. Unsupported, malformed, oversized, excessive-pixel, unauthorized, and production-profile attempts fail closed.
