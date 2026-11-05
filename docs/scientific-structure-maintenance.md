# Scientific structure maintenance

> **Authority:** This document owns controlled scientific-structure maintenance, the provisional starter catalog, category/type pairings, and scientific approval gates. `MAP.md` owns the general scientific model and lifecycle; `PLAN.md` owns delivery status.

Teachers and admins manage category and subcategory content through the protected dashboard. Custom record types, templates, field definitions, stable-key corrections, and schema/data migrations remain developer/reviewer maintenance. The initial six-category, 17-subcategory catalog is a working seed, not final geological approval.

## One change, one reviewed forward migration

1. Record the requested category/subcategory, record type, allowed pairings, fields, evidence rule, and translations. Get scientific review before production publication.
2. Query impact: existing descendants, active pairings, draft/in-review/published records, saved links, and public slugs. Decide how affected records and public routes will behave. Back up the database before deployment.
3. Add a **new** timestamped TypeORM migration. Never edit a migration that has run anywhere. Use stable keys for identity and generated UUIDs for new rows; do not derive keys from translated labels.
4. Add or update tests. Rehearse from an empty database and with records pinned to older templates. Run migration, backend tests, lint, typecheck, build, and a restore rehearsal before production.
5. Deploy the migration once, verify the dashboard options and historical records, and keep the previous app release available for application rollback. Database recovery is forward-only unless an explicit tested restore plan exists.

## Allowed maintenance operations

| Need | Safe operation |
| --- | --- |
| Add category or subcategory | Insert a new category with a unique stable key/slug and an active parent. Set `records_allowed` explicitly. |
| Add record type | Insert the type and translations, create its template/version/fields, activate the version, then add only reviewed category/type bindings. |
| Add type to an existing subcategory | Add a binding to a matching active template; do not create a duplicate type merely for another category. |
| Correct a visible name or help text | Update its translation in a reviewed migration; keep the stable key and scientific meaning. |
| Change a field's scientific meaning, data type, or requiredness | Create a new template version/field, preview affected records, then deliberately move the active binding. Existing records remain pinned until separately migrated. |
| Move a category | Use a migration after checking descendants and public navigation. Cycles and archived parents are rejected. Records keep their own classification and history. |
| Remove a wrong choice | Reclassify or archive affected active records through normal review; archive its category/type binding, then archive unused leaf categories or types. Do not hard-delete structure. |
| Correct a stable key or slug | Treat as identity/URL migration, not a simple rename. Create a corrected entry and plan record migration plus redirects/aliases where needed. |

The database lifecycle guards reject hard deletion, stable-key mutation, cyclic parenting, mismatched active templates, and archival while non-archived records or active dependencies remain. Application authorization and publication checks still apply; database guards are a second line of defense, not a replacement for them.

## Provisional starter catalog and pairings

This menu is a design proposal, not a final geological classification. All six top-level categories are collection headings (`recordsAllowed: false`); the listed subcategories accept records (`recordsAllowed: true`). A teacher explicitly selects the applicable subcategory. The interface must not silently choose the first child. A later reviewed structure may allow records directly on a parent category.

| Category | Subcategory | Allowed record types | Characteristic information in the type-specific form |
| --- | --- | --- | --- |
| Stratigraphy and geological units | Lithostratigraphic units | Geologic unit profile; Unit occurrence | Formal/source name and rank, age, lithology, defining source; for an occurrence, exposure and observed contact/location |
| Stratigraphy and geological units | Stratigraphic sections | Measured section | Section locality, measured thickness, interval/layer descriptions, measurement method, source |
| Rocks and minerals | Sedimentary rocks | Rock material profile; Rock specimen; Outcrop observation | Rock name, texture/composition and identification basis; specimen provenance or outcrop location when applicable |
| Rocks and minerals | Igneous and metamorphic rocks | Rock material profile; Rock specimen; Outcrop observation | Rock name, texture/composition, metamorphic or igneous interpretation and identification basis |
| Rocks and minerals | Minerals | Mineral profile; Mineral specimen; Mineral occurrence | Mineral identification and evidence; specimen collection details or occurrence host rock and locality when applicable |
| Fossils | Invertebrate body fossils | Fossil occurrence; Fossil specimen | Identification and confidence, host unit and age, locality policy; specimen repository/catalogue when applicable |
| Fossils | Vertebrate body fossils | Fossil occurrence; Fossil specimen | The fossil evidence above, with additional location-sensitivity review before public display |
| Fossils | Microfossils | Fossil occurrence; Fossil specimen | Assemblage/taxon, sampled interval and preparation or slide details, host unit and age |
| Fossils | Trace fossils | Fossil occurrence; Fossil specimen | Trace identification, host bed/unit, interpretation and documentation of the observed or collected material |
| Structural geology | Folds | Mapped structural feature; Structural measurement | Feature geometry, orientation, observed versus interpreted status, source; measurement method and values when applicable |
| Structural geology | Faults and shear zones | Mapped structural feature; Structural measurement | Fault/shear evidence, geometry, sense of movement and confidence where known; measurement values when applicable |
| Structural geology | Joints and fractures | Mapped structural feature; Structural measurement | Fracture set, orientation, spacing/condition and observation locality, where measured |
| Hydrogeology | Springs | Water-point profile; Water observation | Site and public-location policy, aquifer/host unit if known; dated discharge or chemistry observation with method and units |
| Hydrogeology | Wells | Water-point profile; Water observation | Site, well construction/interval if known, aquifer; dated level or quality observation with method and units |
| Hydrogeology | Aquifers | Aquifer profile | Named/defined aquifer, constituent units, extent, hydraulic evidence and supporting source |
| Surface geology and landforms | Quaternary and other surficial deposits | Surficial unit profile; Outcrop observation | Deposit material, landform/context, relative or measured age, mapped extent or exposure, source |
| Surface geology and landforms | Karst and erosional landforms | Landform profile; Outcrop observation | Feature type, morphology, host rock, process interpretation, public-location policy and source |

These are permitted category/type pairings, not one record for every row and not a claim that each feature exists at a particular Kurdistan locality. Reused types such as `Outcrop observation` may share a stable type identity but use different approved templates for different pairings. A type represents a named entity, observed occurrence, held specimen, or dated measurement. External works belong in References; managed publications belong in Research; geological maps belong to Map Layers with source, scale, coordinate system, rights, and version. Cross-disciplinary facts are linked rather than copied.

The subject areas are informed by the [Iraq Geological Survey map and formation overview](https://ibgm-iq.org/ibgm/index.php/ibgm/article/view/263), [Kurdistan biostratigraphy and fossil evidence](https://ibgm-iq.org/ibgm/index.php/ibgm/article/view/476), [Kurdistan folds and fractures study](https://ibgm-iq.org/ibgm/index.php/ibgm/article/view/497), [Kurdistan mineral-resource survey](https://ibgm-iq.org/ibgm/index.php/ibgm/article/view/241), [Kurdistan spring/aquifer research](https://www.mdpi.com/94668), and [Kurdistan geomorphology study](https://ibgm-iq.org/ibgm/index.php/ibgm/article/view/394). Those sources do not publish or endorse this menu or its pairings.

## Release gate for the starter catalog

Before the proposed starter structure is treated as production-approved, geology reviewers must confirm its categories, pairings, field templates, evidence requirements, sensitive-location handling, and English/Kurdish/Arabic labels. Never edit an already-applied starter migration. Production may contain the approved structure while retaining zero geological records. Category and record publication require an approved, rights-cleared primary image; video and additional-image requirements remain type/evidence-policy decisions. Drafts may remain incomplete. Do not invent geological examples or translate scientific terms automatically to make the menu look complete.
