export type HeroChapterId = "formations" | "rocks" | "fossils" | "minerals" | "field";

export interface HeroChapter {
  id: HeroChapterId;
  number: string;
  label: string;
  headline: string;
  introduction: string;
  href: string;
  action: string;
  image: {
    src: string;
    alt: string;
    title: string;
    caption: string;
    position?: string;
  };
  readingLens: {
    title: string;
    description: string;
    prompts: [string, string, string];
  };
  record: {
    type: string;
    title: string;
    identifier: string;
    status: string;
    metadata: [
      { label: string; value: string },
      { label: string; value: string },
    ];
  };
}

export const heroChapters: HeroChapter[] = [
  {
    id: "formations",
    number: "01",
    label: "Formations",
    headline: "Read the mountain in layers.",
    introduction: "Follow bedding, contacts and deformation to understand how individual rock units become part of a mountain belt.",
    href: "/explore/formations",
    action: "Explore formation records",
    image: {
      src: "/images/atlas/rawandiz-canyon.jpg",
      alt: "Steep sedimentary layers exposed along Rawandiz Canyon",
      title: "Layers at landscape scale",
      caption: "Rawandiz Canyon · regional field-atlas view",
      position: "center 47%",
    },
    readingLens: {
      title: "Read the structure",
      description: "A formation is interpreted through relationships visible across the exposure—not colour alone.",
      prompts: ["Trace a bed", "Compare its dip", "Find the contact"],
    },
    record: {
      type: "Landscape record",
      title: "Folded sedimentary succession",
      identifier: "GK—FM—001",
      status: "Teacher review",
      metadata: [
        { label: "Evidence", value: "Bedding + relief" },
        { label: "Scale", value: "Outcrop → regional" },
      ],
    },
  },
  {
    id: "rocks",
    number: "02",
    label: "Rocks",
    headline: "Texture records transformation.",
    introduction: "Read grain, fabric and cross-cutting features to reconstruct what a rock experienced before it reached the collection.",
    href: "/explore/rocks",
    action: "Browse the rock archive",
    image: {
      src: "/images/catalog/folded-strata.jpg",
      alt: "Banded rock crossed by a pale mineral vein",
      title: "Structure at specimen scale",
      caption: "Comparative banded-rock reference · provenance unassigned",
      position: "center",
    },
    readingLens: {
      title: "Read the material",
      description: "Textures preserve the order of mineral growth, deformation and later fractures.",
      prompts: ["Describe the fabric", "Identify the vein", "Establish sequence"],
    },
    record: {
      type: "Comparative specimen",
      title: "Banded rock with cross-cutting vein",
      identifier: "GK—RK—002",
      status: "Reference image",
      metadata: [
        { label: "Evidence", value: "Banding + vein" },
        { label: "Scale", value: "Hand specimen" },
      ],
    },
  },
  {
    id: "fossils",
    number: "03",
    label: "Fossils",
    headline: "Life, recorded in stone.",
    introduction: "Connect form, preservation and surrounding rock to understand what a fossil can—and cannot—tell us about deep time.",
    href: "/explore/fossils",
    action: "Examine fossil evidence",
    image: {
      src: "/images/catalog/ammonite.jpg",
      alt: "Polished ammonite fossil showing its internal chambers",
      title: "Life preserved as evidence",
      caption: "Ammonite reference specimen · comparative collection",
      position: "center",
    },
    readingLens: {
      title: "Read the fossil",
      description: "Classification begins with observable form; interpretation also depends on preservation and context.",
      prompts: ["Observe the form", "Check preservation", "Read the matrix"],
    },
    record: {
      type: "Fossil specimen",
      title: "Ammonite reference specimen",
      identifier: "GK—FS—005",
      status: "Comparative record",
      metadata: [
        { label: "Group", value: "Ammonoidea" },
        { label: "Age", value: "Mesozoic · unassigned" },
      ],
    },
  },
  {
    id: "minerals",
    number: "04",
    label: "Minerals",
    headline: "Crystal form reveals structure.",
    introduction: "Compare habit, cleavage and observable properties to move from a striking specimen toward a defensible identification.",
    href: "/explore/minerals",
    action: "Compare mineral specimens",
    image: {
      src: "/images/catalog/calcite.jpg",
      alt: "Translucent calcite crystal against a dark background",
      title: "Order made visible",
      caption: "Calcite crystal study · comparative collection",
      position: "center",
    },
    readingLens: {
      title: "Read the crystal",
      description: "Appearance is only the beginning. Repeatable physical properties support identification.",
      prompts: ["Describe the habit", "Test the cleavage", "Compare hardness"],
    },
    record: {
      type: "Mineral specimen",
      title: "Calcite crystal study",
      identifier: "GK—MN—004",
      status: "Reviewed mock",
      metadata: [
        { label: "System", value: "Trigonal" },
        { label: "Composition", value: "Calcium carbonate" },
      ],
    },
  },
  {
    id: "field",
    number: "05",
    label: "Fieldwork",
    headline: "Observation becomes evidence.",
    introduction: "Turn an exposed rock face into a useful record through careful observation, measurement, photography and field notes.",
    href: "/field",
    action: "Open the field notebook",
    image: {
      src: "/images/catalog/fieldwork.jpg",
      alt: "A geologist documenting an exposed rock section",
      title: "Logging an exposed rock face",
      caption: "Outcrop logging reference · comparative field locality",
      position: "center",
    },
    readingLens: {
      title: "Observe before interpreting",
      description: "A useful field record separates what was observed from what is later interpreted.",
      prompts: ["Describe what is visible", "Measure scale and orientation", "Record before inference"],
    },
    record: {
      type: "Method record",
      title: "Outcrop logging workflow",
      identifier: "GK—FD—003",
      status: "Reusable field protocol",
      metadata: [
        { label: "Sequence", value: "Observe → measure → record" },
        { label: "Capture", value: "Lithology, scale + structure" },
      ],
    },
  },
];
