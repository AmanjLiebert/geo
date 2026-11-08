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

function categoryPath(
  slug: string,
  categories: Map<string, PublicCategory>,
): string[] {
  const path: string[] = [];
  const visited = new Set<string>();
  let current = categories.get(slug);
  while (current && !visited.has(current.slug)) {
    visited.add(current.slug);
    path.push(current.slug);
    current = current.parentSlug
      ? categories.get(current.parentSlug)
      : undefined;
  }
  return path;
}

function recordRouteSlug(record: PublicRecordSummary): string {
  return record.slug ?? record.publicId;
}

function mediaFromRecord(record: PublicRecordSummary): MediaAsset {
  if (!record.image) {
    return {
      src: "",
      alt: "",
      caption: "No public image is available for this record.",
    };
  }
  return {
    src: record.image.viewEndpoint,
    alt: record.image.altText ?? "",
    caption:
      record.image.caption ??
      record.image.description ??
      "Published record image",
    credit: record.image.credit ?? record.image.licence ?? undefined,
  };
}

function readableValue(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  if (Array.isArray(value)) {
    const values = value.filter(
      (item): item is string | number | boolean =>
        typeof item === "string" ||
        typeof item === "number" ||
        typeof item === "boolean",
    );
    return values.length ? values.join(", ") : null;
  }
  return null;
}

function referencePresentation(
  reference: PublicRecordDetail["references"][number],
): ContentReference {
  const authors = reference.authors.join(", ");
  const year = reference.year ? ` (${reference.year})` : "";
  const sourceType = reference.sourceType.replaceAll("_", " ");
  const source = [
    sourceType,
    reference.publication,
    reference.identifier,
    reference.pagesOrFigure,
    reference.rightsStatement ? `Rights: ${reference.rightsStatement}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return {
    label: `${authors ? `${authors}${year}. ` : ""}${reference.title}`,
    detail: source,
    href: reference.url ?? undefined,
  };
}

function publicPoint(
  geometry: unknown,
): { latitude: number; longitude: number } | null {
  if (!geometry || typeof geometry !== "object" || Array.isArray(geometry))
    return null;
  const candidate = geometry as { type?: unknown; coordinates?: unknown };
  if (candidate.type !== "Point" || !Array.isArray(candidate.coordinates))
    return null;
  const [longitude, latitude] = candidate.coordinates;
  if (
    typeof latitude !== "number" ||
    typeof longitude !== "number" ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }
  return { latitude, longitude };
}

function formatPublicCoordinate(value: number): string {
  return value.toFixed(5).replace(/\.?0+$/, "");
}

export function mapPublicCategories(
  categories: PublicCategory[],
): GeologicalCategory[] {
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
    eyebrow: category.parentSlug
      ? "Geological subcollection"
      : "Geological collection",
    description:
      category.summary ??
      category.description ??
      "No public summary is available yet.",
    recordCount: category.recordCount,
    image: category.image
      ? {
          src: category.image.viewEndpoint,
          alt: "",
          caption: `${category.name} collection image`,
        }
      : missingCategoryImage(category.name),
    overview:
      category.description ??
      category.summary ??
      "No public description is available yet.",
    facts: [
      { label: "Published records", value: String(category.recordCount) },
    ],
    themes: children.get(category.slug) ?? [],
    relatedCategorySlugs: [],
  }));
}

export function mapPublicRecord(
  record: PublicRecordSummary,
  categories: PublicCategory[],
): GeologicalRecord {
  const categoryMap = new Map(
    categories.map((category) => [category.slug, category]),
  );
  const path = categoryPath(record.category.slug, categoryMap);
  return {
    slug: recordRouteSlug(record),
    name: record.title,
    category: record.category.slug,
    categoryPath: path,
    categoryTrail: [...path]
      .reverse()
      .map((slug) => categoryMap.get(slug)?.name)
      .filter((name): name is string => Boolean(name)),
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
): {
  record: GeologicalRecord;
  detail: GeologicalRecordDetail;
  gallery: MediaAsset[];
} {
  const record = mapPublicRecord(detail, categories);
  const firstLocation = detail.locations.find(
    (location) => location.label || location.regionLabel,
  );
  record.description =
    detail.description ?? "No public description is available yet.";
  record.locality = firstLocation?.label ?? "";
  record.region = firstLocation?.regionLabel ?? "";
  record.sourceNote = detail.references.length
    ? `${detail.references.length} ${detail.references.length === 1 ? "source" : "sources"}`
    : "No references are displayed for this record.";

  const fieldItems = detail.fields.flatMap((field) => {
    const value = readableValue(field.value);
    return value
      ? [
          {
            label: field.unit ? `${field.label} (${field.unit})` : field.label,
            value,
          },
        ]
      : [];
  });
  const locationItems = detail.locations.flatMap((location, index) => {
    const name = [location.label, location.regionLabel]
      .filter(
        (value, position, values): value is string =>
          Boolean(value) && values.indexOf(value) === position,
      )
      .join(", ");
    const visibility =
      location.visibility === "public"
        ? "exact public point"
        : location.visibility === "approximate"
          ? "general public area"
          : location.visibility === "region_only"
            ? "region only"
            : "location hidden";
    const facts = name
      ? [{ label: `Location ${index + 1}`, value: `${name} · ${visibility}` }]
      : [];
    const point = ["public", "approximate"].includes(location.visibility)
      ? publicPoint(location.geometry)
      : null;
    if (point) {
      facts.push({
        label: "Public coordinates",
        value: `${formatPublicCoordinate(point.latitude)}, ${formatPublicCoordinate(point.longitude)}`,
      });
    }
    if (location.visibility === "approximate" && location.precisionMetres) {
      facts.push({
        label: "Public precision",
        value: `About ${location.precisionMetres.toLocaleString()} metres`,
      });
    }
    return facts;
  });
  const references = detail.references.map(referencePresentation);
  const sections: GeologicalRecordDetail["sections"] = [];
  if (fieldItems.length)
    sections.push({
      kind: "facts",
      title: "Key facts",
      items: fieldItems,
    });
  if (locationItems.length) {
    sections.push({
      kind: "facts",
      title: "Where it was recorded",
      items: locationItems,
    });
  }
  if (references.length) {
    sections.push({ kind: "references", title: "Sources", items: references });
  }

  return {
    record,
    detail: { recordSlug: record.slug, sections, related: [] },
    gallery: record.image.src ? [record.image] : [],
  };
}

export function emptyPublicRecordDetail(
  record: GeologicalRecord,
): GeologicalRecordDetail {
  return { recordSlug: record.slug, sections: [], related: [] };
}
