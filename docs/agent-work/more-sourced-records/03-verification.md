# Operational verification

Status: `IMPLEMENTED_AWAITING_REVIEW`. Executing-agent checks only; not independent approval.

- Public scientific records API: 10 published records, including all seven new slugs.
- Each new detail response has nonempty scientific fields, source links, caption/alternative text and matching primary image. All seven image responses returned HTTP 200.
- Normal readiness and publication gates passed for all seven; all 10 current record image assets are approved with clean scanner results.
- Database duplicate check: 10 attachments = 10 asset IDs = 10 original SHA-256 hashes. Source photos and contact sheets show different subjects/images; no transformed-source duplicate intentionally used.
- Browser checked new Halgurd detail and starfish specimen detail; fossil collection renders two separate specimen cards. Public type, facts, repository, sources and explicit provenance limitations appear correctly. Other new details were checked via API, not individual browser visits.
- Halgurd photograph shows a snowy peak rather than the initially considered sign. Korek, Bradost, Dukan and waterfall images were visually inspected. The museum photos show different fossils.
- Automated application tests/build not run for data-only changes. Actual authenticated dashboard entry remains unverified; the same backend methods used by the dashboard were exercised.
- Sources are original image pages linked in `content.json`; no unsupported scientific interpretation is represented as a researched field measurement. No absolute factual-error guarantee or expert scientific review is claimed.
