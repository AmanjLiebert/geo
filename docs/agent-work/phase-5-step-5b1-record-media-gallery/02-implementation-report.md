# Implementation Report — Phase 5 Step 5B1

## Status

`IMPLEMENTED_AWAITING_REVIEW`

## Delivery

- Branch: `feature/phase5-step5b1-record-media-gallery`
- Implementation commit: `060a031f343f16ec95ddfe0b87479bab6f3d8b4a`
- Migration: `1792219200000-record-media-gallery.ts`

One draft record can now hold ordered images, PDFs, MP4, and WebM uploads with attachment-owned purpose, caption, description, image alt text, and zero or one primary image. Existing attachments receive nullable metadata and `is_primary = false`; rollback refuses to proceed if video rows would make it lossy.

Protected APIs now list, attach, edit metadata, select a primary image, reorder the complete owned gallery, detach without deleting the media asset, and return only minimal projections. Mutations retain CSRF, role, ownership, editable-record, and active-category checks. In-review, published, archived, cross-owner, and archived-category mutations fail closed.

Video uploads remain private and move through pending → quarantined → processing → approved/rejected/failed. Approval requires MIME/signature agreement, ClamAV, bounded FFprobe metadata, and successful FFmpeg transcoding to a sanitized MP4 plus WebP poster derivatives. Viewing uses only the processed playback key; it never falls back to the quarantined original. The runtime image now contains FFmpeg. Default limits are 50 MiB and five minutes, each bounded by environment validation.

The record editor now provides a multi-attachment gallery with processing state, per-file metadata, primary selection, ordering, confirmation before detach, inline approved-media viewing, keyboard focus handling, and preserved upload input on failure.

## Verification

- Focused backend: 7 files, 63 tests passed.
- Full backend: 44 files, 319 tests passed.
- Full frontend: 14 files, 163 tests passed.
- Backend/frontend lint and type checks passed.
- Nest production build passed.
- Next production build passed with 129 pages; the existing Atkinson fallback-font warning remains.
- Changed TypeScript/CSS files were formatted; `git diff --check` passed.
- No secrets, deployment, merge, push, shared-database migration, or running Docker rebuild occurred.

## Reviewer notes

Live authenticated browser upload and real container FFmpeg/ClamAV processing were not run because the assignment forbids rebuilding the user's running services solely for smoke testing. Review should specifically confirm ownership behavior, the full-set reorder contract, primary-image replacement, migration rollback guard, and processed-video-only playback before marking the task complete.
