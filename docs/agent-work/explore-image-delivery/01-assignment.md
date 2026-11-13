# Explore image delivery

User reports slow image loading. Measurements on local public images: roughly 197–1513 ms, 45–416 KB for sampled images; every request fetches remote display derivative and forbids browser storage. Scope: use thumbnail derivatives for collection/card images and conditional private browser revalidation for approved public images. Keep default display quality for record readers/fullscreen. No originals, storage keys or signed URLs exposed.

CRITICAL media/publication boundary. Every 200/304 must follow fresh public category/record/attachment eligibility plus media approval and derivative lookup. Browser cache must be private with mandatory revalidation (never shared/max-age/immutable); changed derivative hash changes ETag, unpublish/rejection denies even matching tags. Thumbnail selection must be validated and fall back safely to processed display only. No process cache or canonical state in memory.

No schema/data/identity changes. Preserve unrelated ongoing frontend changes. Rollback by reverting only this operation's specific source changes and rebuilding affected services; no database recovery needed. Run focused denial/revalidation/variant tests and appropriate backend/frontend gates before local restart. Independent verification must remain truthful and pending until performed; no remote deployment or release approval.
