# Phase 6 Step 6C — Curated scientific development dataset

## Objective

Add exactly 36 useful scientific draft records to the existing development database without resetting or replacing any current category, record, user, media, reference, or audit row.

## Authorized scope

- Add an explicit, separately invoked backend command for the curated dataset. Do not add it to the normal production `db:seed` command.
- Use only active managed categories, allowed record types, and active template versions already stored in PostgreSQL.
- Add English draft translations, conservative template attributes, traceable source references, and semantically matching images from the repository attribution catalog.
- Upload private originals and square WebP derivatives to the configured media bucket, then store approved media metadata and per-record captions/alt text.
- Make every seeded identifier deterministic and every insert idempotent.
- Add focused tests and a dry-run mode.

## Boundaries

- Do not delete, reset, archive, publish, or modify existing user content.
- Do not fabricate review, verification, measurements, coordinates, stratigraphic ages, lithology, or locality claims.
- Seeded records and references remain drafts/unverified until teachers review them.
- Do not read, print, copy, or commit environment secrets.
- Do not merge, push, or deploy.

## Gate

Running the command twice leaves exactly 36 task-owned records, reports existing rows as unchanged, and produces no duplicate records, references, media, derivatives, evidence, or attachments. Each record has a valid managed classification, an English draft translation, one traceable source, and one correctly attributed image. Existing database counts and rows remain intact.
