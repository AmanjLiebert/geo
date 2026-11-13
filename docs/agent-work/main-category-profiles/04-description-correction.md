# Description presentation correction

User requested removal of raw image-credit URLs and licensing blocks from category descriptions. On 2026-11-12, all six main descriptions were cleaned through normal category edit/publish services, preserving revision history, summaries, image associations and rights metadata. Image-specific explanatory sentences were also removed from category prose.

Public attribution now lives at `/image-credits`, linked from the footer. It lists each source, photographer and clickable licence, with a resize/crop notice. Data is in `frontend/src/content/category-image-credits.json`. This supersedes the earlier manifest's attribution-appended public descriptions; that file remains a record of the original operation.

Focused ESLint and the Docker production build passed (existing fallback-font warning). Local frontend recreated. Public API checks confirmed six clean main descriptions without source URLs or credit blocks. Credits page returned HTTP 200 and contains source/licence links. No independent review is claimed.
