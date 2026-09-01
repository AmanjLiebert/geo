import { fieldObservations, locations, records, research } from "./mock-data";

export const homeUpdates = [
  ...records.map((record) => ({
    id: record.recordId,
    title: record.name,
    type: record.recordType,
    place: record.locality,
    summary: record.summary,
    image: record.image,
    href: `/explore/${record.category}/${record.slug}`,
  })),
  ...fieldObservations.slice(0, 4).map((observation, index) => ({
    id: `GK-FD-00${index + 6}`,
    title: observation.title,
    type: observation.type,
    place: observation.location,
    summary: observation.note,
    image: observation.image,
    href: "/field",
  })),
];

export const collectionHighlights = [
  {
    slug: "geological-places",
    name: "Geological Places",
    href: "/maps",
    recordCount: locations.length,
    image: {
      src: "/images/atlas/rawandiz-valley.jpg",
      alt: "Wide view across the Rawandiz valley and surrounding layered mountains",
      caption: "Explore geological localities through the regional map",
    },
  },
  {
    slug: "field-observations",
    name: "Field Observations",
    href: "/field",
    recordCount: fieldObservations.length,
    image: {
      src: "/images/atlas/gali-ali-beg.jpg",
      alt: "Gali Ali Beg waterfall flowing through a rocky mountain gorge",
      caption: "Read visible structures, water and landscape processes in place",
    },
  },
  {
    slug: "research-library",
    name: "Research Library",
    href: "/research",
    recordCount: research.length,
    image: {
      src: "/images/atlas/rawandiz-road.jpg",
      alt: "Road passing beneath exposed layered cliffs in the Rawandiz area",
      caption: "Connect archive records with studies, methods and field context",
    },
  },
] as const;

export const shopProducts = [
  { name: "Ammonite study cast", type: "Fossil object", price: "18,000 IQD", image: "/images/catalog/ammonite.jpg", alt: "Ammonite fossil study object" },
  { name: "Zagros fold map", type: "Map print", price: "12,000 IQD", image: "/images/atlas/zagros-satellite.jpg", alt: "Satellite view of the folded Zagros mountain belt" },
  { name: "Calcite specimen", type: "Mineral object", price: "22,000 IQD", image: "/images/catalog/calcite.jpg", alt: "Translucent calcite crystal specimen" },
  { name: "Field notebook", type: "Field tool", price: "9,000 IQD", image: "/images/catalog/fieldwork.jpg", alt: "Geologist recording observations beside an outcrop" },
  { name: "Fold structure print", type: "Learning print", price: "14,000 IQD", image: "/images/catalog/folded-strata.jpg", alt: "Folded bands visible in a rock specimen" },
  { name: "Rawandiz field poster", type: "Landscape print", price: "16,000 IQD", image: "/images/atlas/rawandiz-canyon.jpg", alt: "Layered cliffs at Rawandiz Canyon" },
];
