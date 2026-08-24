# Geo-Kurdistan --- Showcase Build Specification for Codex

## 0. Purpose of This Document

This document is the working specification for the **Geo-Kurdistan**
frontend showcase.

The current goal is **not to build the production backend, database,
authentication, AI, payment system, or complete CMS**.

The immediate goal is to build a polished, realistic **frontend
showcase** that the geology teachers/client can review.

The showcase must be detailed enough that the client can understand how
the final platform will feel and how users will explore geological
information.

The showcase should use **realistic mock data** based on the information
we already know about the project. It should be structured in a way that
can later be connected to a real API/database without redesigning the
whole UI.

### Important

This showcase is the design/UX validation stage.

Do not make major assumptions about the final database structure when
the teachers have not yet supplied the complete catalogue data.

Use mock data for now, but structure it carefully and consistently.

After the client reviews and accepts the showcase, the backend/database
structure can be finalized around the approved UI and the actual
geological data.

------------------------------------------------------------------------

# 1. Project Context

Geo-Kurdistan is a public geological knowledge platform focused on the
geology and natural geological heritage of the Kurdistan Region.

The platform is intended to allow visitors to:

-   Explore geological items
-   Explore categories and subcategories
-   Learn about rocks, minerals, fossils and geological formations
-   Discover geological locations
-   Explore geological maps
-   Read geological research
-   Explore field observations/gallery material
-   Browse a future shop
-   Eventually interact with Geo AI
-   Search geological information

The website should feel like a serious scientific/public knowledge
platform, but it should still be understandable and attractive to normal
visitors.

It is **not** intended to look like a generic ecommerce website, generic
corporate dashboard, or ordinary blog.

------------------------------------------------------------------------

# 2. Current Design Direction

The client has accepted the general direction of the latest
Neo/Scientific concept.

Reference concept:

-   Clean neo-scientific visual language
-   Strong editorial layouts
-   Natural geological imagery
-   Organized sections
-   Large typography where appropriate
-   Simple, confident navigation
-   Scientific diagrams/illustrations can be used when useful
-   Subtle geological visual language
-   Natural colors inspired by rocks, earth, sand, minerals, water and
    vegetation
-   Avoid extremely saturated artificial colors
-   Avoid making every section a different bright color
-   Avoid excessive glassmorphism
-   Avoid excessive gradients
-   Avoid making the interface look like a children's educational
    website
-   Avoid over-decoration
-   Avoid turning every section into a huge visual experiment

The latest reference image uses an illustrated/neo-scientific style with
geological scenes, fieldwork, maps, research and exploration.

The final implementation should take the **design principles** from that
direction rather than blindly copying the exact screenshot.

### Visual goal

The first impression should be:

> "This is a serious geological platform, but it is modern, interesting
> and easy to explore."

The user should feel increasingly impressed as they scroll and discover
the content.

The website should not try to create a "WOW" effect by putting
everything on the first screen.

The first screen should be strong and clear.

The rest of the homepage should progressively reveal the platform.

------------------------------------------------------------------------

# 3. Main UX Principle

The homepage should work as a **guided introduction to the entire
platform**.

It should not contain every piece of information.

It should:

1.  Introduce Geo-Kurdistan
2.  Create curiosity
3.  Present one or two important geological discoveries/stories
4.  Introduce the major categories
5.  Show the geological map experience
6.  Preview research
7.  Preview field observations/gallery
8.  Preview the shop near the bottom
9.  Provide a clear path into deeper pages

Every section should have a reason to exist.

Do not add sections simply to fill empty space.

------------------------------------------------------------------------

# 4. Homepage Structure

Build the homepage as a long, carefully composed scrolling experience.

Recommended order:

1.  Navigation
2.  Hero
3.  Featured geological discovery/story
4.  Explore geological categories
5.  Geological map preview
6.  Research preview
7.  Field/gallery preview
8.  Shop preview
9.  Geo AI / future capability preview
10. Final exploration CTA
11. Footer

The exact visual treatment can be adjusted while implementing, but the
information architecture should remain coherent.

------------------------------------------------------------------------

# 5. Navigation

The navigation should be simple and professional.

Suggested primary navigation:

-   Explore
-   Maps
-   Research
-   Field
-   Shop
-   About

Additional utility actions:

-   Search
-   Language
-   Login
-   Ask Geo AI

Do not overcrowd the navbar.

The navbar should remain visually quiet so the hero remains the main
focus.

### Responsive behavior

Desktop:

-   Logo
-   Main navigation
-   Utility actions

Tablet:

-   Reduce spacing
-   Keep important navigation items

Mobile:

-   Logo
-   Search if space allows
-   Menu button

Use a proper mobile navigation drawer/menu instead of squeezing desktop
navigation into mobile.

------------------------------------------------------------------------

# 6. HERO --- HIGHEST PRIORITY

The hero is one of the most important parts of the showcase.

Do not make the hero look like a generic landing-page hero.

Do not put every feature of the website inside the hero.

Do not create a huge collection of cards, buttons and statistics above
the fold.

The hero should communicate:

> Geo-Kurdistan is a place where visitors can explore the geology of
> Kurdistan.

### Hero content

Possible headline direction:

**Explore the geology of Kurdistan.**

Supporting text should explain the platform in one or two short lines.

Example:

> Discover the rocks, minerals, fossils, formations, landscapes and
> geological history of the Kurdistan Region.

Primary CTA:

**Start Exploring**

Secondary CTA:

**Explore the Map**

### Hero visual

The hero should contain one strong geological visual.

Possible directions:

-   Realistic geological landscape
-   Geological formation with visible layers
-   Aerial geological terrain
-   Stylized scientific geological landscape
-   Real geological structure combined with subtle scientific
    annotations
-   A geological cross-section integrated into a natural landscape
-   A carefully composed field/geology scene

Avoid:

-   Generic mountains
-   Generic stock-looking landscape
-   Random scientists standing in front of mountains
-   Huge laboratory machines unless the section specifically requires
    them
-   Too many objects
-   Cartoon characters
-   Overly futuristic sci-fi interfaces
-   Visual clutter

The image should feel like it belongs specifically to a geological
knowledge platform.

The visual should support the text rather than compete with it.

### Hero composition

Prioritize:

-   Strong hierarchy
-   Large readable headline
-   Short description
-   1--2 clear CTAs
-   One strong geological visual
-   Plenty of breathing room

The hero should look excellent on both desktop and mobile.

------------------------------------------------------------------------

# 7. Featured Geological Discovery

Immediately after the hero, introduce a strong geological
discovery/story.

This should not be a huge list.

Use one main featured item.

Example mock content:

### Featured Discovery

**The folded landscapes of the Kurdistan Region**

Short description:

> Explore how sedimentary layers, tectonic forces, uplift and erosion
> shaped the mountain structures visible across the region.

Metadata examples:

-   Structural Geology
-   Kurdistan Region
-   Geological Formation

CTA:

**Explore the discovery**

The visual should be large enough to create interest.

This section is where the website can begin moving from introduction
into actual geological content.

------------------------------------------------------------------------

# 8. Explore by Category

The platform has the following main geological categories:

-   Geological Items
-   Rocks
-   Minerals
-   Fossils
-   Geological Formations
-   Other

The teachers confirmed that categories can have their own
subcategories/types.

### Important category behavior

A category is not simply a visual card.

Each category should eventually have its own page.

Category page should contain:

1.  Category title
2.  Short explanation of the category
3.  Category-specific visual
4.  Subcategories/types
5.  Number of records
6.  Featured records
7.  Explore/listing section
8.  Search/filter controls where appropriate

### Category card

Homepage category cards should show:

-   Image/visual
-   Category name
-   Very short description
-   Record count if useful
-   Explore CTA

Do not show huge amounts of metadata on the homepage.

### Mock category examples

Rocks:

> Explore documented rock types and geological materials from the
> Kurdistan Region.

Minerals:

> Discover minerals recorded across the region, their properties and
> geological settings.

Fossils:

> Explore fossil records and evidence of ancient life preserved in
> Kurdistan's geological history.

Geological Formations:

> Discover named geological formations, their locations, ages and
> characteristics.

------------------------------------------------------------------------

# 9. Category Page Concept

Category pages are important because the client specifically wants
visitors to explore categories.

Example:

## Fossils

Intro:

> Fossils preserve evidence of ancient life and help us understand the
> geological history of the region.

Then:

### Fossil Types

Example mock types:

-   Ammonites
-   Trilobites
-   Bivalves
-   Gastropods
-   Other Fossils

These are **mock examples only** until the teachers provide the official
classification/data.

Then:

### Explore Fossils

Cards/list items should show information appropriate to fossils.

Example:

-   Image
-   Name
-   Type
-   Geological age/period
-   Location
-   Short description

The exact displayed metadata can differ by category.

Do not force the same card structure onto every geological category if
the information is scientifically different.

------------------------------------------------------------------------

# 10. Item Detail Page

An item is a detailed geological record.

The known item fields include:

-   Name
-   Category
-   Description
-   Geological Age
-   Location
-   Region
-   Formation
-   Discovery Information
-   Scientific Classification
-   Images
-   Videos
-   References

Different categories may later have additional category-specific fields.

### Item detail layout

Top area:

-   Breadcrumb
-   Category
-   Item name
-   Short description
-   Main image
-   Key metadata
-   Location

Then:

1.  Overview
2.  Geological information
3.  Classification
4.  Formation/context
5.  Discovery information
6.  Image gallery
7.  Video
8.  Related items
9.  References
10. Map/location

The top of the page should contain the information visitors most likely
need first.

Do not place every field above the fold.

------------------------------------------------------------------------

# 11. Item Gallery

The gallery should feel like a scientific specimen/field documentation
viewer.

Support in the UI concept:

-   Large image
-   Thumbnail navigation
-   Fullscreen viewing
-   Zoom where appropriate
-   Image captions
-   Image metadata if available

Video should appear as a separate media block rather than being mixed
randomly into the image gallery.

Use realistic mock images.

------------------------------------------------------------------------

# 12. Related Items

The teachers liked the concept of related geological records, but the
exact relationships have not been finalized.

Therefore, implement the UI flexibly.

Possible relationships:

-   Related geological formations
-   Related items
-   Same region
-   Same geological period
-   Same location
-   Related research

Use mock relationships for the showcase.

Do not permanently assume that an item can belong to multiple
categories.

That database rule is still being clarified.

------------------------------------------------------------------------

# 13. Search

The teachers want visitors to be able to search by:

-   Name
-   Location
-   Geological age
-   Formation

Create a clear global search experience.

The search should feel like a major platform feature.

Example placeholder:

> Search formations, rocks, fossils, minerals, locations or research...

Search results can be mocked.

Results can include:

-   Geological items
-   Formations
-   Research
-   Locations

------------------------------------------------------------------------

# 14. Filters

Do not create a giant universal filter system.

Filtering should be **context-aware**.

For example:

A category may provide filters that make sense specifically for that
category.

Possible examples:

Rocks:

-   Rock type
-   Geological age
-   Region
-   Formation

Fossils:

-   Fossil type
-   Geological period
-   Region
-   Formation

Formations:

-   Geological age
-   Region
-   Formation type

These are examples for the UI showcase, not final scientific rules.

The frontend should make it easy to change or remove filters later.

------------------------------------------------------------------------

# 15. Sorting

Sorting is not required everywhere.

Use sorting only where it improves exploration.

Possible examples:

-   Newest records
-   Oldest geological age
-   Alphabetical
-   Recently added

Do not add unnecessary sorting controls just because they are common on
websites.

------------------------------------------------------------------------

# 16. Geological Map

A map is an important part of the platform.

The teachers confirmed they want a map.

The homepage should contain a **preview** of the map rather than trying
to reproduce the entire map application.

Example section:

### Explore the geology on the map

Show:

-   Map
-   Several geological locations/markers
-   One selected location card
-   Location name
-   Short description
-   Geological period/category
-   View record CTA

Example mock location:

**Qulqula Anticline**

Short description:

> A well-exposed structural feature showing folded sedimentary layers.

The full map should have its own page.

------------------------------------------------------------------------

# 17. Research

The platform will publish research.

Research types include:

-   Scientific research papers
-   Geological studies
-   Articles
-   Reports
-   Publications
-   Diploma research
-   Doctoral research

### Research fields

Each research publication may contain:

-   Title
-   Author(s)
-   Date
-   Abstract/summary
-   Category
-   Related geological items
-   Related location/region
-   Full research document
-   Images
-   References

### Research exploration

The teachers confirmed:

-   Search
-   Categories

are useful.

The research area should have its own dedicated page.

### Research detail page

Top:

-   Research title
-   Author(s)
-   Date
-   Category
-   Short summary
-   Related topics/location

Primary action:

**Read Research**

The final production system should be designed so research is read on
the website and is **not offered as a normal downloadable file**.

For the showcase, demonstrate the reading experience rather than
building document security/download prevention as a backend feature.

------------------------------------------------------------------------

# 18. Research Reader Concept

The research reader should feel like a serious academic reading
environment.

Possible structure:

-   Title
-   Author
-   Publication information
-   Abstract
-   Table of contents
-   Main text
-   Figures/images
-   References
-   Related geological records

Keep the reader readable.

Avoid making it look like a generic PDF viewer if the goal is an
integrated platform reading experience.

------------------------------------------------------------------------

# 19. Field Gallery

The project can contain field observations and geological field imagery.

The homepage should preview this content.

Example:

### From the field

Show:

-   Large field photograph
-   Location
-   Short description
-   Date
-   Field note/category

CTA:

**Explore the Field Gallery**

The dedicated field/gallery page can later contain a larger collection.

------------------------------------------------------------------------

# 20. Shop

The project will include a shop page.

The teachers did not yet provide enough detail about exact product
categories.

Therefore:

-   Create a dedicated Shop page
-   Use realistic but clearly mock product data
-   Do not invent a final product catalogue
-   Keep the structure flexible
-   Show a small shop preview near the bottom of the homepage

The shop should not dominate the geological platform.

Possible mock products can be related to the project's
educational/geological theme.

Use labels such as:

-   Educational
-   Geological
-   Field
-   Publication
-   Merchandise

only if useful for the showcase.

Do not assume these are the final product categories.

------------------------------------------------------------------------

# 21. Geo AI

Geo AI is a future capability.

The project may eventually use an AI API such as OpenAI or Gemini.

The intended concept is that AI could answer questions using:

1.  The Geo-Kurdistan database
2.  External knowledge/search where appropriate
3.  Potentially approved/reference material

The exact AI architecture is not part of this showcase.

For now, only create the UX concept.

Example:

### Ask Geo AI

> Ask about a geological term, formation, fossil, mineral, location or
> research topic.

The UI should clearly communicate that Geo AI is an assistant for
exploring the platform.

Do not build fake AI functionality that pretends to have access to the
real database.

Use a clearly mocked/demo state if necessary.

------------------------------------------------------------------------

# 22. About Page

Create a simple About page concept.

It should explain:

-   What Geo-Kurdistan is
-   The purpose of the platform
-   Geological knowledge of the Kurdistan Region
-   The educational/scientific purpose
-   Contributors/academic context if supplied later

Do not invent institutional claims.

Use placeholder/mock content where exact information has not yet been
provided.

------------------------------------------------------------------------

# 23. Languages

Primary language:

**English**

Potential additional languages:

-   Kurdish
-   Arabic

The UI should be designed with future localization in mind.

Do not build the complete translation system unless required for the
showcase.

However:

-   Avoid hardcoding text in ways that make future translation
    difficult.
-   Consider longer translated strings.
-   Make the layout flexible enough for Kurdish/Arabic.
-   Keep RTL support in mind.

------------------------------------------------------------------------

# 24. Admin Concept

The production system will eventually have a super admin and
teacher/admin users.

Super admin capabilities may include:

-   Add geological item
-   Edit item
-   Delete item
-   Add category
-   Edit category
-   Upload images
-   Upload videos
-   Add references
-   Manage users
-   Manage premium accounts
-   Publish research
-   Manage shop products
-   Manage orders
-   Publish announcements

Teacher/admin users should primarily manage geological content rather
than general platform/business features.

The showcase does **not** need a complete admin dashboard.

Only build admin UI if it is useful for demonstrating the future
workflow.

------------------------------------------------------------------------

# 25. Premium

Premium is currently **not part of the core showcase**.

The client agreed that a premium system may be inappropriate for the
initial platform because this is a specialized geological knowledge
website rather than a daily-use entertainment platform.

Premium may be reconsidered later.

Do not design the homepage around premium.

Do not add fake premium locks to geological knowledge.

------------------------------------------------------------------------

# 26. Data Strategy for the Showcase

Because the teachers have not yet supplied the complete final catalogue,
use a dedicated mock-data layer.

Do not scatter fake data throughout components.

Create structured mock data that resembles future database/API
responses.

Example conceptual structure:

``` text
mockData/
├── categories
├── subcategories
├── geologicalItems
├── formations
├── locations
├── research
├── fieldRecords
├── shopProducts
└── relatedContent
```

The exact folder/file naming can follow the existing project
architecture.

The important thing is separation between:

-   UI components
-   mock data
-   page composition
-   future API integration

------------------------------------------------------------------------

# 27. Mock Data Quality

Mock data should feel realistic.

Avoid:

-   "Lorem ipsum"
-   "Test Item 1"
-   "Sample Rock"
-   Random meaningless numbers
-   Obviously fake descriptions
-   Repeating the same image everywhere

Use realistic geological names, descriptions, metadata and
relationships.

However, do not present uncertain scientific facts as confirmed final
catalogue data.

Mock examples should be treated as demonstration content.

------------------------------------------------------------------------

# 28. Recommended Mock Content

Create enough content to demonstrate the platform without pretending to
have the complete catalogue.

Suggested quantity:

### Categories

6 main categories.

### Each major category

Several mock subcategories/types.

### Geological items

Approximately 12--20 strong mock records.

### Formations

Approximately 6--10 mock records.

### Locations

Approximately 6--10 mock locations.

### Research

Approximately 6--8 mock publications.

### Field records

Approximately 6--10 mock observations.

### Shop

Approximately 6--8 mock products.

This is enough to make listing pages feel real.

------------------------------------------------------------------------

# 29. Image Strategy

Use strong geological visuals.

Priority:

1.  Real geological landscape photography
2.  Real rock/mineral/fossil imagery
3.  Geological maps
4.  Scientific diagrams
5.  Carefully designed illustrations

Avoid using one image repeatedly.

Each major homepage section should have its own visual identity.

Image crops must be intentional.

Do not stretch or distort images.

Use consistent aspect ratios for cards.

Use larger editorial images for featured stories.

------------------------------------------------------------------------

# 30. Icons

Use a consistent professional icon system.

Icons should communicate:

-   Rocks
-   Minerals
-   Fossils
-   Formations
-   Maps
-   Research
-   Fieldwork
-   Search
-   Location
-   Geological layers
-   Calendar/time
-   References
-   Gallery
-   Video
-   Explore

Do not mix multiple unrelated icon styles.

Avoid decorative icons that do not communicate anything.

Icons should support the content hierarchy.

------------------------------------------------------------------------

# 31. Neo Style Rules

The neo style should be controlled.

Use:

-   Clear panels
-   Thin borders
-   Slight visual separation
-   Strong typography
-   Editorial compositions
-   Natural imagery
-   Subtle geological textures
-   Small scientific labels
-   Clean spacing
-   Controlled asymmetry

Avoid:

-   Excessive rounded cards everywhere
-   Excessive shadows
-   Huge glowing effects
-   Neon colors
-   Too many gradients
-   Excessive floating elements
-   Excessive animations
-   Overloaded dashboards

The interface should feel designed by someone who understands geology
and information architecture.

------------------------------------------------------------------------

# 32. Natural Color Direction

The final palette should be based on natural geological environments.

Potential visual families:

-   Rock/stone
-   Sand/earth
-   Clay
-   Forest/vegetation
-   Mineral tones
-   Water
-   Neutral paper/background tones

The exact palette is not locked yet.

Do not force one color to every component.

Use color purposefully:

-   Primary actions
-   Category identification
-   Scientific metadata
-   Map markers
-   Status/labels

The overall interface should remain calm and readable.

------------------------------------------------------------------------

# 33. Typography

Typography should create a scientific/editorial identity.

Use:

-   Strong display typography for major headings
-   Highly readable body typography
-   Clear hierarchy
-   Comfortable reading width
-   Good line height

Avoid using several unrelated fonts.

Do not make every heading huge.

The hierarchy should come from:

-   Size
-   Weight
-   Spacing
-   Layout
-   Supporting labels

------------------------------------------------------------------------

# 34. Responsive Design

The showcase must be responsive from the beginning.

### Desktop

Use the full editorial composition.

### Tablet

Recompose sections rather than simply shrinking everything.

### Mobile

Prioritize:

-   Hero readability
-   Navigation usability
-   Category exploration
-   Important metadata
-   Image quality
-   Simple cards
-   Vertical flow

Do not simply hide half the desktop content.

The mobile layout should feel intentionally designed.

------------------------------------------------------------------------

# 35. Animation

Animation should be subtle.

Useful:

-   Image reveal
-   Section entrance
-   Hover states
-   Small arrow movement
-   Map marker interaction
-   Gallery transitions
-   Navigation transitions

Avoid:

-   Constant movement
-   Large parallax effects everywhere
-   Slow loading animations
-   Excessive scroll-triggered effects

The content is the star.

------------------------------------------------------------------------

# 36. Component Strategy

Build reusable components.

Examples:

``` text
Navbar
Hero
SectionHeader
FeaturedDiscovery
CategoryCard
CategoryGrid
GeologicalItemCard
ResearchCard
FieldRecordCard
FormationCard
MapPreview
SearchBar
FilterBar
Gallery
MetadataList
RelatedContent
ShopProductCard
CTASection
Footer
```

Components should accept data through props rather than hardcoding
individual pages.

------------------------------------------------------------------------

# 37. Pages for Showcase

At minimum, create a believable navigation flow for:

``` text
/
 /explore
 /explore/rocks
 /explore/minerals
 /explore/fossils
 /explore/formations
 /explore/[item]
 /maps
 /research
 /research/[research]
 /field
 /shop
 /about
```

If the current framework uses another routing convention, follow the
framework's standard structure.

The goal is not to finish every production feature.

The goal is to make the showcase navigable and believable.

------------------------------------------------------------------------

# 38. Homepage Section Quality Standard

Every homepage section must answer:

### Why is this here?

### What does the visitor learn?

### Where can the visitor go next?

### Why does the visual belong to this section?

If a section cannot answer those questions, simplify or remove it.

------------------------------------------------------------------------

# 39. Important UX Principle: Do Not Show Everything

The homepage is not a database dump.

Do not show:

-   Every category
-   Every research item
-   Every map feature
-   Every field record
-   Every product
-   Every geological item

Instead:

**Homepage = introduction + strongest examples + pathways.**

Dedicated pages = detailed exploration.

------------------------------------------------------------------------

# 40. Showcase Acceptance Goal

The showcase should allow the teachers/client to answer:

1.  Does this feel like Geo-Kurdistan?
2.  Does the homepage communicate the project's purpose?
3.  Is the geological content organized naturally?
4.  Does category exploration make sense?
5.  Does an item page feel useful?
6.  Does research feel like part of the same platform?
7.  Does the map experience make sense?
8.  Does the field gallery fit the platform?
9.  Does the shop feel secondary but connected?
10. Does the overall design feel professional and scientific?
11. Does it work on mobile?
12. Are there places where the geological information needs to be
    changed?

The showcase is successful if the teachers can point at the interface
and say:

> "Yes, this is how we want visitors to explore our geological
> knowledge."

------------------------------------------------------------------------

# 41. What NOT To Do Yet

Do not spend the showcase stage building:

-   Production database
-   Full backend API
-   Authentication system
-   Real payment integration
-   Real AI integration
-   Production admin permissions
-   Complete order processing
-   Final research document security
-   Final catalogue relationships
-   Final scientific taxonomy
-   Final filtering rules

These should come after the showcase and after the teachers provide the
complete data.

------------------------------------------------------------------------

# 42. Technical Direction

The project is planned around a modern web application.

Frontend:

-   React / Next.js direction
-   Component-based architecture
-   Responsive UI
-   SEO-friendly page structure
-   Reusable components
-   Mock-data-first development

Next.js is preferred for the public-facing website because SEO is
important for a geological knowledge platform.

Backend will be developed separately after the showcase requirements and
data structure are sufficiently confirmed.

Do not create unnecessary backend dependencies just to make the showcase
work.

------------------------------------------------------------------------

# 43. SEO Mindset

Even during the showcase, structure pages as real content pages.

Use meaningful:

-   Page titles
-   Headings
-   Descriptions
-   URLs
-   Semantic content structure

Examples:

``` text
/geology/rocks
/geology/fossils
/geology/formations
/research
/maps
/field
```

The exact route names can be adjusted to the implementation.

------------------------------------------------------------------------

# 44. Final Implementation Principle

Build this as if the UI will eventually become the real product.

But do not pretend the unknown data is final.

That means:

-   High-quality UI
-   Realistic mock data
-   Reusable components
-   Flexible data structures
-   Clear navigation
-   Strong responsive behavior
-   No unnecessary backend complexity
-   No fake production functionality
-   Easy future API integration

The showcase should be polished enough for a client review, but flexible
enough to change after the teachers provide their complete geological
data.

------------------------------------------------------------------------

# 45. Final Direction to Codex

When implementing this specification:

1.  First inspect the existing project structure.
2.  Do not destroy working code unnecessarily.
3.  Establish the visual system and reusable components first.
4.  Create the mock-data layer.
5.  Build the navbar.
6.  Build the hero carefully.
7.  Build the homepage sections in the intended order.
8.  Build the main exploration/category flow.
9.  Build representative item, research, map, field and shop pages.
10. Make everything responsive.
11. Review the entire experience visually.
12. Fix spacing, typography, hierarchy, image crops and consistency.
13. Keep the design clean and natural.
14. Do not over-style the interface.
15. Do not invent final scientific requirements that have not been
    confirmed.

The most important priorities are:

**1. Hero quality**

**2. Overall visual hierarchy**

**3. Geological category exploration**

**4. Realistic mock content**

**5. Consistent component system**

**6. Responsive design**

**7. Client-review-ready polish**

The final result should feel like a real public geological knowledge
platform, not a generic AI-generated website template.
