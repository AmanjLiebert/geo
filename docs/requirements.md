# Geo-Kurdistan showcase requirements

## 1. Purpose

The showcase must demonstrate a coherent visitor journey with realistic mock content so geology teachers can validate structure and user experience before backend and database work begins.

It should be complete enough to discuss navigation, content hierarchy, category differences, relationships, and research reading, while remaining flexible enough to change quickly.

## 2. Scope

### In scope

- Visitor-facing responsive frontend
- English-language showcase content
- Realistic mock geological, research, map, gallery, and product examples
- Major navigation and page concepts
- Category-specific exploration patterns
- Flexible item detail presentations
- Search and contextual filter demonstrations
- A visual interactive-map concept
- A read-only research-document viewer concept
- SEO-friendly page architecture
- Internationalization-ready boundaries

### Out of scope

- Backend services, API endpoints, or database connections
- Final relational schema, Prisma models, or migrations
- Authentication, authorization, or account management
- Functional admin tools
- AI question answering
- Premium access
- Payments, checkout, or order processing
- Production-grade map infrastructure
- Production research-document protection
- A finalized commerce catalog

## 3. Global experience requirements

The showcase must:

- Communicate a scientific, credible, modern identity
- Avoid generic corporate and university-template aesthetics
- Use clear hierarchy and progressive disclosure
- Work at representative desktop and mobile widths
- Use reusable components and data-driven rendering
- Keep mock content outside route presentation where practical
- Provide meaningful empty, loading, and no-result states where interactions are demonstrated
- Use accessible semantic markup, keyboard-accessible controls, visible focus states, useful alternative text, and sufficient contrast
- Keep major content pages indexable and provide useful page titles and descriptions
- Label prototype-only or future concepts honestly

## 4. Proposed visitor navigation

The primary navigation should prioritize:

1. Explore
2. Maps
3. Research
4. Field gallery, if the content concept proves useful
5. Shop
6. About

Home should be available through the site identity. Search should be a prominent global action rather than competing with every primary destination.

The final wording and ordering must be validated during the showcase review.

## 5. Homepage

The homepage should be a curated entry point, not an all-purpose dashboard.

It should demonstrate:

1. A focused hero with a clear explanation of Geo-Kurdistan
2. One important or featured geological discovery
3. An overview of geological categories
4. A restrained selection of featured geological records
5. An interactive-map preview
6. A research preview
7. Geological or field highlights
8. A small featured-products preview near the lower part of the page
9. A complete footer with platform, exploration, and trust links

Every major preview should lead to a dedicated browsing or detail experience. Section count and order are subject to visual prototyping.

## 6. Explore and category pages

The Explore landing page should introduce the geological scope and make category differences understandable.

Each category page should include:

- Category name and concise introduction
- Visual identity or representative imagery
- A visible record count based on mock data
- A clear way to browse records
- Record cards appropriate to that category
- Contextual search or filters that are genuinely useful for that category

Category pages must not be rendered as generic database tables. Shared layout components may be used, but category configuration must allow different filter controls, card metadata, terminology, and optional content sections.

Example category-specific showcase filters may include:

- Fossils: fossil group, geological period, region, preservation type
- Rocks: rock class, texture, region, geological age
- Minerals: mineral group, crystal system, occurrence region
- Formations: geological age, lithology, region

These examples are hypotheses for domain review, not finalized taxonomies.

## 7. Geological item details

An item page should compose only the sections relevant to that record. It may include:

- Large primary image
- Name and category
- Geological period or age
- Location and region
- Short summary
- Structured main information
- Image gallery
- Video
- Scientific classification
- Discovery information
- Formation context
- References
- Related content

The page should prioritize comprehension rather than display every available field at equal weight.

The showcase should include varied examples across multiple categories to demonstrate that:

- Fields can differ by category
- Some sections may be absent
- Structured facts and narrative explanation can coexist
- References remain visible and understandable

## 8. Related content

The item and research experiences should demonstrate useful relationships such as:

- Related geological records
- Records from the same region
- Records associated with the same formation
- Research connected to a record or place

Relationship labels should explain why content is related. The mock-data implementation must not imply a finalized database relationship model.

## 9. Search

Visitors should be able to search by concepts currently agreed with the client:

- Name
- Location
- Geological age
- Formation

The experience should begin simple and allow visitors to narrow results with contextual controls. It should not expose one enormous universal filter form.

Search results should clearly show result type and enough context to distinguish records, research, locations, and formations where those content types are included.

## 10. Maps

The showcase should present a visual, interactive geological-map concept using example records and locations.

It should demonstrate:

- Discoverable map markers or regions
- A connection between map selections and record previews
- A way to move from a map result to item detail
- Useful behavior at desktop and mobile widths
- Honest prototype labeling where map data or interactions are simulated

It must not require a production spatial backend.

## 11. Research

Research requires its own browsing experience rather than being treated as another geological item category.

Supported showcase types may include:

- Scientific research papers
- Geological studies
- Articles
- Reports
- Publications
- Diploma research
- Doctoral or PhD research

A research record may include:

- Title
- Authors
- Publication date
- Abstract or summary
- Research category or type
- Related geological records
- Related location or region
- Images
- References
- A full document representation

Visitors should be able to browse and search research by title or keyword and narrow by category or type.

The document-reader concept should:

- Support comfortable online reading
- Provide document structure and navigation
- Avoid presenting a normal download action
- Clearly state that the showcase is a read-only experience
- Avoid claims that browser content is impossible to copy

## 12. Field gallery

If included, the field gallery should provide a visual route into geological places, fieldwork, outcrops, and heritage. It should not duplicate the main item catalog.

The showcase review should determine whether this deserves a primary navigation destination, a homepage section, or integration into Explore and Maps.

## 13. Shop

The shop should have a dedicated lightweight concept page and a small homepage preview.

Use only a few generic geological-related mock products. The showcase may demonstrate product discovery and detail presentation, but it must not implement:

- Checkout
- Payment collection
- Orders
- Inventory management
- Customer accounts

Unknown product categories should remain configurable rather than encoded as a complex taxonomy.

## 14. About and trust

The About experience should explain:

- The platform mission
- Its Kurdistan Region focus
- The role of geology teachers and domain experts
- The intended editorial or review approach
- How references and research support trust

Names, institutional affiliations, or governance claims should not be invented.

## 15. Content and mock-data requirements

Mock data should:

- Be realistic enough for meaningful teacher review
- Include multiple records in several geological categories
- Demonstrate optional and category-specific fields
- Include references and relationship examples
- Avoid unsupported claims presented as verified facts
- Be clearly replaceable by a later API or content source

Frontend types should represent prototype display needs. They must not be described as final persistence entities.

## 16. Internationalization readiness

The showcase is English-first, but architecture should prepare for Kurdish and potentially Arabic by:

- Centralizing interface copy where practical
- Avoiding layout assumptions tied to English string length
- Keeping locale-aware routing possible
- Avoiding left/right-only styling where logical alternatives are practical
- Planning for right-to-left layout and mixed-script content
- Separating translated labels from geological identifiers and source data

A translation system does not need to be fully installed in the first scaffold.

## 17. Responsive and accessibility requirements

At minimum, key journeys should be reviewed at mobile, tablet, and desktop widths.

The showcase should support:

- Keyboard navigation
- Screen-reader-friendly headings and landmarks
- Text alternatives for informative images
- Accessible names for icon controls
- Reduced-motion preferences for nonessential animation
- Controls sized for touch use
- Responsive media and readable line lengths

## 18. Technical requirements

- Next.js App Router
- TypeScript strict mode
- Modern React
- Component-based feature organization
- Server Components by default; Client Components only for interaction
- Route metadata and semantic HTML for SEO
- Optimized images where appropriate
- Mock content accessed through a small repository or query boundary
- No frontend dependency on a backend service during the showcase
- No secrets committed to source control
- Lint and production build commands must pass

## 19. Showcase acceptance criteria

The showcase will be ready for teacher review when:

- A visitor can understand the platform purpose from the homepage
- Major destinations are easy to discover
- Several categories demonstrate genuinely different exploration needs
- Item pages demonstrate optional and category-specific content
- Search can be evaluated without an overwhelming universal filter
- Map, research reading, related content, gallery, and shop concepts can be reviewed
- Desktop and mobile journeys are coherent
- Mock data is visibly realistic and replaceable
- Prototype limitations are communicated honestly
- The team can record clear answers to the open validation questions

## 20. Questions for teacher validation

The showcase should help answer:

- Are the six main geological categories correct and understandable?
- Is “Geological Items” a useful category name or an umbrella concept?
- Which subtypes and filters matter within each category?
- Which facts are required, recommended, or irrelevant for each item type?
- Which geological relationships are most meaningful to visitors?
- How should geological age, location, region, and formation terminology be presented?
- Which search paths match how teachers and visitors look for information?
- Should the field gallery be a primary destination?
- Which research types and metadata are required?
- What document-reading restrictions and rights apply to each research source?
- What products, if any, belong in the initial shop?
- What editorial review and citation standards should the platform communicate?
- Which content must be available in Kurdish or Arabic first?

Answers should be documented before final schema and backend design.

