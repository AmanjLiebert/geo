# Root environment finalization

User authorizes fixes, double-checking root-only local/production setup, and merge/push to main. Codex implementation override continues. Risk: CRITICAL (deployment). Scope: reject legacy frontend files, root-relative Firebase paths, missing DATABASE_URL guidance, local-ready template/production guide, regression tests and CI. No secrets, data, providers, schema or live services are changed. Preserve private files. Rollback: revert code/configuration and restore the prior release; no database reversal. Verify synthetic tests, backend/frontend suites and builds, and browser secret boundary in isolated copies. Do not claim independent approval or live production verification.

During verification, frontend lint also identified an existing admin invitation-loading effect error and unused imports. Scope includes the minimal deferred/cancellable initial load and import cleanup needed for the frontend check; no authorization, role or request changes.
