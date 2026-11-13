# Restore the six profiles and ten sourced records

This is the opt-in content bundle requested for zhirsaz.com. It contains the saved six main category profiles and ten sourced records, including clean category prose, references, captions, alt text and image rights. It is separate from the older curated catalogue. It is never called during startup, migrations or the foundation seed.

## Hostinger / PM2

Deploy the updated checkout, including backend/scripts/seed-teacher-content.cjs and backend/assets/teacher-content-v1/. Build the backend normally with `npm --prefix backend run build` if the deployment has not already built it. Node 24 and the existing backend dependencies are required. Run the following from the repository root, using the same environment as the API:

```sh
npm --prefix backend run db:seed:teacher:prod
```

Optional read-only preflight before the actual import:

```sh
npm --prefix backend run db:seed:teacher:prod -- --dry-run
```

The root `.env` loader and injected environment behave exactly as for the API; injected values take precedence. Never paste or print credentials. This command uses whichever database and media bucket that environment names: confirm the intended hosted environment and take a current backup before the actual import. No hosted operation was performed during implementation. Independent review is pending under the repository's critical-work gate.

Prerequisites: current reviewed database migrations; an active admin or teacher already created through the existing account workflow; configured private MEDIA_STORAGE_* settings; a reachable healthy ClamAV scanner using MEDIA_SCANNER_HOST/PORT; backend media-processing dependencies. Dry-run validates packaged image hashes, content inventory, owner, taxonomy, existing conflicts and storage configuration presence. It does not test storage credentials or scan images; actual import does. It creates no accounts and never disables the scanner.

Expected result on the empty hosted database: six main categories with summaries/descriptions/images, ten published records with evidence and ten distinct primary images. Fourteen image files are packaged because two record photos are also appropriate category profiles; no two records share their primary photo. Assets are resized versions of the same attributed sources, about 4.8 MB total. Scientific publication and media eligibility use the existing services and readiness checks.

## Repeat and failure behavior

Published records with matching slugs are kept, including any later user edits. Existing identical category prose with an approved image is kept. Differing/nonempty categories, pending category drafts and unpublished existing records stop the import rather than being overwritten. The command has no delete/reset/force mode. Do not run the older `db:seed:catalog` expecting this ten-record bundle.

One seed at a time holds a database advisory lock. Media checkpoints live in the existing content audit log, allowing approved uploads to be reused after interruption. Confirmed images must pass real malware scanning and normal derivative creation; both derivative objects are checked in storage. Publication failures roll back the current record, sources, attachment, revisions and completion checkpoint together. Completed earlier items remain; rerunning keeps them and continues remaining work. Expired/rejected/archived uploads are never manually approved or resurrected; resolve normal media lifecycle/recovery failures before retrying. An abrupt failure between creating a pending upload and saving its checkpoint can leave an unassociated pending upload for normal cleanup.

There is no automatic database rollback of previously completed items. Use the normal unpublish/archive actions if content needs withdrawing. Use the reviewed database and private-media backup/restore procedures for recovery; do not hard-delete business rows or restore a whole local database over the hosted one. Review conflicting drafts/edits through the dashboard.

## Docker alternative

The backend image includes the runner and packaged assets:

```sh
docker compose exec -T api npm run db:seed:teacher:prod
```

Use the PM2 command above for the user's current deployment. No API/frontend restart is required after a successful content import: public content is read through the existing uncached API.
