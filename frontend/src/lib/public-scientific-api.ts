const PUBLIC_API_PREFIX = "/api/v1/public/scientific";
const PUBLIC_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PUBLIC_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class PublicScientificApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "PublicScientificApiError";
  }
}

export interface PublicImagePresentation {
  viewEndpoint: string;
  caption?: string | null;
  description?: string | null;
  altText?: string | null;
  licence?: string | null;
  credit?: string | null;
}

export interface PublicCategory {
  slug: string;
  parentSlug: string | null;
  name: string;
  summary: string | null;
  description: string | null;
  recordsAllowed: boolean;
  recordCount: number;
  locale: "en";
  image: Pick<PublicImagePresentation, "viewEndpoint"> | null;
}

export interface PublicRecordSummary {
  publicId: string;
  slug: string | null;
  title: string;
  summary: string | null;
  category: { slug: string; name: string };
  recordType: string;
  locale: "en";
  publishedAt: string | null;
  updatedAt: string;
  image: PublicImagePresentation | null;
}

export interface PublicRecordDetail extends PublicRecordSummary {
  description: string | null;
  fields: Array<{ label: string; dataType: string; unit: string | null; value: unknown }>;
  locations: Array<{
    label: string | null;
    visibility: "public" | "approximate" | "region_only" | "hidden";
    regionLabel: string | null;
    precisionMetres: number | null;
    geometry: unknown;
  }>;
  references: Array<{
    sourceType: string;
    authors: string[];
    title: string;
    publication: string | null;
    year: number | null;
    identifier: string | null;
    pagesOrFigure: string | null;
    url: string | null;
    rightsStatement: string | null;
    evidenceKind: string;
  }>;
  media: Array<{
    id: string;
    kind: "image" | "document" | "video";
    purpose: string;
    caption: string | null;
    description: string | null;
    altText: string | null;
    isPrimary: boolean;
    rightsStatement: string;
    licence: string | null;
    credit: string | null;
    viewEndpoint: string | null;
  }>;
  relatedRecords: Array<{
    publicId: string;
    slug: string | null;
    title: string;
    summary: string | null;
    category: { slug: string; name: string };
    recordType: string;
    relationshipType: string;
    notes: string | null;
    image: PublicImagePresentation | null;
  }>;
}

interface PublicList<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isPublicImage(value: unknown, detailed: boolean): value is PublicImagePresentation | null {
  if (value === null) return true;
  if (!isObject(value) || typeof value.viewEndpoint !== "string") return false;
  if (!value.viewEndpoint.startsWith(`${PUBLIC_API_PREFIX}/`) || value.viewEndpoint.includes("?")) {
    return false;
  }
  if (!detailed) return true;
  return ["caption", "description", "altText", "licence", "credit"].every(
    (key) => value[key] === undefined || isNullableString(value[key]),
  );
}

function isPublicCategory(value: unknown): value is PublicCategory {
  return (
    isObject(value) &&
    typeof value.slug === "string" &&
    PUBLIC_SLUG.test(value.slug) &&
    (value.parentSlug === null ||
      (typeof value.parentSlug === "string" && PUBLIC_SLUG.test(value.parentSlug))) &&
    typeof value.name === "string" &&
    isNullableString(value.summary) &&
    isNullableString(value.description) &&
    typeof value.recordsAllowed === "boolean" &&
    isNonNegativeInteger(value.recordCount) &&
    value.locale === "en" &&
    isPublicImage(value.image, false)
  );
}

function isPublicRecordSummary(value: unknown): value is PublicRecordSummary {
  return (
    isObject(value) &&
    typeof value.publicId === "string" &&
    PUBLIC_ID.test(value.publicId) &&
    (value.slug === null || (typeof value.slug === "string" && PUBLIC_SLUG.test(value.slug))) &&
    typeof value.title === "string" &&
    isNullableString(value.summary) &&
    isObject(value.category) &&
    typeof value.category.slug === "string" &&
    PUBLIC_SLUG.test(value.category.slug) &&
    typeof value.category.name === "string" &&
    typeof value.recordType === "string" &&
    value.locale === "en" &&
    isNullableString(value.publishedAt) &&
    typeof value.updatedAt === "string" &&
    isPublicImage(value.image, true)
  );
}

function isPublicRecordDetail(value: unknown): value is PublicRecordDetail {
  if (!isObject(value) || !isPublicRecordSummary(value) || !isNullableString(value.description)) {
    return false;
  }
  if (
    !Array.isArray(value.fields) ||
    !Array.isArray(value.locations) ||
    !Array.isArray(value.references) ||
    !Array.isArray(value.media) ||
    !Array.isArray(value.relatedRecords)
  ) {
    return false;
  }
  const fieldsValid = value.fields.every(
    (field) =>
      isObject(field) &&
      typeof field.label === "string" &&
      typeof field.dataType === "string" &&
      isNullableString(field.unit) &&
      Object.hasOwn(field, "value"),
  );
  const locationsValid = value.locations.every(
    (location) =>
      isObject(location) &&
      isNullableString(location.label) &&
      ["public", "approximate", "region_only", "hidden"].includes(
        typeof location.visibility === "string" ? location.visibility : "",
      ) &&
      isNullableString(location.regionLabel) &&
      (location.precisionMetres === null || isNonNegativeInteger(location.precisionMetres)),
  );
  const referencesValid = value.references.every(
    (reference) =>
      isObject(reference) &&
      typeof reference.sourceType === "string" &&
      Array.isArray(reference.authors) &&
      reference.authors.every((author) => typeof author === "string") &&
      typeof reference.title === "string" &&
      isNullableString(reference.publication) &&
      (reference.year === null || isNonNegativeInteger(reference.year)) &&
      isNullableString(reference.identifier) &&
      isNullableString(reference.pagesOrFigure) &&
      (reference.url === null ||
        (typeof reference.url === "string" && reference.url.startsWith("https://"))) &&
      isNullableString(reference.rightsStatement) &&
      typeof reference.evidenceKind === "string",
  );
  const mediaValid = value.media.every(
    (item) =>
      isObject(item) &&
      typeof item.id === "string" &&
      PUBLIC_ID.test(item.id) &&
      ["image", "document", "video"].includes(typeof item.kind === "string" ? item.kind : "") &&
      typeof item.purpose === "string" &&
      isNullableString(item.caption) &&
      isNullableString(item.description) &&
      isNullableString(item.altText) &&
      typeof item.isPrimary === "boolean" &&
      typeof item.rightsStatement === "string" &&
      isNullableString(item.licence) &&
      isNullableString(item.credit) &&
      (item.viewEndpoint === null ||
        (typeof item.viewEndpoint === "string" &&
          item.viewEndpoint.startsWith(`${PUBLIC_API_PREFIX}/`) &&
          !item.viewEndpoint.includes("?"))),
  );
  const relatedValid = value.relatedRecords.every(
    (related) =>
      isObject(related) &&
      typeof related.publicId === "string" &&
      PUBLIC_ID.test(related.publicId) &&
      (related.slug === null ||
        (typeof related.slug === "string" && PUBLIC_SLUG.test(related.slug))) &&
      typeof related.title === "string" &&
      isNullableString(related.summary) &&
      isObject(related.category) &&
      typeof related.category.slug === "string" &&
      PUBLIC_SLUG.test(related.category.slug) &&
      typeof related.category.name === "string" &&
      typeof related.recordType === "string" &&
      typeof related.relationshipType === "string" &&
      isNullableString(related.notes) &&
      isPublicImage(related.image, true),
  );
  return fieldsValid && locationsValid && referencesValid && mediaValid && relatedValid;
}

function validateList<T>(
  value: unknown,
  itemValidator: (item: unknown) => item is T,
): PublicList<T> {
  if (
    !isObject(value) ||
    !Array.isArray(value.items) ||
    !value.items.every(itemValidator) ||
    !isNonNegativeInteger(value.total) ||
    !isNonNegativeInteger(value.limit) ||
    !isNonNegativeInteger(value.offset)
  ) {
    throw new PublicScientificApiError("Published collection data is unavailable.", 502);
  }
  return value as unknown as PublicList<T>;
}

function internalApiBaseUrl(): string {
  return (
    process.env.API_INTERNAL_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    "http://localhost"
  ).replace(/\/$/, "");
}

async function request(path: string): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`${internalApiBaseUrl()}${path}`, {
      cache: "no-store",
      headers: { accept: "application/json" },
    });
  } catch {
    throw new PublicScientificApiError("Published collection data is unavailable.", 503);
  }
  if (!response.ok) {
    throw new PublicScientificApiError(
      response.status === 404 ? "Published content was not found." : "Published collection data is unavailable.",
      response.status,
    );
  }
  try {
    return await response.json();
  } catch {
    throw new PublicScientificApiError("Published collection data is unavailable.", 502);
  }
}

export async function listPublicCategories(): Promise<PublicCategory[]> {
  const value = await request(`${PUBLIC_API_PREFIX}/categories?limit=100&locale=en`);
  return validateList(value, isPublicCategory).items;
}

export async function listPublicRecords(category?: string): Promise<PublicRecordSummary[]> {
  if (category && !PUBLIC_SLUG.test(category)) {
    throw new PublicScientificApiError("Published content was not found.", 404);
  }
  const items: PublicRecordSummary[] = [];
  let offset = 0;
  let total = 0;
  do {
    const categoryQuery = category ? `&category=${encodeURIComponent(category)}` : "";
    const value = await request(
      `${PUBLIC_API_PREFIX}/records?limit=100&offset=${offset}&locale=en${categoryQuery}`,
    );
    const page = validateList(value, isPublicRecordSummary);
    items.push(...page.items);
    total = page.total;
    offset += page.items.length;
    if (page.items.length === 0 && offset < total) {
      throw new PublicScientificApiError("Published collection data is unavailable.", 502);
    }
  } while (offset < total);
  return items;
}

export async function getPublicRecord(publicId: string): Promise<PublicRecordDetail> {
  if (!PUBLIC_ID.test(publicId)) {
    throw new PublicScientificApiError("Published content was not found.", 404);
  }
  const value = await request(
    `${PUBLIC_API_PREFIX}/records/${encodeURIComponent(publicId)}?locale=en`,
  );
  if (!isPublicRecordDetail(value)) {
    throw new PublicScientificApiError("Published collection data is unavailable.", 502);
  }
  return value;
}

export const publicScientificValidators = {
  category: isPublicCategory,
  recordSummary: isPublicRecordSummary,
  recordDetail: isPublicRecordDetail,
};
