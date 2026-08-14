# Geo-Kurdistan project context

## Product summary

Geo-Kurdistan is a geological knowledge platform focused on geological information, discoveries, resources, research, and geological heritage of the Kurdistan Region.

It should help both beginners and geologically knowledgeable visitors explore the region through clear explanations, rich media, research, geographic context, and meaningful relationships between records.

## Stakeholders and review audience

The client group consists of geology teachers and domain experts. They bring strong geological knowledge but are not expected to define web information architecture or interface design.

Product and design decisions should therefore translate their domain requirements into a professional web experience. The showcase should make concepts concrete enough for the teachers to review, question, and revise.

## Current phase: visitor showcase

The current deliverable is a visitor-facing showcase built with realistic mock data. It is not a production system.

The showcase is intended for review after approximately 15 days. Feedback will be used to validate or revise:

1. Information architecture
2. Content structure
3. Relationships between entities
4. Database design
5. Backend API design
6. Future administration workflows

No decision made solely for the showcase should be treated as a permanent database contract.

## Experience goals

The website should feel:

- Scientific and trustworthy
- Modern and organized
- Educational without being simplistic
- Visually interesting
- Easy for beginners to explore
- Useful to visitors with geological knowledge

The visual direction combines a clean neo-scientific character with the clarity, hierarchy, and interaction discipline commonly associated with Material-style interfaces.

The result should not feel like a generic corporate site or a generic university site. The first impression should be calm, credible, and organized; deeper exploration should reveal rich and impressive geological content.

## Product principles

### Progressive discovery

The homepage introduces the platform without attempting to display everything. Dedicated experiences should let visitors progressively explore categories, items, maps, research, field content, and shop concepts.

### Contextual exploration

Geological categories do not necessarily share the same fields or useful filters. The showcase should demonstrate category-specific exploration instead of forcing every record into one universal table or filter form.

### Flexible content modeling

Mock content should be separate from presentation code where practical. Frontend view models can describe what the showcase needs without pretending to be final Prisma or PostgreSQL models.

### Evidence and relationships

Images, video, references, scientific classification, location, formations, related records, and research should be presented where they help visitors understand an item. Relationships shown in the prototype remain hypotheses for teacher validation.

### Responsible claims

The research reader may demonstrate a read-only experience, but the platform must not claim that browser content can be made impossible to copy. Production document protection and access controls require a later technical and legal design.

### Internationalization readiness

English is the primary showcase language. Kurdish and potentially Arabic may follow. Text, layout, navigation, metadata, and content access should be structured so localization and right-to-left support can be introduced without rewriting the application.

## Geological scope

The currently agreed main categories are:

- Geological Items
- Rocks
- Minerals
- Fossils
- Geological Formations
- Other

Each category may have its own subtypes, attributes, presentation needs, and filters. These category boundaries are part of what the showcase must help validate.

An individual geological record may include, where relevant:

- Name and category
- Description
- Geological period or age
- Location and region
- Geological formation
- Discovery information
- Scientific classification
- Images and video
- References
- Related geological records

The applicable fields and their display order may vary by category.

## Major visitor areas

- Home: curated entry point and product showcase
- Explore: geological categories and records
- Maps: visual concept for geographic exploration
- Research: dedicated discovery and online-reading experience
- Field gallery: geological highlights and field media, if validated
- Shop: lightweight preview of possible geological products
- About: purpose, contributors, and editorial trust
- Search: focused discovery by name, location, geological age, and formation

This is a proposed information architecture, not a literal or final navigation list.

## Technology direction

### Current frontend

- Next.js
- TypeScript
- Modern React
- App Router and SEO-friendly rendering
- Component-based architecture
- Responsive behavior for desktop and mobile
- Realistic local mock or seed content

### Planned backend, after review

- Node.js and Express
- PostgreSQL
- Prisma

The planned backend stack is directional. Its data structures and APIs must not be designed before the showcase findings are reviewed.

## Explicitly deferred capabilities

The showcase must not implement:

- A production backend or database
- A final PostgreSQL schema or Prisma models
- Authentication or real user management
- Real admin or content-management workflows
- Geo AI
- Premium accounts or access tiers
- Payments or FIB integration
- Production document protection
- A production map data service
- A complex commerce or order system

A clearly labeled visual concept may be used only when it helps validate a future experience and cannot be mistaken for functioning production capability.

## Future concepts

### Administration

A future super admin may manage platform-wide entities and system functions. Teacher or content admins should receive a simpler editorial experience focused on geological records, categories, media, references, and research. This remains future work.

### Geo AI

A future Geo AI may answer questions using verified platform data, approved research, appropriately licensed documents, and reliable external sources. It should prioritize verified Geo-Kurdistan content and provide sources. It is not part of the current implementation.

### Premium and payments

Premium access is not planned for the initial launch. It may be reconsidered only if a sustainable visitor value emerges. Future payments may use First Iraqi Bank services, but no payment functionality belongs in the showcase.

## Source-of-truth status

This document records the current project intent. It is the baseline for the showcase, but it is deliberately open to revision after teacher review.

