import type {
  PublicCategory,
  PublicRecordDetail,
  PublicRecordSummary,
} from "@/lib/public-scientific-api";
import type {
  ContentReference,
  GeologicalCategory,
  GeologicalRecord,
  GeologicalRecordDetail,
  MediaAsset,
} from "./types";

const missingCategoryImage = (name: string): MediaAsset => ({
  src: "",
  alt: "",
  caption: `No public image is available for ${name}.`,
});

function categoryPath(slug: string, categories: Map<string, PublicCategory>): string[] {
  const path: string[] = [];
  const visited = new Set<string>();
  let current = categories.get(slug);
  while (current && !visited.has(current.slug)) {
    visited.add(current.slug);
    path.push(current.slug);
    current = current.parentSlug ? categories.get(current.parentSlug) : undefined;
  }
  return path;
}

function recordRouteSlug(record: PublicRecordSummary): string {
  return record.slug ?? record.publicId;
}

function mediaFromRecord(record: PublicRecordSummary): MediaAsset {
  if (!record.image) {
    return { src: "", alt: "", caption: "No public image is available for this record." };
  }
  return {
    src: record.image.viewEndpoint,
    alt: record.image.altText ?? "",
    caption: record.image.caption ?? record.image.description ?? "Published record image",
    credit: record.image.credit ?? record.image.licence ?? undefined,
  };
}

function readableValue(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    const values = value.filter(
      (item): item is string | number | boolean =>
        typeof item === "string" || typeof item === "number" || typeof item === "boolean",
    );
    return values.length ? values.join(", ") : null;
  }
  return null;
}

function referencePresentation(reference: PublicRecordDetail["references"][number]): ContentReference {
  const authors = reference.authors.join(", ");
  const year = reference.year ? ` (${reference.year})` : "";
  const source = [reference.publication, reference.identifier, reference.pagesOrFigure]
    .filter(Boolean)
    .join(" · ");
  return {
    label: `${authors ? `${authors}${year}. ` : ""}${reference.title}`,
    detail: source || reference.sourceType,
    href: reference.url ?? undefined,
  };
}

export function mapPublicCategories(categories: PublicCategory[]): GeologicalCategory[] {
  const children = new Map<string, string[]>();
  categories.forEach((category) => {
    if (!category.parentSlug) return;
    children.set(category.parentSlug, [
      ...(children.get(category.parentSlug) ?? []),
      category.name,
    ]);
  });
  return categories.map((category) => ({
    slug: category.slug,
    parentSlug: category.parentSlug ?? undefined,
    name: category.name,
    eyebrow: category.parentSlug ? "Geological subcollection" : "Geological collection",
    description:
      category.summary ?? category.description ?? "No public summary is available yet.",
    recordCount: category.recordCount,
    image: category.image
      ? {
          src: category.image.viewEndpoint,
          alt: "",
          caption: `${category.name} collection image`,
        }
      : missingCategoryImage(category.name),
    overview:
      category.description ?? category.summary ?? "No public description is available yet.",
    facts: [{ label: "Published records", value: String(category.recordCount) }],
    themes: children.get(category.slug) ?? [],
    relatedCategorySlugs: [],
  }));
}

export function mapPublicRecord(
  record: PublicRecordSummary,
  categories: PublicCategory[],
): GeologicalRecord {
  const categoryMap = new Map(categories.map((category) => [category.slug, category]));
  return {
    slug: recordRouteSlug(record),
    name: record.title,
    category: record.category.slug,
    categoryPath: categoryPath(record.category.slug, categoryMap),
    recordType: record.recordType,
    recordId: record.publicId,
    summary: record.summary ?? "No public summary is available yet.",
    description: "",
    locality: "",
    region: "",
    status: "Published",
    publishedAt: record.publishedAt ?? undefined,
    image: mediaFromRecord(record),
    sourceNote: "Published scientific record",
  };
}

export function mapPublicRecordDetail(
  detail: PublicRecordDetail,
  categories: PublicCategory[],
): { record: GeologicalRecord; detail: GeologicalRecordDetail; gallery: MediaAsset[] } {
  const record = mapPublicRecord(detail, categories);
  const firstLocation = detail.locations.find(
    (location) => location.label || location.regionLabel,
  );
  record.description = detail.description ?? "No public description is available yet.";
  record.locality = firstLocation?.label ?? "";
  record.region = firstLocation?.regionLabel ?? "";
  record.sourceNote = detail.references.length
    ? `${detail.references.length} verified ${detail.references.length === 1 ? "source" : "sources"}`
    : "No verified references are displayed for this record.";

  const fieldItems = detail.fields.flatMap((field) => {
    const value = readableValue(field.value);
    return value
      ? [{ label: field.unit ? `${field.label} (${field.unit})` : field.label, value }]
      : [];
  });
  const locationItems = detail.locations.flatMap((location) => {
    const value = location.label ?? location.regionLabel;
    if (!value) return [];
    const suffix = location.visibility === "approximate" ? " (approximate)" : "";
    return [{ label: "Location", value: `${value}${suffix}` }];
  });
  const references = detail.references.map(referencePresentation);
  const sections: GeologicalRecordDetail["sections"] = [];
  if (fieldItems.length) sections.push({ kind: "facts", title: "Record details", items: fieldItems });
  if (locationItems.length) {
    sections.push({ kind: "facts", title: "Published location", items: locationItems });
  }
  if (references.length) {
    sections.push({ kind: "references", title: "Verified sources", items: references });
  }

  return {
    record,
    detail: { recordSlug: record.slug, sections, related: [] },
    gallery: record.image.src ? [record.image] : [],
  };
}

export function emptyPublicRecordDetail(record: GeologicalRecord): GeologicalRecordDetail {
  return { recordSlug: record.slug, sections: [], related: [] };
}
