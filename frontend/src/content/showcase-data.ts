import type {
  CategoryFilterDefinition,
  FieldStory,
  GeologicalRecordDetail,
  ResearchDocument,
  ShopProduct,
} from "./types";

const credit = "Open-license image · source details in attribution file";

const images = {
  canyon: { src: "/images/atlas/rawandiz-canyon.jpg", alt: "Layered cliffs inside Rawandiz Canyon", caption: "Rawandiz Canyon · field context", credit },
  ridge: { src: "/images/atlas/rawandiz-ridge.jpg", alt: "Layered ridges above the Rawandiz valley", caption: "Ridge-scale expression of resistant strata", credit },
  road: { src: "/images/atlas/rawandiz-road.jpg", alt: "Road beneath exposed rock walls in Rawandiz", caption: "Access corridor beneath a measured cliff section", credit },
  valley: { src: "/images/atlas/rawandiz-valley.jpg", alt: "Wide view across the Rawandiz valley", caption: "Valley-scale structural context", credit },
  field: { src: "/images/catalog/fieldwork.jpg", alt: "Geologist recording observations beside an outcrop", caption: "Observation before interpretation", credit },
  fold: { src: "/images/catalog/folded-strata.jpg", alt: "Tightly folded layers in a rock specimen", caption: "Fold geometry at specimen scale", credit },
  calcite: { src: "/images/catalog/calcite.jpg", alt: "Translucent calcite crystal specimen", caption: "Calcite crystal form and cleavage", credit },
  ammonite: { src: "/images/catalog/ammonite.jpg", alt: "Ammonite fossil with visible chambers", caption: "Comparative ammonite specimen", credit },
  satellite: { src: "/images/atlas/zagros-satellite.jpg", alt: "Satellite view of folded Zagros terrain", caption: "Regional fold pattern from orbit", credit },
  water: { src: "/images/atlas/gali-ali-beg.jpg", alt: "Waterfall descending through a rocky gorge", caption: "Water and exposed bedrock at Gali Ali Beg", credit },
  korek: { src: "/images/atlas/korek-mountain.jpg", alt: "Korek Mountain and its prominent ridges", caption: "Korek Mountain ridge system", credit },
  dukan: { src: "/images/atlas/dukan-dam.jpg", alt: "Dukan reservoir within a mountain basin", caption: "Dukan basin landscape", credit },
};

export const categoryFilters: Record<string, CategoryFilterDefinition[]> = {
  "geological-items": [{ key: "type", label: "Evidence type" }, { key: "region", label: "Region" }],
  formations: [{ key: "age", label: "Geological age" }, { key: "formation", label: "Formation" }, { key: "region", label: "Region" }],
  rocks: [{ key: "type", label: "Rock class" }, { key: "age", label: "Geological age" }, { key: "region", label: "Region" }],
  minerals: [{ key: "type", label: "Mineral group" }, { key: "region", label: "Occurrence region" }],
  fossils: [{ key: "type", label: "Fossil group" }, { key: "age", label: "Geological period" }, { key: "region", label: "Region" }],
  other: [{ key: "type", label: "Record type" }, { key: "region", label: "Region" }],
};

export const recordDetails: GeologicalRecordDetail[] = [
  {
    recordSlug: "rawandiz-folded-landscape",
    discovery: "The canyon is presented as an observation-led teaching locality: visible bedding and relief are separated from formation-level interpretations that still require regional expert review.",
    formationContext: "Multiple resistant sedimentary units are visible at landscape scale. The exact formation boundaries shown by individual cliffs are intentionally left provisional.",
    sections: [
      { kind: "facts", title: "Observation framework", items: [{ label: "Scale", value: "Canyon to regional landscape" }, { label: "Visible evidence", value: "Bedding, ridges, incision" }, { label: "Interpretive theme", value: "Folding, uplift and erosion" }] },
      { kind: "gallery", title: "Field atlas", images: [images.ridge, images.road, images.valley] },
      { kind: "references", title: "Sources and review", items: [{ label: "Regional interpretation", detail: "Showcase synthesis awaiting review by Kurdistan Region geology teachers." }, { label: "Base imagery", detail: "Open-license Rawandiz landscape photography; full credits are listed in the image attribution document." }] },
    ],
    related: [{ slug: "rawandiz-carbonate-rock", reason: "Same locality and exposed strata" }, { slug: "zagros-fold-pattern", reason: "Regional structural context" }, { slug: "field-sample-documentation", reason: "Field documentation method" }],
  },
  {
    recordSlug: "calcite-crystal-study",
    sections: [
      { kind: "facts", title: "Identification notes", items: [{ label: "Mineral group", value: "Carbonate" }, { label: "Crystal system", value: "Trigonal" }, { label: "Diagnostic cue", value: "Rhombohedral cleavage" }] },
      { kind: "prose", title: "How to read this specimen", body: ["A mineral record begins with observable form and physical properties. Geological age is omitted because it is not meaningful without a verified host-rock context.", "The specimen is comparative material and does not claim a Kurdistan locality."] },
      { kind: "gallery", title: "Specimen view", images: [images.calcite] },
      { kind: "references", title: "Review note", items: [{ label: "Identification", detail: "Standard mineralogical teaching description; specimen provenance remains comparative." }] },
    ],
    related: [{ slug: "vein-calcite", reason: "Same mineral in an occurrence context" }, { slug: "thin-bedded-chert", reason: "Comparative teaching specimen" }],
  },
  {
    recordSlug: "ammonite-reference",
    sections: [
      { kind: "facts", title: "Preservation record", items: [{ label: "Major group", value: "Ammonoidea" }, { label: "Evidence", value: "Coiled shell and chamber pattern" }, { label: "Provenance", value: "Comparative reference collection" }] },
      { kind: "prose", title: "Why provenance matters", body: ["The specimen demonstrates fossil-specific fields without implying a regional discovery. A future verified record would add locality, host formation and a narrower age assignment."] },
      { kind: "gallery", title: "Specimen documentation", images: [images.ammonite] },
      { kind: "references", title: "Review note", items: [{ label: "Catalogue status", detail: "Reviewed as a mock information-architecture example, not a regional occurrence claim." }] },
    ],
    related: [{ slug: "rudist-carbonate-context", reason: "Marine fossil comparison" }, { slug: "carbonate-cliff-section", reason: "Potential carbonate host context" }],
  },
  {
    recordSlug: "field-sample-documentation",
    discovery: "This is a method record: it demonstrates how an observation keeps its locality, orientation, scale and original notes connected before a sample enters a collection.",
    sections: [
      { kind: "facts", title: "Minimum field record", items: [{ label: "Before collection", value: "Location, scale and in-place photograph" }, { label: "At collection", value: "Sample ID and orientation" }, { label: "After collection", value: "Notes, images and custody" }] },
      { kind: "gallery", title: "Documentation context", images: [images.field, images.canyon] },
      { kind: "references", title: "Method status", items: [{ label: "Protocol", detail: "A general geological workflow shown for teacher discussion; it is not a finalized institutional protocol." }] },
    ],
    related: [{ slug: "rawandiz-folded-landscape", reason: "Example field locality" }, { slug: "outcrop-log", reason: "Related documentation method" }],
  },
  {
    recordSlug: "rawandiz-carbonate-rock",
    formationContext: "The cliff-forming carbonate character is visible, while composition and named formation remain dependent on verified sampling and field correlation.",
    sections: [
      { kind: "facts", title: "Outcrop observations", items: [{ label: "Material", value: "Carbonate rock · provisional" }, { label: "Structure", value: "Bedded" }, { label: "Landscape role", value: "Resistant cliff former" }] },
      { kind: "gallery", title: "Outcrop context", images: [images.ridge, images.canyon] },
      { kind: "references", title: "Interpretive limit", items: [{ label: "Formal classification", detail: "Requires field sampling and teacher verification before publication." }] },
    ],
    related: [{ slug: "rawandiz-folded-landscape", reason: "Same landscape context" }, { slug: "carbonate-cliff-section", reason: "Comparable exposure" }],
  },
  {
    recordSlug: "zagros-fold-pattern",
    sections: [
      { kind: "facts", title: "Remote-sensing reading", items: [{ label: "Scale", value: "Regional" }, { label: "Primary pattern", value: "Elongated, repeated ridges" }, { label: "Verification", value: "Field correlation required" }] },
      { kind: "gallery", title: "Regional evidence", images: [images.satellite, images.korek] },
      { kind: "references", title: "Image source", items: [{ label: "Orbital image", detail: "NASA public-domain satellite imagery; see the attribution document." }] },
    ],
    related: [{ slug: "rawandiz-folded-landscape", reason: "Landscape-scale example within the fold belt" }, { slug: "regional-cross-section", reason: "Related interpretive method" }],
  },
];

export const researchDocuments: ResearchDocument[] = [
  {
    publicationSlug: "reading-folded-landscapes",
    readingTime: "11 minute read",
    relatedRecordSlugs: ["rawandiz-folded-landscape", "zagros-fold-pattern", "korek-ridge-observation"],
    sections: [
      { id: "orientation", title: "From landform to evidence", paragraphs: ["Folded landscapes are easiest to understand when observation and interpretation remain separate. Ridge shape, bedding traces and valley orientation are visible evidence; the sequence of tectonic events is an interpretation that must be supported by mapping and measured sections.", "The showcase uses this distinction to help public visitors ask useful questions without presenting an attractive landscape photograph as a complete geological explanation."], figure: images.satellite },
      { id: "scale", title: "Reading structure across scales", paragraphs: ["At regional scale, repeated elongated ridges suggest a structural grain. At canyon scale, bedding can be followed across slopes. At specimen scale, smaller folds reveal how competent layers responded to compression.", "None of these scales replaces the others. Their value comes from linking observations while retaining each record's provenance and uncertainty."], figure: images.fold },
      { id: "field-checks", title: "What field checks add", paragraphs: ["Orientation measurements, lithological logs and verified formation contacts test interpretations made from distant views. Photographs should retain location, direction and scale so a later reader can understand what was actually observed.", "For the teacher-review stage, the platform deliberately labels formation assignments and geological ages as provisional where the source material is not yet sufficient."], figure: images.field },
      { id: "public-reading", title: "A public reading pathway", paragraphs: ["Visitors can begin with the landscape, move to mapped places, compare related records and then open research that explains the method. This pathway is more useful than placing every technical field in the first view."] },
    ],
    references: [{ label: "Showcase editorial synthesis", detail: "Mock publication created to review navigation, evidence labels and regional relationships." }, { label: "Imagery", detail: "NASA and open-license field photography listed in the project attribution document." }],
  },
  {
    publicationSlug: "cataloguing-regional-formations",
    readingTime: "9 minute read",
    relatedRecordSlugs: ["carbonate-cliff-section", "rawandiz-folded-landscape", "rawandiz-carbonate-rock"],
    sections: [
      { id: "purpose", title: "Why a public formation record needs structure", paragraphs: ["A formation page must connect a recognized geological name with lithology, age, mapped occurrence, characteristic exposures and references. It should also distinguish verified statements from provisional showcase content.", "The visitor interface starts with the facts needed for orientation, then reveals context, evidence and citations progressively."], figure: images.canyon },
      { id: "identity", title: "Names, ages and local expressions", paragraphs: ["A formation name is not simply a category label. The same unit can look different across its mapped extent, and visually similar cliffs may belong to different units. The catalogue therefore avoids identification from appearance alone.", "Age terminology should be understandable to general visitors while preserving the reviewed scientific wording used by specialists."] },
      { id: "relationships", title: "Connecting records without fixing a database", paragraphs: ["The showcase relates formations to rocks, fossils, places and research through explicit reasons such as same locality or host context. These labels help teachers evaluate which relationships are meaningful before any final database schema is designed."], figure: images.ridge },
      { id: "review", title: "Editorial review and change", paragraphs: ["Every published claim should carry a clear source and review status. The current content model is intentionally replaceable so teacher feedback can change terminology, required fields and category boundaries without redesigning the experience."] },
    ],
    references: [{ label: "Prototype scope", detail: "Information-architecture proposal for teacher review; not a regional stratigraphic authority." }],
  },
  {
    publicationSlug: "field-observation-language",
    readingTime: "8 minute read",
    relatedRecordSlugs: ["field-sample-documentation", "gali-ali-beg-erosion", "thin-bedded-chert"],
    sections: [
      { id: "observe", title: "Observe before interpreting", paragraphs: ["A useful field note records what is visible before explaining why it formed. Colour, grain size, bed thickness, fracture orientation and spatial relationships can be described directly.", "Interpretations should be added as a separate layer with an indication of confidence and the evidence still needed."], figure: images.field },
      { id: "translation", title: "Translate without flattening the science", paragraphs: ["Public language can define technical terms in place rather than remove them. A short explanation beside the original geological term helps beginners while keeping the record useful to experienced visitors."] },
      { id: "place", title: "Keep observations connected to place", paragraphs: ["Coordinates, locality names, viewing direction and access context allow a photograph to function as evidence rather than decoration. Sensitive or unsafe locations may require a generalized public position in a later production policy."], figure: images.water },
      { id: "questions", title: "Make uncertainty productive", paragraphs: ["A pending-review label is an invitation to verify, not a weakness. The showcase uses these labels to identify exactly where teachers should correct terminology, add sources or revise an interpretation."] },
    ],
    references: [{ label: "Editorial note", detail: "Accessible field-writing example created for the Geo-Kurdistan showcase." }],
  },
];

export const fieldStories: FieldStory[] = [
  { observationSlug: "rawandiz-bedding", introduction: "A canyon-wall reading focused on the continuity and orientation of visible sedimentary beds.", sections: [{ title: "What can be seen", body: ["Resistant beds form long traces across the canyon wall, interrupted by vegetation, shadow and erosion.", "A useful observation separates visible bed geometry from the later structural interpretation."] }, { title: "Questions for a return visit", body: ["Which contacts can be followed continuously? Where can orientation be measured safely? Which units can be correlated with a verified section?"] }], gallery: [images.canyon, images.ridge, images.road], relatedRecordSlugs: ["rawandiz-folded-landscape", "rawandiz-carbonate-rock"] },
  { observationSlug: "rawandiz-ridge-lines", introduction: "A landscape-scale note on how resistant layers influence repeated mountain ridges.", sections: [{ title: "Landscape evidence", body: ["The ridge system preserves a broad structural pattern that can be compared with mapped bedding and satellite imagery."] }, { title: "Interpretive limit", body: ["Topography alone does not identify formation boundaries; field correlation remains essential."] }], gallery: [images.korek, images.satellite], relatedRecordSlugs: ["korek-ridge-observation", "zagros-fold-pattern"] },
  { observationSlug: "outcrop-log", introduction: "A practical sequence for recording an exposure before samples or photographs lose their spatial context.", sections: [{ title: "A repeatable sequence", body: ["Start with location, orientation and scale. Describe lithology and bed relationships. Record structures and weathering, then connect every photograph to the written log."] }, { title: "Why consistency matters", body: ["A repeatable order makes observations easier to compare and reveals which information is still missing."] }], gallery: [images.field, images.fold], relatedRecordSlugs: ["field-sample-documentation", "thin-bedded-chert"] },
  { observationSlug: "fold-detail", introduction: "A public geosite observation connecting flowing water, bedrock resistance and gorge-scale relief.", sections: [{ title: "Visible process", body: ["Water follows the gorge through resistant rock while weathering and transport continue to modify exposed surfaces."] }, { title: "Avoiding overclaim", body: ["A photograph can show water and bedrock relationships but cannot establish long-term erosion rates or subsurface flow paths."] }], gallery: [images.water, images.canyon], relatedRecordSlugs: ["gali-ali-beg-erosion", "mountain-spring-record"] },
  { observationSlug: "bekhal-water", introduction: "A hydrogeological observation about where water emerges within a steep mountain setting.", sections: [{ title: "Field clues", body: ["The emergence point, nearby fractures, bedding and seasonal discharge are all useful observations for a later hydrogeological interpretation."] }, { title: "Review need", body: ["The showcase does not assign a specific aquifer or flow path without verified field data."] }], gallery: [images.water, images.korek], relatedRecordSlugs: ["mountain-spring-record", "karst-cavity-observation"] },
  { observationSlug: "dukan-basin-view", introduction: "A broad view connecting reservoir geography, surrounding relief and basin-scale questions.", sections: [{ title: "Reading a wide view", body: ["Shoreline, slope form and ridge orientation provide spatial context for more detailed geological records."] }, { title: "Next evidence", body: ["Verified geological maps, measured sections and hydrological data would be needed for a fuller basin interpretation."] }], gallery: [images.dukan, images.satellite], relatedRecordSlugs: ["drainage-terrain-model", "regional-cross-section"] },
];

export const products: ShopProduct[] = [
  { slug: "ammonite-study-cast", name: "Ammonite study cast", category: "Fossil object", price: "18,000 IQD", summary: "A durable teaching cast for discussing shell geometry, chambers and fossil preservation.", description: "A classroom-scale cast inspired by a comparative ammonite specimen. The object is presented to test educational product information, not as a finalized catalogue item.", purpose: "Suitable for observation exercises where an original fossil should not be handled repeatedly.", image: images.ammonite, gallery: [images.ammonite, images.field] },
  { slug: "zagros-fold-map", name: "Zagros fold map", category: "Map print", price: "12,000 IQD", summary: "A study print highlighting repeated ridge patterns across the Zagros mountain belt.", description: "A proposed wall or desk print combining a regional satellite view with restrained educational labels.", purpose: "Supports discussion of scale, structural grain and the relationship between remote sensing and field checking.", image: images.satellite, gallery: [images.satellite, images.ridge] },
  { slug: "calcite-specimen", name: "Calcite specimen", category: "Mineral object", price: "22,000 IQD", summary: "A comparative mineral specimen for observing crystal form and cleavage.", description: "A generic teaching specimen concept. Provenance, size and grade would require a real catalogue before any future sale.", purpose: "Supports introductory mineral identification and comparison with occurrence records.", image: images.calcite, gallery: [images.calcite] },
  { slug: "field-notebook", name: "Field notebook", category: "Field tool", price: "9,000 IQD", summary: "A compact notebook concept organized around repeatable geological observations.", description: "A proposed field notebook with prompts for locality, orientation, lithology, structures, sketches and image references.", purpose: "Encourages observation-first field notes that remain useful after leaving the locality.", image: images.field, gallery: [images.field, images.road] },
  { slug: "fold-structure-print", name: "Fold structure print", category: "Learning print", price: "14,000 IQD", summary: "A close-view teaching print for comparing fold geometry at specimen and landscape scales.", description: "A study print built from an open-license deformation image with concise educational annotations.", purpose: "Helps learners identify hinge, limb and layer continuity before moving to regional examples.", image: images.fold, gallery: [images.fold, images.satellite] },
  { slug: "rawandiz-field-poster", name: "Rawandiz field poster", category: "Landscape print", price: "16,000 IQD", summary: "A layered landscape poster connecting a recognizable place with field-reading prompts.", description: "A proposed poster using the Rawandiz landscape as an entry point into bedding, relief and erosion.", purpose: "Designed for classrooms and public interpretation spaces rather than as a formal geological map.", image: images.canyon, gallery: [images.canyon, images.valley, images.road] },
];
