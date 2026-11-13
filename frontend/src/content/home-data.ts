import { fieldObservations, records } from "./mock-data";
import { products } from "./showcase-data";

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

export const shopProducts = products.map((product) => ({
  slug: product.slug,
  name: product.name,
  type: product.category,
  price: product.price,
  image: product.image.src,
  alt: product.image.alt,
}));
