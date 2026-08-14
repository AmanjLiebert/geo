# Proposed frontend architecture

## Status

This is a proposal for the visitor showcase. It defines frontend boundaries and page responsibilities, not backend services or a final database model.

## Architectural approach

Use the Next.js App Router with Server Components by default. Add Client Components only where the visitor must interact with filters, search suggestions, galleries, maps, or document-reader controls.

Keep four concerns distinct:

1. Routes compose complete visitor pages.
2. Features own domain-specific user experiences such as category exploration or research reading.
3. Shared components provide reusable interface primitives and site-wide structure.
4. Mock content and repository functions supply display-ready data without exposing routes to storage details.

This boundary allows local mock data to be replaced later with API-backed repository functions without rewriting presentation components.

## Proposed source layout

    src/
      app/
        (site)/
          page.tsx
          explore/
          maps/
          research/
          field/
          shop/
          about/
          search/
        layout.tsx
        not-found.tsx
        sitemap.ts
        robots.ts
      components/
        ui/
        layout/
        media/
      features/
        geological-catalog/
        map-explorer/
        research-library/
        field-gallery/
        shop-preview/
        global-search/
      content/
        mock/
        site-copy/
      lib/
        content/
        metadata/
        i18n/
      types/

Folders should be introduced as their corresponding feature is implemented; there is no value in committing a large empty directory tree.

## Proposed routes

| Route | Responsibility |
| --- | --- |
| / | Curated homepage and entry points |
| /explore | Category overview and geological discovery |
| /explore/[category] | Category-specific introduction, filters, and records |
| /explore/[category]/[slug] | Flexible geological item detail |
| /maps | Geological map concept and place-based discovery |
| /research | Research discovery, search, and categories |
| /research/[slug] | Research overview, metadata, and related content |
| /research/[slug]/read | Read-only online document experience |
| /field | Optional field gallery concept |
| /field/[slug] | Field story or geological highlight |
| /shop | Lightweight product discovery concept |
| /shop/[slug] | Mock product details without checkout |
| /about | Mission, contributors, editorial trust, and references |
| /search | Cross-content search results with focused refinement |

Dynamic segments describe URLs only. They do not dictate database tables or entity relationships.

## Route groups and layouts

The public site can use a route group such as (site) to share the header, navigation, footer, announcement area, and global search entry without adding a URL segment.

Research reading may use a focused nested layout with fewer distractions. Map pages may use a wide layout, while catalog and editorial pages use constrained reading widths.

Locale routing can later wrap the public routes in a [locale] segment if selected during internationalization work. Interface copy and URL strategy should be reviewed before that change.

## Feature boundaries

### Geological catalog

Owns category definitions, record cards, category-specific filter configuration, item sections, references, and related-content presentation.

It should use a category registry or configuration object so shared catalog behavior does not erase meaningful differences between rocks, minerals, fossils, formations, and other records.

### Map explorer

Owns prototype marker data, selection state, geographic result previews, and links into catalog records. Map-provider selection should remain replaceable.

### Research library

Owns research cards, research metadata, category browsing, document outline, reader controls, citations, and relationships to geological content.

### Global search

Owns query parsing for the prototype, result grouping, and focused refinements. Category-page filtering remains within the geological catalog feature.

### Field gallery and shop preview

Remain intentionally lightweight until teachers validate their role and content.

## Shared component layers

- UI primitives: buttons, chips, inputs, select controls, dialogs, tabs, cards, and skeletons
- Layout: site header, navigation, page shell, section wrapper, breadcrumb, and footer
- Media: responsive image, gallery, video frame, figure caption, and attribution
- Content: fact list, reference list, rich text, empty state, related-content rail, and record count

Shared components should be extracted from repeated, proven usage rather than designed as a speculative universal system.

## Mock-data boundary

Routes and components should not import large JSON objects directly. Use small asynchronous repository functions, for example:

    listCategories()
    getCategoryBySlug(slug)
    listItems(query)
    getItemBySlug(category, slug)
    searchContent(query)
    listResearch(query)
    getResearchBySlug(slug)

During the showcase these functions read typed local fixtures. Later they can call an API while preserving stable page-facing return shapes.

Repository return types are frontend view models. They may combine or omit fields for presentation and must not be reused automatically as database models.

## Flexible geological records

Use a small common summary for navigation and cards, then compose detail sections based on record type and available data. Avoid a single interface containing dozens of optional properties.

A discriminated union or category adapter can express meaningful variants in the frontend, while a section model can handle editorial blocks such as gallery, classification, discovery, references, video, or formation context.

The prototype should test which approach remains understandable as realistic mock records are added. The result is input to later schema design, not the schema itself.

## Styling direction

Begin with design tokens for color, typography, spacing, elevation, borders, radii, and motion. Visual language should draw from geological maps, strata, mineral surfaces, field notation, and scientific publishing without becoming decorative noise.

The system should support:

- High-information layouts with calm spacing
- Strong image and caption treatment
- Consistent scientific labels and units
- Clear interactive states
- Light and dark surfaces only if both can be maintained accessibly
- Logical CSS properties where they improve future right-to-left support

## SEO and metadata

Use route-level metadata for titles, descriptions, canonical paths, and social previews. Add semantic headings, breadcrumbs, structured data only where content semantics are understood, and generated sitemap and robots files before public deployment.

Mock pages should not be indexed on a public production domain unless the team explicitly chooses to publish the prototype.

## Testing and verification

As features are added:

- Lint and type-check continuously
- Build the production bundle
- Add unit tests for configuration, filtering, and repository functions
- Add interaction tests for search, filters, gallery, map selection, and reader controls
- Review key routes at mobile, tablet, and desktop widths
- Check keyboard navigation, focus order, contrast, headings, alternative text, and reduced motion

## Recommended implementation sequence

1. Establish design tokens, site shell, and mock-content conventions
2. Build the homepage as a restrained cross-section of the platform
3. Build Explore with two or three deliberately different categories
4. Build flexible item detail examples and related content
5. Add focused search and category filters
6. Add map and research browsing concepts
7. Add the research reader
8. Evaluate field gallery and shop concepts
9. Perform responsive, accessibility, SEO, and content review
10. Record teacher feedback before any backend schema work

