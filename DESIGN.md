# Geo-Kurdistan Design Context

## Product and audience

Geo-Kurdistan is a public geological showcase used by visitors, students, and geology teachers to browse collections, records, places, and reviewed research. The current build validates information architecture with realistic mock content before backend work begins.

## Experience principles

1. Scientific hierarchy before decoration: title, context, evidence, and actions must be immediately distinguishable.
2. Exploration without losing place: collection, record, image, and research navigation preserve context and make the exit obvious.
3. Compact, not compressed: use the available viewport efficiently while protecting readable line lengths and 44px interaction targets.
4. One connected action language: functional controls use the shared bordered, hard-shadow action system and consistent hover, focus, active, and disabled states.
5. Geological character through material: restrained strata colours, documentary imagery, mono metadata, and paper-like surfaces create identity without excessive effects.

## Visual language

- Direction: modern geological field archive; Neo-scientific structure with clean Material-style organization.
- Signature motif: limestone paper panels, carbon rules and shadows, iron accents, ochre labels, and shale evidence surfaces.
- Typography: readable sans for prose and display headings; Plex Mono for metadata, labels, counts, and controls.
- Card grammar: limestone surface, 2px carbon border, 5px radius, 4px carbon hard shadow. Use cards for meaningful grouped objects, not every nested region.
- Motion: brief positional or shadow feedback only; respect `prefers-reduced-motion`.

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
