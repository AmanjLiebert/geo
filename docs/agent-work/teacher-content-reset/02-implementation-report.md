# Local content reset — implementation report

Status: `IMPLEMENTED_AWAITING_REVIEW`. Codex executed the user-authorized local reset on 2026-11-12. No commit, push, deployment, schema change, or external object deletion.

One transaction removed all 54 scientific records and their revisions/dependent data; deleted the five exact test categories, their draft history and bindings; cleared six current category images (no draft images existed); archived 29 affected image assets without removing storage objects. Historical image references for retained categories remain historical only. Research/organization-shared media was excluded from archival. Scientific references and content audit events were preserved; a `content.test_reset` event records before/after counts. The two exact category/binding lifecycle triggers were disabled only under transaction locks for the authorized test deletion, then re-enabled before commit. Foreign keys stayed enabled. This is an explicit exception for disposable test data, not a reusable application deletion path.

Preserved inventories: 7 accounts, 21 record types, 21 templates, 21 template versions, 55 fields, and 19 scientific references. Categories: 29 before, 24 after; 22 are public. Real retained category/type bindings were not changed.

Recovery artifact (ignored): `backups/teacher-content-reset-2026-11-12/content.dump`, 127672 bytes, SHA-256 `59DE91DB0E48D9680E60EBEC74B1C24CB51BEBBCBF04C5497F66C5BAC14C8F53`. `pg_restore --list` successfully read 133 lines. This selective archive excludes account/session tables and is not a full-server recovery backup. Original media objects remain available. Restore was not rehearsed; dependency-aware restore must preserve later authoring. Exact executed script is retained beside the archive as `reset.cjs`.

No source code changed for this reset. Existing unrelated uncommitted editor/CSS/content-mapping work was preserved.
