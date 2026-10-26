# Geo-Kurdistan Design Context

## Approved category-management change

The teacher/admin scientific workspace now includes simple category and subcategory creation, unpublished draft editing, and confirmed archive/restore with preserved records. New branches begin unpublished and receive a General geological record choice automatically. The earlier prohibition on category creation in the dashboard is superseded; custom scientific-field-template editing remains unavailable. Keep the established visual language, plain labels, accessible image upload, and obvious draft/removed states. Public Explore must eventually show only published database content, never showcase records presented as real.

## Product and audience

Geo-Kurdistan is a public geological knowledge platform used by visitors, students, and geology teachers to browse and manage collections, records, places, evidence, reviewed research, geological news, and trusted information about the organization that publishes the site. The existing frontend establishes the visual baseline for the production platform and must be extended rather than redesigned.

## Experience principles

1. Scientific hierarchy before decoration: title, context, evidence, and actions must be immediately distinguishable.
2. Exploration without losing place: collection, record, image, and research navigation preserve context and make the exit obvious.
3. Compact, not compressed: use the available viewport efficiently while protecting readable line lengths and 44px interaction targets.
4. One connected action language: functional controls use the shared bordered, hard-shadow action system and consistent hover, focus, active, and disabled states.
5. Geological character through material: restrained strata colours, documentary imagery, mono metadata, and paper-like surfaces create identity without excessive effects.
6. Scientific state is visible: draft, review, evidence, translation, location sensitivity, and publication status must be understandable without opening technical metadata.
7. Roles remain legible: visitors, teachers, and admins see only the work relevant to them and understand why an action is unavailable.
8. Empty is a valid state: zero records, zero results, missing translations, and unconfigured optional content receive intentional guidance rather than fake content.
9. One identity across languages: translations are alternate presentations of the same scientific entity, not duplicate records.
10. Trust is attributable: scientific claims, news, managed pages, AI answers, and ownership information show who published or reviewed them and when.
11. Security is understandable: sensitive actions, session problems, permission denials, upload quarantine, and recovery states are explained without exposing private implementation detail.

## Visual language

- Direction: modern geological field archive; Neo-scientific structure with clean Material-style organization.
- Signature motif: limestone paper panels, carbon rules and shadows, iron accents, ochre labels, and shale evidence surfaces.
- Typography: readable sans for prose and display headings; Plex Mono for metadata, labels, counts, and controls.
- Card grammar: limestone surface, 2px carbon border, 5px radius, 4px carbon hard shadow. Use cards for meaningful grouped objects, not every nested region.
- Motion: brief positional or shadow feedback only; respect `prefers-reduced-motion`.

The protected dashboard uses the same tokens, typography, action language, and geological character. It may be denser than the public site, but it must not become a visually unrelated generic administration template.

## Canonical tokens

Runtime tokens in `frontend/src/app/globals.css` are canonical:

- Carbon `#20231f`: primary ink, borders, dark navigation.
- Fossil `#ebe5da`: page and filter background.
- Limestone `#fbf8f1`: reading and card surface.
- Iron `#9e4d37`: primary action and geological accent.
- Shale `#405149`: scientific feature panels and image framing.
- Ochre `#d8c6a3`: labels, pagination, and supporting emphasis.
- Soft ink `#51554f`: secondary copy.

## Responsive contract

- Desktop, 1180px and above: full navigation, multi-column evidence grids, bounded readable content.
- Tablet, 761–1179px: reduce columns before reducing type; keep primary controls visible and uncompressed.
- Phone, up to 760px: width-based layouts regardless of pointer type; compact icon actions may replace labels only when an accessible name remains.
- No page-level horizontal overflow. Deliberate rails must be self-contained, scroll-snapped, and visibly scrollable.
- Full-viewport status pages do not create document scrolling; very short screens may scroll inside their content panel.

## Accessibility and states

- Minimum interactive target: 44px.
- Keyboard focus uses the shared ochre/iron high-contrast outline and must never depend on hover.
- Icon-only actions require an accessible label.
- Disabled, selected, open, loading, empty, and error states remain visually distinct without relying on colour alone.
- Reading copy targets roughly 60–72 characters per line.

## Dashboard information architecture

Dashboard management screens use a browse-then-edit pattern. Collection screens prioritize search, filters, recognizable imagery, hierarchy, status, and a clear primary action. Creating or editing an item opens a focused workspace instead of inserting a large form above or inside the collection. Private media previews use authorized short-lived delivery and never expose storage locations.

The record editor follows the scientific decision sequence:

1. Select **Add record**.
2. Choose a category.
3. Choose a subcategory when that category requires one.
4. Choose a record type.
5. Complete the scientific form generated automatically from the active template.
6. Add English record details, evidence/references, location visibility, media, and relationships in guided sections. Multilingual authoring comes later.
7. Validate, review, and publish.

The interface must:

- Show the chosen category, subcategory, and record type together; do not ask the teacher to choose or understand a template version.
- Explain the difference between subcategory and record type in plain language.
- Offer category creation in a separate guided dashboard screen, not inside the record form.
- Keep advanced sections collapsed until relevant while preserving a clear completion summary.
- Display field-level errors beside fields and provide a linked page-level summary.
- Show autosave, unsaved, saved, conflict, and offline/error states clearly.
- Use archive and restore as the normal removal workflow.
- Keep completion and visibility separate: a draft may be incomplete, a complete item may remain unpublished by choice, and publishing or returning a published record to editing is always an explicit action. Explain missing title, description, approved image, evidence, or location requirement beside the relevant action.
- On a published scientific record, label the correction action **Edit published record**, not **Unpublish**. Confirm that the record will be temporarily hidden from visitors, preserve all work, create audit history, and open the editable draft immediately after the transition succeeds.

## Roles and permissions

- The only application roles are visitor, teacher, and admin. Anonymous browsing is not a separate role.
- A visitor browses published content and, when signed in, saves or removes geological records from a private watch-later list.
- A teacher manages geological records and research, including translations, evidence, locations, media, review, publication, archive, and restore.
- An admin can do everything a teacher can and receives a small additional area for user activation/invitations, news, managed pages, organization information, and an optional future shop.
- Teacher and admin use the same scientific workspace. Do not duplicate or complicate the record flow for admin.
- Category/subcategory creation and later editing/archive are routine teacher/admin dashboard actions. Custom record-type, template, custom-role, raw-audit-log, and technical-setting interfaces are not.
- Hide irrelevant unavailable actions when that improves clarity, but explain a disabled action when the user reasonably expects access.
- Never rely on interface visibility as authorization; API denial states must be clear and non-destructive.
- Privileged actions such as publishing, role promotion, and restricted-location access require explicit confirmation and produce automatic audit history behind the scenes.
- High-risk actions that require reauthentication or multi-factor confirmation must preserve the user's unsaved work and return them to the intended action safely.
- Session expiry, revocation, rate limiting, and permission denial use distinct messages; never blame the user or reveal whether another person's protected resource exists.

## Template behavior and controlled maintenance

Templates drive the form but are not edited by teachers or admins in routine use:

- Load the correct active template after category, subcategory, and record type are chosen.
- Present required fields first and keep advanced fields collapsed until relevant.
- Use plain scientific labels and help text; hide schema keys, migration controls, and version mechanics from routine users.
- Centrally maintained changes preserve stable field identity, deprecate used fields instead of erasing values, and preview migration effects outside the normal dashboard.
- Never imply that a maintenance template update rewrites or republishes existing records.
- Provide a record-level banner when content uses an older template and a reviewed migration is available.

## Multilingual and bidirectional design

- The current authoring interface is English-only. Keep the underlying locale-aware model and direction-ready layouts, but do not show unused language controls or promise translations before that work is approved.
- Treat English, Kurdish, and Arabic as translations of one entity.
- Use configured BCP 47 locale tags; do not encode language assumptions in component names or database identifiers.
- Give each translation a visible status: missing, draft, in review, or published.
- Show source language, translator, reviewer, last update, and fallback behavior in the dashboard.
- Use CSS logical properties and direction-aware icons, spacing, breadcrumbs, drawers, tables, and form layouts.
- Support left-to-right and right-to-left text in the same scientific page without reversing numbers, units, formulas, coordinates, catalogue identifiers, or media.
- Do not show unreviewed translated text publicly as if it were approved.

## Evidence and scientific trust

- References are structured objects, not only free-text notes.
- Evidence is shown near the field, claim, specimen, occurrence, or interpretation it supports.
- Reference presentation should distinguish source type, authorship, year, identifier, pages/figure, institution, rights, and verification status when available.
- Publication readiness shows missing evidence according to record type.
- Provisional, disputed, externally sourced, teacher-reviewed, and institutionally verified claims must be visually distinguishable without using colour alone.
- High-impact claims may show a second reviewer and review date when one was used, but scientific-record publication must not imply that a different person is mandatory.
- Public pages reveal citations progressively: concise evidence near the claim and complete citation detail in a dedicated section.

## Research experience

- Research remains a dedicated browsing, detail, and reading experience rather than appearing as an ordinary geological record.
- The teacher/admin dashboard gives research its own list and form while reusing translation, evidence, media, relationship, review, and publication patterns.
- Clearly distinguish an external citation from a managed research publication with its own document and rights.
- Document availability, access limits, licence, version, and reading status must be visible without promising impossible copy protection.

## Visitor accounts and saved records

- Public exploration works without an account. Registration or sign-in is requested only when a visitor chooses **Save for later** or opens their saved list.
- Saving and removing a record is a one-action control with immediate saved/unsaved feedback and an accessible label.
- The saved-record page is private, supports useful empty and removed-record states, and never changes the geological record or its public popularity visibly by default.
- Sign-in, sign-out, recovery, and account-disabled states remain simple and return the visitor to the page they were using when safe.

## Online-only images and research documents

- Public and visitor interfaces provide **View image** or **Read online**, not download or bulk-export actions.
- Images use approved resized or watermarked derivatives when rights policy requires them; research documents use an embedded page/stream viewer with clear loading, access, licence, and error states.
- Never reveal permanent original-file URLs, storage keys, or downloadable metadata in markup, page source, API payloads, or shareable routes.
- The interface may deter ordinary saving, but it must not claim that screenshots or copying rendered pixels can be prevented.
- Teachers and admins can upload, replace, and archive protected media through the dashboard without receiving an unrestricted original-file download library.

## News and managed site content

- News has a dedicated public list and article experience, not the visual or scientific template of a geological record.
- Show author or publishing organization, publication/update date, source links, topic, review state when relevant, and corrections without presenting news as peer-reviewed scientific evidence.
- Scheduled, expired, draft, and archived news states remain clear in the dashboard and never leak through public previews or cached responses.
- About, mission, contact, privacy, terms, and ownership/publisher pages use the established reading typography and carry their effective or last-reviewed date where appropriate.
- Organization ownership and contact information is easy to find, readable in each supported locale, and visually separated from scientific claims.
- Admin news and managed-page forms reuse translation, revision, media, review, and publication patterns without becoming a technical settings area.

## Accounts and security-sensitive states

- Visitor registration plus teacher/admin invitation, sign-in, multi-factor challenge, recovery, reauthentication, and session-expiry screens use the established visual language and avoid a generic identity-provider feel where customization is available.
- Public registration always creates a visitor; no signup control may offer teacher or admin.
- Never expose tokens, provider errors, stack traces, private identifiers, exact restricted locations, or whether a protected resource belongs to another user.
- Upload interfaces show pending, quarantined, processing, rejected, approved, and failed states. Rejection messages are useful but do not disclose exploitable scanner internals.
- Rate-limited actions show when retry is reasonable. Expensive actions such as exports, document processing, or AI display queued/running/failed state rather than encouraging repeated submission.
- Public pages may use cached content, but preview, dashboard, account, draft, and restricted-location screens must never look publicly cacheable or appear in shareable URLs accidentally.

## AI-assisted experience

- AI is optional enhancement, never the only route to records, sources, maps, or research.
- Answers distinguish generated synthesis from reviewed platform content and show citations next to the supported claims.
- If evidence is insufficient, inaccessible, disputed, or unavailable in the requested language, say so clearly instead of producing confident filler.
- Display source accessibility and locale limitations; do not cite documents the current user cannot open.
- AI controls show running, stopped, rate-limited, provider-unavailable, and cancelled states, and allow a user to stop long responses.
- Never design an AI control that appears able to publish, delete, change permissions, or reveal restricted coordinates. Such actions remain deterministic human workflows.
- Render model output through the same safe content rules as other untrusted rich text; links, HTML, Markdown, and citations must not bypass normal sanitization.

## Geographic privacy and maps

- Never display exact restricted coordinates in public cards, URLs, page source, map payloads, alt text, or downloadable metadata.
- Public maps use only the approved public representation: exact, generalized, approximate area, region-only, or hidden.
- Clearly label approximate locations without inviting users to infer the protected point.
- Dashboard location forms show exact and public representations side by side, with sensitivity level, reason, authorized access, precision, and embargo information.
- Accessing restricted geometry must be a deliberate action with permission feedback; its automatic audit event does not require a client-facing audit screen.
- Map-layer interfaces show source, licence, date/version, coordinate reference system, scale or resolution, and visibility.

## Dashboard collection and editor ergonomics

- Management lists use stable single-column rows for hierarchical content; they must not auto-fit cards into widths that squeeze titles, badges, or controls.
- Large managed hierarchies open collapsed by default. Search and filters may reveal matching descendants automatically, but the default screen must prioritize scanning over showing every child.
- Category and record cover previews use a consistent 1:1 frame with `object-fit: cover`. Content must never determine preview height or stretch the surrounding card.
- Preserve reading order: identity and title first, then state, summary, readiness information, and actions. Status badges wrap below the title before reducing title readability.
- Give each row one obvious daily task. Put publication, destructive, and infrequent lifecycle controls behind a clearly labelled secondary disclosure while keeping keyboard access and 44-pixel targets.
- At narrow widths, stack content without horizontal scrolling and cap image previews so they do not dominate the task.

## Empty collection and first-use states

The system is designed to launch with categories and templates but zero geological records.

Public empty states:

- Explain that the collection is being prepared or has no published records yet.
- Preserve navigation and category context without fabricated counts or example records.
- Do not show broken featured areas, empty carousels, meaningless filters, or blank maps.

Dashboard empty states:

- Explain what can be created, who has permission, and which category/template will be used.
- Offer a clear “Create first record” action only to authorized users.
- Show setup problems separately from valid zero-content states.
- Allow the centrally prepared taxonomy, record types, templates, translations, and evidence policies to be verified during deployment before the first record exists; do not expose their maintenance as routine client work.

Test fixtures and existing mock content may support development and visual testing, but they must never appear as production scientific data.
