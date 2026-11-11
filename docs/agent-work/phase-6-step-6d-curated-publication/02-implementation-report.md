# Implementation report

Status: IMPLEMENTED_AWAITING_REVIEW

- Commit: `a1bb10d15fc25b68d3f46db10428e549a0c7aec5`
- Added a separately invoked publication command limited to the deterministic 36-record curated dataset.
- The command requires an independent active teacher/admin, verifies task-owned sources, uses the normal record review/publication services, synchronizes production-safe English and image metadata, and is idempotent.
- Published all 36 curated records without changing the 15 unrelated records or resetting the database.
