# Phase 6 Step 6D — Curated dataset publication

## Objective

Publish the 36 task-owned curated scientific records so they appear in public Explore, following the existing publication checks instead of bypassing them.

## Scope

- Add a separately invoked, idempotent publication command for the deterministic curated dataset only.
- Replace draft/development narration in its English copy with production-suitable, cautious observational language.
- Require two distinct active teacher/admin accounts: the existing seed owner and an independent reviewer.
- Verify the task-owned source references, submit each record for review, and publish through `RecordsService` so validation, evidence, category, media, translation, revision, and audit rules execute normally.
- Leave all unrelated records, users, categories, references, media, and publication states unchanged.

## Gate

Exactly 36 task-owned records are published, the prior published record remains present, public API totals reach 37, every curated public image loads from an approved derivative, rerunning the command creates no duplicates or extra review events, and focused/full backend checks pass.
