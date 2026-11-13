# Explore image delivery implementation

Status: `IMPLEMENTED_AWAITING_REVIEW`. Codex implemented the local performance correction requested by the user. No remote deployment, migration or data change.

`MediaService.publicInlineImage` can prefer an existing thumbnail derivative and creates an opaque content-derived ETag. After fresh approval and current derivative queries, a matching validator returns no stream, avoiding the object-storage request. Changed derivative hashes invalidate the validator. Only processed display/thumbnail kinds are eligible; the existing approved-media boundary remains intact.

All three public scientific image routes accept validated `size=thumbnail|display` (default display), check category/record/attachment eligibility first, then process the validator. They return private, no-cache, max-age=0, must-revalidate; no shared/fresh/immutable browser cache, signed URLs, originals or process cache. Protected dashboard delivery was not changed.

Explore collection/card/related images request thumbnails. Record-reader and fullscreen images retain default display derivatives. The relevant installed Next Image guide was read before editing the component. No global image optimizer was enabled. Existing unrelated home/account/style/content work was preserved; local frontend build necessarily reflects the current workspace snapshot.

Files: media service; public image query DTO/controller; focused media/HTTP tests; Explore browser component. Rollback only these changes and rebuild API/frontend. No database restore needed. An attempt to tag both previous container images for rollback encountered a missing old local image; no rollback-image availability guarantee is made. Existing Git base and patch boundaries are available; no source changes were committed.

Measured example sizes (display -> thumbnail): Halgurd 100682 -> 15508 bytes, trilobite 202454 -> 18708, starfish 415890 -> 34204, Dukan 45028 -> 23650. Unchanged repeat requests returned 304, initially 8–70 ms for three samples and a 1060 ms outlier. Targeted recheck of the outlier after startup returned 28/79/67 ms. Cold thumbnail requests still took 240–424 ms in the sample because object-storage latency remains. These measurements are local samples, not a production benchmark or guaranteed latency.
