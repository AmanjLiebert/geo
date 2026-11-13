# Six main category profiles — implementation

Status: `IMPLEMENTED_AWAITING_REVIEW`. Codex executed the user-authorized local content operation on 2026-11-12. No schema, application code, deployment or bootstrap changes.

All six main categories now have one relevant image and revised Kurdistan-focused English summary/description. Exact copy, sources, authors and licences are recorded in `content-and-sources.json`. Public descriptions carry attribution, licence URL, source URL, and display-resizing notice. The regional structural image is a Zagros Folded Zone map; no site-specific survey claim is made. The museum fossil's original locality and age remain explicitly unknown. The agate provenance follows the museum photograph's source description.

Six new images went through `MediaService.initiate`, object upload, `confirm`, ClamAV scan and normal `MediaProcessorService.process`; each reached approved/clean. All six images were visually inspected for subject relevance. A misleading older Bekhal-labelled canyon image was rejected in favour of the verified `Bekhal Spring 01.jpg`. The normal category edit/publish services saved revision history and published each profile. A `category.profiles_curated` audit event records the operation and sources. The operational content owner follows the existing curated-import convention of the earliest active admin/teacher; IDs and credentials were not printed.

Initial signed-upload fetch failed before publication. Retrying through the storage SDK succeeded; one pending unassociated upload remains subject to existing expired-upload cleanup. No fake approval/scanner results or protection bypasses were used. One large Commons download returned 429; the existing local Rawandiz Canyon image from the same attributed source was used for the landform profile.

Recovery inputs and executed script remain in ignored `backups/category-profiles-2026-11-12/`: `before.json`, `prepared.json`, metadata, image files, and `apply.cjs`. Old category images were null, and no drafts existed before editing. Restore via normal category edit/publish using the saved projection; keep historical revisions/audit records. Original reset backup also remains intact.

Scientific records remain zero. Subcategories were not edited. Independent review was not performed by the implementing agent.
