# Scientific structure maintenance

This is a developer/reviewer workflow, not a dashboard feature. Teachers and admins choose approved structure when creating records; they cannot create or delete taxonomy from the browser. The initial six-category, 17-subcategory catalog is a working seed, not final geological approval.

## One change, one reviewed forward migration

1. Record the requested category/subcategory, record type, allowed pairings, fields, evidence rule, and translations. Get scientific review before production publication.
2. Query impact: existing descendants, active pairings, draft/in-review/published records, saved links, and public slugs. Decide how affected records and public routes will behave. Back up the database before deployment.
3. Add a **new** timestamped TypeORM migration. Never edit a migration that has run anywhere. Use stable keys for identity and generated UUIDs for new rows; do not derive keys from translated labels.
4. Add or update tests. Rehearse from an empty database and with records pinned to older templates. Run migration, backend tests, lint, typecheck, build, and a restore rehearsal before production.
5. Deploy the migration once, verify the dashboard options and historical records, and keep the previous app release available for application rollback. Database recovery is forward-only unless an explicit tested restore plan exists.

## Allowed maintenance operations

| Need | Safe operation |
| --- | --- |
| Add category or subcategory | Insert a new category with a unique stable key/slug and an active parent. Set `records_allowed` explicitly. |
| Add record type | Insert the type and translations, create its template/version/fields, activate the version, then add only reviewed category/type bindings. |
| Add type to an existing subcategory | Add a binding to a matching active template; do not create a duplicate type merely for another category. |
| Correct a visible name or help text | Update its translation in a reviewed migration; keep the stable key and scientific meaning. |
| Change a field's scientific meaning, data type, or requiredness | Create a new template version/field, preview affected records, then deliberately move the active binding. Existing records remain pinned until separately migrated. |
| Move a category | Use a migration after checking descendants and public navigation. Cycles and archived parents are rejected. Records keep their own classification and history. |
| Remove a wrong choice | Reclassify or archive affected active records through normal review; archive its category/type binding, then archive unused leaf categories or types. Do not hard-delete structure. |
| Correct a stable key or slug | Treat as identity/URL migration, not a simple rename. Create a corrected entry and plan record migration plus redirects/aliases where needed. |

The database lifecycle guards reject hard deletion, stable-key mutation, cyclic parenting, mismatched active templates, and archival while non-archived records or active dependencies remain. Application authorization and publication checks still apply; database guards are a second line of defense, not a replacement for them.

## Release gate for the starter catalog

Before the proposed starter structure is treated as production-approved, geology reviewers must confirm its categories, pairings, field templates, evidence requirements, sensitive-location handling, and English/Kurdish/Arabic labels. Keep zero geological records valid. Do not invent geological examples or translate scientific terms automatically to make the menu look complete.
