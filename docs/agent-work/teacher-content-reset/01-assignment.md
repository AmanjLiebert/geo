# Teacher content reset — authorized local operation

User explicitly requested removal of all scientific records and all category images, plus the five previously identified disposable test categories. Preserve real taxonomy, templates, accounts, permissions, scientific references, and audit events. No deployment, schema migration, production bootstrap change, external object deletion, or new content is authorized.

Risk: CRITICAL, destructive local content operation. Codex execution explicitly authorized in chat. Independent review is not available in this operation; do not claim it.

Recovery: selective PostgreSQL custom-format backup at ignored `backups/teacher-content-reset-2026-11-12/content.dump`, with table definitions and data for affected record/category/media tables, structure requests and content audit events. Account/session tables are excluded. Keep object storage unchanged. Validate archive readability before mutation. Restore requires a reviewed, dependency-aware operation against the same schema; never blindly overwrite later authoring.

Execute one transaction with counts and exact test-slug assertions. Remove record revisions and records (dependent record data cascades). Clear current and draft category images. Archive affected image media only if not shared with organization or research. Category lifecycle normally prohibits deletion: for this explicitly authorized test reset only, lock categories, disable its lifecycle trigger within the transaction, delete exact test descendants before parents, and re-enable before commit; do not disable foreign keys or other guards. Preserve audit history and write a reset event with counts. Roll back on any failure.

The category/type binding delete guard also prohibits test binding removal. Its exact lifecycle trigger must be disabled only inside the same locked transaction for those five categories, then re-enabled before commit. All remaining bindings are preserved.

Verify zero records/current or draft category images, absent test categories, preserved real taxonomy/templates/accounts, enabled lifecycle triggers, API empty states and unavailable old record/image routes. This is local operational verification, not independent release approval.
