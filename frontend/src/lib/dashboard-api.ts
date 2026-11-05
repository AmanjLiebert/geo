/**
 * dashboard-api.ts
 *
 * Typed frontend API module for the protected Geo-Kurdistan dashboard.
 *
 * Requirements:
 * - Uses NEXT_PUBLIC_API_BASE_URL.
 * - credentials: "include" on every request.
 * - cache: "no-store" on every request.
 * - Supports request cancellation with AbortSignal.
 * - Strict runtime validation of 200 OK responses (envelope, item arrays, numbers, allowed statuses, nullable fields).
 * - Safely categorizes 401, 403, 429, and other error statuses.
 * - Never leaks tokens, cookies, SQL, database internals, Firebase details, or stack traces.
 * - Does not use localStorage or sessionStorage.
 */

export type ScientificRecordStatus =
  "unclassified_draft" | "draft" | "in_review" | "published" | "archived";

export type DashboardRecordItem = {
  id: string;
  title: string | null;
  status: ScientificRecordStatus;
  isClassified: boolean;
  categoryName: string | null;
  primaryImageMediaAssetId: string | null;
  updatedAt: string;
};

export type DashboardRecordListResponse = {
  items: DashboardRecordItem[];
  total: number;
  limit: number;
  offset: number;
};

export type ResearchStatus = "draft" | "in_review" | "published" | "archived";

export type DashboardResearchItem = {
  id: string;
  title: string | null;
  status: ResearchStatus;
  publicationYear: number | null;
  doi: string | null;
  updatedAt: string;
};

export type DashboardResearchListResponse = {
  items: DashboardResearchItem[];
  total: number;
  limit: number;
  offset: number;
};

export type EditorialStatus = "draft" | "in_review" | "published" | "archived";

export type DashboardNewsItem = {
  id: string;
  title: string | null;
  slug: string | null;
  status: EditorialStatus;
  publishedAt: string | null;
  updatedAt: string;
};

export type DashboardNewsListResponse = {
  items: DashboardNewsItem[];
  total: number;
  limit: number;
  offset: number;
};

export type DashboardPageItem = {
  id: string;
  pageType: string;
  title: string | null;
  status: EditorialStatus;
  effectiveAt: string | null;
  publishedAt: string | null;
  updatedAt: string;
};

export type DashboardPageListResponse = {
  items: DashboardPageItem[];
  total: number;
  limit: number;
  offset: number;
};

export type StructureCategory = {
  id: string;
  parentId: string | null;
  stableKey: string;
  slug: string;
  recordsAllowed: boolean;
  position: number;
  name: string;
  description: string | null;
  locale: string;
  translationAvailable: boolean;
};

export type CategoryRecordType = {
  id: string;
  stableKey: string;
  position: number;
  name: string;
  description: string | null;
  activeTemplateVersionId: string;
  locale: string;
  translationAvailable: boolean;
};

export type FieldDataType =
  | "text"
  | "long_text"
  | "integer"
  | "decimal"
  | "boolean"
  | "date"
  | "choice"
  | "multi_choice";

export type TemplateField = {
  id: string;
  stableKey: string;
  dataType: FieldDataType;
  required: boolean;
  validation: Record<string, unknown>;
  unit: string | null;
  searchable: boolean;
  filterable: boolean;
  position: number;
  status: "active" | "deprecated";
  label: string;
  helpText: string | null;
  locale: string;
  translationAvailable: boolean;
};

export type ActiveScientificTemplate = {
  id: string;
  stableKey: string;
  name: string;
  version: {
    id: string;
    number: number;
    status: string;
  };
  fields: TemplateField[];
};

export type RecordTranslationItem = {
  locale: string;
  title: string;
  summary: string | null;
  description: string | null;
  sourceLocale?: string | null;
  status: string;
  translatorUserId?: string | null;
  reviewerUserId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ScientificRecordDetail = {
  id: string;
  stableId: string;
  slug: string | null;
  status: ScientificRecordStatus;
  categoryId: string | null;
  recordTypeId: string | null;
  templateVersionId: string | null;
  attributes: Record<string, unknown>;
  ownerUserId: string;
  createdAt: string;
  updatedAt: string;
  translations: RecordTranslationItem[];
};

export type CreateRecordPayload = {
  categoryId?: string;
  recordTypeId?: string;
  slug?: string;
  attributes?: Record<string, unknown>;
};

export type UpdateRecordPayload = {
  categoryId?: string | null;
  recordTypeId?: string | null;
  slug?: string | null;
  attributes?: Record<string, unknown>;
};

export type DashboardApiErrorKind =
  | "unauthorized"
  | "forbidden"
  | "reauthentication"
  | "validation"
  | "conflict"
  | "rate_limited"
  | "aborted"
  | "network"
  | "server";

export class DashboardApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly kind: DashboardApiErrorKind,
    readonly issues: Array<{ field?: string; message: string }> = [],
  ) {
    super(message);
    this.name = "DashboardApiError";
  }
}

export type ListRecordsOptions = {
  limit?: number;
  offset?: number;
  status?: ScientificRecordStatus;
  query?: string;
  category?: string;
  signal?: AbortSignal;
};

export type ListResearchOptions = {
  limit?: number;
  offset?: number;
  status?: ResearchStatus;
  signal?: AbortSignal;
};

export type ListNewsOptions = {
  limit?: number;
  offset?: number;
  status?: EditorialStatus;
  signal?: AbortSignal;
};

export type ListPagesOptions = {
  limit?: number;
  offset?: number;
  status?: EditorialStatus;
  signal?: AbortSignal;
};

const VALID_RECORD_STATUSES: Set<string> = new Set([
  "unclassified_draft",
  "draft",
  "in_review",
  "published",
  "archived",
]);

const VALID_RESEARCH_STATUSES: Set<string> = new Set([
  "draft",
  "in_review",
  "published",
  "archived",
]);

const VALID_EDITORIAL_STATUSES: Set<string> = new Set([
  "draft",
  "in_review",
  "published",
  "archived",
]);

const VALID_FIELD_DATA_TYPES: Set<string> = new Set([
  "text",
  "long_text",
  "integer",
  "decimal",
  "boolean",
  "date",
  "choice",
  "multi_choice",
]);

function isRecord(val: unknown): val is Record<string, unknown> {
  return typeof val === "object" && val !== null && !Array.isArray(val);
}

function isValidIsoDate(str: unknown): str is string {
  if (typeof str !== "string" || str.trim().length === 0) return false;
  const time = new Date(str).getTime();
  return !Number.isNaN(time);
}

/**
 * Validates the runtime shape of a scientific records list response.
 * Malformed envelopes or items produce a safe generic DashboardApiError.
 */
export function validateRecordListResponse(
  data: unknown,
): DashboardRecordListResponse {
  if (!isRecord(data)) {
    throw new DashboardApiError(
      "The scientific server returned an unparseable response.",
      200,
      "server",
    );
  }

  const { items, total, limit, offset } = data;

  if (
    typeof total !== "number" ||
    !Number.isInteger(total) ||
    total < 0 ||
    typeof limit !== "number" ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    typeof offset !== "number" ||
    !Number.isInteger(offset) ||
    offset < 0 ||
    !Array.isArray(items)
  ) {
    throw new DashboardApiError(
      "The scientific server returned an unparseable response.",
      200,
      "server",
    );
  }

  const validatedItems: DashboardRecordItem[] = [];

  for (const item of items) {
    if (!isRecord(item)) {
      throw new DashboardApiError(
        "The scientific server returned an unparseable response.",
        200,
        "server",
      );
    }

    const {
      id,
      title,
      status,
      isClassified,
      categoryName,
      primaryImageMediaAssetId,
      updatedAt,
    } = item;

    if (
      typeof id !== "string" ||
      id.trim().length === 0 ||
      (title !== null && typeof title !== "string") ||
      typeof status !== "string" ||
      !VALID_RECORD_STATUSES.has(status) ||
      typeof isClassified !== "boolean" ||
      (categoryName !== null && typeof categoryName !== "string") ||
      (primaryImageMediaAssetId !== null && typeof primaryImageMediaAssetId !== "string") ||
      !isValidIsoDate(updatedAt)
    ) {
      throw new DashboardApiError(
        "The scientific server returned an unparseable response.",
        200,
        "server",
      );
    }

    validatedItems.push({
      id: id.trim(),
      title,
      status: status as ScientificRecordStatus,
      isClassified,
      categoryName,
      primaryImageMediaAssetId,
      updatedAt,
    });
  }

  return {
    items: validatedItems,
    total,
    limit,
    offset,
  };
}

/**
 * Validates the runtime shape of a research list response.
 * Malformed envelopes or items produce a safe generic DashboardApiError.
 */
export function validateResearchListResponse(
  data: unknown,
): DashboardResearchListResponse {
  if (!isRecord(data)) {
    throw new DashboardApiError(
      "The scientific server returned an unparseable response.",
      200,
      "server",
    );
  }

  const { items, total, limit, offset } = data;

  if (
    typeof total !== "number" ||
    !Number.isInteger(total) ||
    total < 0 ||
    typeof limit !== "number" ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    typeof offset !== "number" ||
    !Number.isInteger(offset) ||
    offset < 0 ||
    !Array.isArray(items)
  ) {
    throw new DashboardApiError(
      "The scientific server returned an unparseable response.",
      200,
      "server",
    );
  }

  const validatedItems: DashboardResearchItem[] = [];

  for (const item of items) {
    if (!isRecord(item)) {
      throw new DashboardApiError(
        "The scientific server returned an unparseable response.",
        200,
        "server",
      );
    }

    const { id, title, status, publicationYear, doi, updatedAt } = item;

    if (
      typeof id !== "string" ||
      id.trim().length === 0 ||
      (title !== null && typeof title !== "string") ||
      typeof status !== "string" ||
      !VALID_RESEARCH_STATUSES.has(status) ||
      (publicationYear !== null &&
        (typeof publicationYear !== "number" ||
          !Number.isInteger(publicationYear))) ||
      (doi !== null && typeof doi !== "string") ||
      !isValidIsoDate(updatedAt)
    ) {
      throw new DashboardApiError(
        "The scientific server returned an unparseable response.",
        200,
        "server",
      );
    }

    validatedItems.push({
      id: id.trim(),
      title,
      status: status as ResearchStatus,
      publicationYear,
      doi,
      updatedAt,
    });
  }

  return {
    items: validatedItems,
    total,
    limit,
    offset,
  };
}

/**
 * Validates the runtime shape of a news list response.
 * Malformed envelopes or items produce a safe generic DashboardApiError.
 */
export function validateNewsListResponse(
  data: unknown,
): DashboardNewsListResponse {
  if (!isRecord(data)) {
    throw new DashboardApiError(
      "The editorial server returned an unparseable response.",
      200,
      "server",
    );
  }

  const { items, total, limit, offset } = data;

  if (
    typeof total !== "number" ||
    !Number.isInteger(total) ||
    total < 0 ||
    typeof limit !== "number" ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    typeof offset !== "number" ||
    !Number.isInteger(offset) ||
    offset < 0 ||
    !Array.isArray(items)
  ) {
    throw new DashboardApiError(
      "The editorial server returned an unparseable response.",
      200,
      "server",
    );
  }

  const validatedItems: DashboardNewsItem[] = [];

  for (const item of items) {
    if (!isRecord(item)) {
      throw new DashboardApiError(
        "The editorial server returned an unparseable response.",
        200,
        "server",
      );
    }

    const { id, title, slug, status, publishedAt, updatedAt } = item;

    if (
      typeof id !== "string" ||
      id.trim().length === 0 ||
      (title !== null && typeof title !== "string") ||
      (slug !== null && typeof slug !== "string") ||
      typeof status !== "string" ||
      !VALID_EDITORIAL_STATUSES.has(status) ||
      (publishedAt !== null && !isValidIsoDate(publishedAt)) ||
      !isValidIsoDate(updatedAt)
    ) {
      throw new DashboardApiError(
        "The editorial server returned an unparseable response.",
        200,
        "server",
      );
    }

    validatedItems.push({
      id: id.trim(),
      title,
      slug,
      status: status as EditorialStatus,
      publishedAt,
      updatedAt,
    });
  }

  return {
    items: validatedItems,
    total,
    limit,
    offset,
  };
}

/**
 * Validates the runtime shape of a managed pages list response.
 * Malformed envelopes or items produce a safe generic DashboardApiError.
 */
export function validatePageListResponse(
  data: unknown,
): DashboardPageListResponse {
  if (!isRecord(data)) {
    throw new DashboardApiError(
      "The editorial server returned an unparseable response.",
      200,
      "server",
    );
  }

  const { items, total, limit, offset } = data;

  if (
    typeof total !== "number" ||
    !Number.isInteger(total) ||
    total < 0 ||
    typeof limit !== "number" ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    typeof offset !== "number" ||
    !Number.isInteger(offset) ||
    offset < 0 ||
    !Array.isArray(items)
  ) {
    throw new DashboardApiError(
      "The editorial server returned an unparseable response.",
      200,
      "server",
    );
  }

  const validatedItems: DashboardPageItem[] = [];

  for (const item of items) {
    if (!isRecord(item)) {
      throw new DashboardApiError(
        "The editorial server returned an unparseable response.",
        200,
        "server",
      );
    }

    const { id, pageType, title, status, effectiveAt, publishedAt, updatedAt } =
      item;

    if (
      typeof id !== "string" ||
      id.trim().length === 0 ||
      typeof pageType !== "string" ||
      pageType.trim().length === 0 ||
      (title !== null && typeof title !== "string") ||
      typeof status !== "string" ||
      !VALID_EDITORIAL_STATUSES.has(status) ||
      (effectiveAt !== null && !isValidIsoDate(effectiveAt)) ||
      (publishedAt !== null && !isValidIsoDate(publishedAt)) ||
      !isValidIsoDate(updatedAt)
    ) {
      throw new DashboardApiError(
        "The editorial server returned an unparseable response.",
        200,
        "server",
      );
    }

    validatedItems.push({
      id: id.trim(),
      pageType: pageType.trim(),
      title,
      status: status as EditorialStatus,
      effectiveAt,
      publishedAt,
      updatedAt,
    });
  }

  return {
    items: validatedItems,
    total,
    limit,
    offset,
  };
}

/**
 * Validates category list response from scientific structure endpoint.
 */
export function validateCategoryListResponse(data: unknown): {
  items: StructureCategory[];
} {
  if (!isRecord(data) || !Array.isArray(data.items)) {
    throw new DashboardApiError(
      "The scientific server returned an unparseable response.",
      200,
      "server",
    );
  }

  const items: StructureCategory[] = [];
  for (const item of data.items) {
    if (!isRecord(item)) {
      throw new DashboardApiError(
        "The scientific server returned an unparseable response.",
        200,
        "server",
      );
    }
    const {
      id,
      parentId,
      stableKey,
      slug,
      recordsAllowed,
      position,
      name,
      description,
      locale,
      translationAvailable,
    } = item;

    if (
      typeof id !== "string" ||
      id.trim().length === 0 ||
      (parentId !== null && typeof parentId !== "string") ||
      typeof stableKey !== "string" ||
      typeof slug !== "string" ||
      typeof recordsAllowed !== "boolean" ||
      typeof position !== "number" ||
      typeof name !== "string" ||
      (description !== null && typeof description !== "string") ||
      typeof locale !== "string" ||
      typeof translationAvailable !== "boolean"
    ) {
      throw new DashboardApiError(
        "The scientific server returned an unparseable response.",
        200,
        "server",
      );
    }

    items.push({
      id: id.trim(),
      parentId: parentId ? parentId.trim() : null,
      stableKey: stableKey.trim(),
      slug: slug.trim(),
      recordsAllowed,
      position,
      name: name.trim(),
      description: description ? description.trim() : null,
      locale: locale.trim(),
      translationAvailable,
    });
  }

  return { items };
}

/**
 * Validates record type list response for a category.
 */
export function validateRecordTypeListResponse(data: unknown): {
  items: CategoryRecordType[];
} {
  if (!isRecord(data) || !Array.isArray(data.items)) {
    throw new DashboardApiError(
      "The scientific server returned an unparseable response.",
      200,
      "server",
    );
  }

  const items: CategoryRecordType[] = [];
  for (const item of data.items) {
    if (!isRecord(item)) {
      throw new DashboardApiError(
        "The scientific server returned an unparseable response.",
        200,
        "server",
      );
    }
    const {
      id,
      stableKey,
      position,
      name,
      description,
      activeTemplateVersionId,
      locale,
      translationAvailable,
    } = item;

    if (
      typeof id !== "string" ||
      id.trim().length === 0 ||
      typeof stableKey !== "string" ||
      typeof position !== "number" ||
      typeof name !== "string" ||
      (description !== null && typeof description !== "string") ||
      typeof activeTemplateVersionId !== "string" ||
      typeof locale !== "string" ||
      typeof translationAvailable !== "boolean"
    ) {
      throw new DashboardApiError(
        "The scientific server returned an unparseable response.",
        200,
        "server",
      );
    }

    items.push({
      id: id.trim(),
      stableKey: stableKey.trim(),
      position,
      name: name.trim(),
      description: description ? description.trim() : null,
      activeTemplateVersionId: activeTemplateVersionId.trim(),
      locale: locale.trim(),
      translationAvailable,
    });
  }

  return { items };
}

/**
 * Validates active scientific template response.
 */
export function validateActiveTemplateResponse(
  data: unknown,
): ActiveScientificTemplate {
  if (!isRecord(data)) {
    throw new DashboardApiError(
      "The scientific server returned an unparseable response.",
      200,
      "server",
    );
  }

  const { id, stableKey, name, version, fields } = data;
  if (
    typeof id !== "string" ||
    id.trim().length === 0 ||
    typeof stableKey !== "string" ||
    typeof name !== "string" ||
    !isRecord(version) ||
    typeof version.id !== "string" ||
    typeof version.number !== "number" ||
    typeof version.status !== "string" ||
    !Array.isArray(fields)
  ) {
    throw new DashboardApiError(
      "The scientific server returned an unparseable response.",
      200,
      "server",
    );
  }

  const validatedFields: TemplateField[] = [];
  for (const field of fields) {
    if (!isRecord(field)) {
      throw new DashboardApiError(
        "The scientific server returned an unparseable response.",
        200,
        "server",
      );
    }
    const {
      id: fieldId,
      stableKey: fieldKey,
      dataType,
      required,
      validation,
      unit,
      searchable,
      filterable,
      position,
      status,
      label,
      helpText,
      locale,
      translationAvailable,
    } = field;

    if (
      typeof fieldId !== "string" ||
      typeof fieldKey !== "string" ||
      typeof dataType !== "string" ||
      !VALID_FIELD_DATA_TYPES.has(dataType) ||
      typeof required !== "boolean" ||
      !isRecord(validation) ||
      (unit !== null && typeof unit !== "string") ||
      typeof searchable !== "boolean" ||
      typeof filterable !== "boolean" ||
      typeof position !== "number" ||
      (status !== "active" && status !== "deprecated") ||
      typeof label !== "string" ||
      (helpText !== null && typeof helpText !== "string") ||
      typeof locale !== "string" ||
      typeof translationAvailable !== "boolean"
    ) {
      throw new DashboardApiError(
        "The scientific server returned an unparseable response.",
        200,
        "server",
      );
    }

    validatedFields.push({
      id: fieldId.trim(),
      stableKey: fieldKey.trim(),
      dataType: dataType as FieldDataType,
      required,
      validation,
      unit: unit ? unit.trim() : null,
      searchable,
      filterable,
      position,
      status,
      label: label.trim(),
      helpText: helpText ? helpText.trim() : null,
      locale: locale.trim(),
      translationAvailable,
    });
  }

  return {
    id: id.trim(),
    stableKey: stableKey.trim(),
    name: name.trim(),
    version: {
      id: (version.id as string).trim(),
      number: version.number as number,
      status: (version.status as string).trim(),
    },
    fields: validatedFields,
  };
}

/**
 * Validates scientific record detail response from GET / POST / PATCH /records.
 */
export function validateRecordDetailResponse(
  data: unknown,
): ScientificRecordDetail {
  if (!isRecord(data)) {
    throw new DashboardApiError(
      "The scientific server returned an unparseable response.",
      200,
      "server",
    );
  }

  const {
    id,
    stableId,
    slug,
    status,
    categoryId,
    recordTypeId,
    templateVersionId,
    attributes,
    ownerUserId,
    createdAt,
    updatedAt,
    translations,
  } = data;

  if (
    typeof id !== "string" ||
    id.trim().length === 0 ||
    typeof stableId !== "string" ||
    (slug !== null && typeof slug !== "string") ||
    typeof status !== "string" ||
    !VALID_RECORD_STATUSES.has(status) ||
    (categoryId !== null && typeof categoryId !== "string") ||
    (recordTypeId !== null && typeof recordTypeId !== "string") ||
    (templateVersionId !== null && typeof templateVersionId !== "string") ||
    !isRecord(attributes) ||
    typeof ownerUserId !== "string" ||
    !isValidIsoDate(createdAt) ||
    !isValidIsoDate(updatedAt)
  ) {
    throw new DashboardApiError(
      "The scientific server returned an unparseable response.",
      200,
      "server",
    );
  }

  const validatedTranslations: RecordTranslationItem[] = [];
  if (Array.isArray(translations)) {
    for (const t of translations) {
      if (
        isRecord(t) &&
        typeof t.locale === "string" &&
        typeof t.title === "string"
      ) {
        validatedTranslations.push({
          locale: t.locale,
          title: t.title,
          summary: typeof t.summary === "string" ? t.summary : null,
          description: typeof t.description === "string" ? t.description : null,
          sourceLocale:
            typeof t.sourceLocale === "string" ? t.sourceLocale : null,
          status: typeof t.status === "string" ? t.status : "draft",
          translatorUserId:
            typeof t.translatorUserId === "string" ? t.translatorUserId : null,
          reviewerUserId:
            typeof t.reviewerUserId === "string" ? t.reviewerUserId : null,
          createdAt: isValidIsoDate(t.createdAt) ? t.createdAt : createdAt,
          updatedAt: isValidIsoDate(t.updatedAt) ? t.updatedAt : updatedAt,
        });
      }
    }
  }

  return {
    id: id.trim(),
    stableId: stableId.trim(),
    slug: slug ? slug.trim() : null,
    status: status as ScientificRecordStatus,
    categoryId: categoryId ? categoryId.trim() : null,
    recordTypeId: recordTypeId ? recordTypeId.trim() : null,
    templateVersionId: templateVersionId ? templateVersionId.trim() : null,
    attributes: attributes as Record<string, unknown>,
    ownerUserId: ownerUserId.trim(),
    createdAt,
    updatedAt,
    translations: validatedTranslations,
  };
}

const apiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(
  /\/$/,
  "",
);

export function buildDashboardUrl(
  path: string,
  params: Record<string, string | number | undefined>,
): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      query.set(key, String(value));
    }
  }
  const queryString = query.toString();
  const fullPath = `${apiBaseUrl}${path}`;
  return queryString ? `${fullPath}?${queryString}` : fullPath;
}

function getCsrfToken(): string | null {
  if (typeof document === "undefined") return null;
  const prefix = "gk_csrf=";
  const match = document.cookie.split("; ").find((c) => c.startsWith(prefix));
  return match ? decodeURIComponent(match.slice(prefix.length)) : null;
}

function classifyError(status: number): {
  kind: DashboardApiErrorKind;
  message: string;
} {
  if (status === 400) {
    return {
      kind: "validation",
      message: "Please correct the issues with your request.",
    };
  }
  if (status === 401) {
    return {
      kind: "unauthorized",
      message:
        "Your session has expired or you are not signed in. Please sign in to continue.",
    };
  }
  if (status === 403) {
    return {
      kind: "forbidden",
      message: "You do not have permission to access this resource.",
    };
  }
  if (status === 429) {
    return {
      kind: "rate_limited",
      message:
        "Too many requests were sent in a short time. Please wait a moment and try again.",
    };
  }
  if (status >= 500) {
    return {
      kind: "server",
      message: "The server could not complete this request. Please try again.",
    };
  }
  return {
    kind: "server",
    message: "The request could not be completed. Please try again.",
  };
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    if (response.status === 409) {
      const defaultMessage =
        "This record conflicts with an existing value or state. Please review it and try again.";
      let message = defaultMessage;
      try {
        const body = (await response.json()) as Record<string, unknown>;
        if (
          body.detail ===
          "That identifier is already in use. Choose another or leave it blank."
        ) {
          message = body.detail;
        }
      } catch {
        // Keep the safe generic message if the server response cannot be parsed.
      }
      throw new DashboardApiError(message, 409, "conflict");
    }
    if (response.status === 400) {
      try {
        const body = (await response.json()) as Record<string, unknown>;
        let message = "Please correct the issues with your request.";
        const issues: Array<{ field?: string; message: string }> = [];

        if (Array.isArray(body.issues)) {
          for (const item of body.issues) {
            if (isRecord(item) && typeof item.message === "string") {
              issues.push({
                field: typeof item.field === "string" ? item.field : undefined,
                message: item.message,
              });
            }
          }
        }

        if (typeof body.message === "string") {
          message = body.message;
        } else if (Array.isArray(body.message)) {
          message = body.message
            .filter((m): m is string => typeof m === "string")
            .join(". ");
        }

        throw new DashboardApiError(message, 400, "validation", issues);
      } catch (err) {
        if (err instanceof DashboardApiError) throw err;
        throw new DashboardApiError(
          "Please correct the issues with your request.",
          400,
          "validation",
        );
      }
    }

    const { kind, message } = classifyError(response.status);
    throw new DashboardApiError(message, response.status, kind);
  }
  try {
    return (await response.json()) as T;
  } catch {
    throw new DashboardApiError(
      "The server returned an unparseable response.",
      response.status,
      "server",
    );
  }
}

/**
 * Lists scientific records with pagination, status filter, and strict runtime response validation.
 */
export async function listDashboardRecords(
  options: ListRecordsOptions = {},
): Promise<DashboardRecordListResponse> {
  const url = buildDashboardUrl("/api/v1/records", {
    limit: options.limit,
    offset: options.offset,
    status: options.status,
    query: options.query,
    category: options.category,
  });

  try {
    const response = await fetch(url, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      signal: options.signal,
      headers: {
        Accept: "application/json",
      },
    });
    const rawData = await handleResponse<unknown>(response);
    return validateRecordListResponse(rawData);
  } catch (error) {
    if (error instanceof DashboardApiError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new DashboardApiError("Request was cancelled.", 0, "aborted");
    }
    throw new DashboardApiError(
      "Unable to connect to the scientific service. Please check your network connection.",
      0,
      "network",
    );
  }
}

/**
 * Lists managed research publications with pagination, status filter, and strict runtime response validation.
 */
export async function listDashboardResearch(
  options: ListResearchOptions = {},
): Promise<DashboardResearchListResponse> {
  const url = buildDashboardUrl("/api/v1/research", {
    limit: options.limit,
    offset: options.offset,
    status: options.status,
  });

  try {
    const response = await fetch(url, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      signal: options.signal,
      headers: {
        Accept: "application/json",
      },
    });
    const rawData = await handleResponse<unknown>(response);
    return validateResearchListResponse(rawData);
  } catch (error) {
    if (error instanceof DashboardApiError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new DashboardApiError("Request was cancelled.", 0, "aborted");
    }
    throw new DashboardApiError(
      "Unable to connect to the scientific service. Please check your network connection.",
      0,
      "network",
    );
  }
}

/**
 * Lists news articles with pagination, status filter, and strict runtime response validation.
 */
export async function listDashboardNews(
  options: ListNewsOptions = {},
): Promise<DashboardNewsListResponse> {
  const url = buildDashboardUrl("/api/v1/editorial/news", {
    limit: options.limit,
    offset: options.offset,
    status: options.status,
  });

  try {
    const response = await fetch(url, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      signal: options.signal,
      headers: {
        Accept: "application/json",
      },
    });
    const rawData = await handleResponse<unknown>(response);
    return validateNewsListResponse(rawData);
  } catch (error) {
    if (error instanceof DashboardApiError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new DashboardApiError("Request was cancelled.", 0, "aborted");
    }
    throw new DashboardApiError(
      "Unable to connect to the editorial service. Please check your network connection.",
      0,
      "network",
    );
  }
}

/**
 * Lists managed pages with pagination, status filter, and strict runtime response validation.
 */
export async function listDashboardPages(
  options: ListPagesOptions = {},
): Promise<DashboardPageListResponse> {
  const url = buildDashboardUrl("/api/v1/editorial/pages", {
    limit: options.limit,
    offset: options.offset,
    status: options.status,
  });

  try {
    const response = await fetch(url, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      signal: options.signal,
      headers: {
        Accept: "application/json",
      },
    });
    const rawData = await handleResponse<unknown>(response);
    return validatePageListResponse(rawData);
  } catch (error) {
    if (error instanceof DashboardApiError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new DashboardApiError("Request was cancelled.", 0, "aborted");
    }
    throw new DashboardApiError(
      "Unable to connect to the editorial service. Please check your network connection.",
      0,
      "network",
    );
  }
}

/**
 * Lists scientific categories with parent hierarchy and active status.
 */
export async function listStructureCategories(
  locale = "en",
  signal?: AbortSignal,
): Promise<{ items: StructureCategory[] }> {
  const url = buildDashboardUrl("/api/v1/scientific-structure/categories", {
    locale,
  });

  try {
    const response = await fetch(url, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      signal,
      headers: {
        Accept: "application/json",
      },
    });
    const rawData = await handleResponse<unknown>(response);
    return validateCategoryListResponse(rawData);
  } catch (error) {
    if (error instanceof DashboardApiError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new DashboardApiError("Request was cancelled.", 0, "aborted");
    }
    throw new DashboardApiError(
      "Unable to connect to the scientific service. Please check your network connection.",
      0,
      "network",
    );
  }
}

/**
 * Lists permitted record types for a specified category.
 */
export async function listCategoryRecordTypes(
  categoryId: string,
  locale = "en",
  signal?: AbortSignal,
): Promise<{ items: CategoryRecordType[] }> {
  const url = buildDashboardUrl(
    `/api/v1/scientific-structure/categories/${encodeURIComponent(categoryId)}/record-types`,
    { locale },
  );

  try {
    const response = await fetch(url, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      signal,
      headers: {
        Accept: "application/json",
      },
    });
    const rawData = await handleResponse<unknown>(response);
    return validateRecordTypeListResponse(rawData);
  } catch (error) {
    if (error instanceof DashboardApiError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new DashboardApiError("Request was cancelled.", 0, "aborted");
    }
    throw new DashboardApiError(
      "Unable to connect to the scientific service. Please check your network connection.",
      0,
      "network",
    );
  }
}

/**
 * Loads the active scientific template for a category and record-type combination.
 */
export async function getActiveTemplate(
  categoryId: string,
  recordTypeId: string,
  locale = "en",
  signal?: AbortSignal,
): Promise<ActiveScientificTemplate> {
  const url = buildDashboardUrl(
    "/api/v1/scientific-structure/templates/active",
    {
      categoryId,
      recordTypeId,
      locale,
    },
  );

  try {
    const response = await fetch(url, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      signal,
      headers: {
        Accept: "application/json",
      },
    });
    const rawData = await handleResponse<unknown>(response);
    return validateActiveTemplateResponse(rawData);
  } catch (error) {
    if (error instanceof DashboardApiError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new DashboardApiError("Request was cancelled.", 0, "aborted");
    }
    throw new DashboardApiError(
      "Unable to connect to the scientific service. Please check your network connection.",
      0,
      "network",
    );
  }
}

/**
 * Loads a pinned scientific template version by its ID.
 */
export async function getTemplateVersion(
  versionId: string,
  locale = "en",
  signal?: AbortSignal,
): Promise<ActiveScientificTemplate> {
  const url = buildDashboardUrl(
    `/api/v1/scientific-structure/template-versions/${encodeURIComponent(versionId)}`,
    { locale },
  );

  try {
    const response = await fetch(url, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      signal,
      headers: {
        Accept: "application/json",
      },
    });
    const rawData = await handleResponse<unknown>(response);
    return validateActiveTemplateResponse(rawData);
  } catch (error) {
    if (error instanceof DashboardApiError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new DashboardApiError("Request was cancelled.", 0, "aborted");
    }
    throw new DashboardApiError(
      "Unable to connect to the scientific service. Please check your network connection.",
      0,
      "network",
    );
  }
}

/**
 * Creates a new geological draft record.
 */
export async function createRecord(
  payload: CreateRecordPayload,
  signal?: AbortSignal,
): Promise<ScientificRecordDetail> {
  const url = buildDashboardUrl("/api/v1/records", {});
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  const csrfToken = getCsrfToken();
  if (csrfToken) {
    headers["X-CSRF-Token"] = csrfToken;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      signal,
      headers,
      body: JSON.stringify(payload),
    });
    const rawData = await handleResponse<unknown>(response);
    return validateRecordDetailResponse(rawData);
  } catch (error) {
    if (error instanceof DashboardApiError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new DashboardApiError("Request was cancelled.", 0, "aborted");
    }
    throw new DashboardApiError(
      "Unable to connect to the scientific service. Please check your network connection.",
      0,
      "network",
    );
  }
}

/**
 * Retrieves a scientific record by ID.
 */
export async function getRecord(
  recordId: string,
  signal?: AbortSignal,
): Promise<ScientificRecordDetail> {
  const url = buildDashboardUrl(
    `/api/v1/records/${encodeURIComponent(recordId)}`,
    {},
  );

  try {
    const response = await fetch(url, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      signal,
      headers: {
        Accept: "application/json",
      },
    });
    const rawData = await handleResponse<unknown>(response);
    return validateRecordDetailResponse(rawData);
  } catch (error) {
    if (error instanceof DashboardApiError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new DashboardApiError("Request was cancelled.", 0, "aborted");
    }
    throw new DashboardApiError(
      "Unable to connect to the scientific service. Please check your network connection.",
      0,
      "network",
    );
  }
}

/**
 * Updates a geological draft record by ID.
 */
export async function updateRecord(
  recordId: string,
  payload: UpdateRecordPayload,
  signal?: AbortSignal,
): Promise<ScientificRecordDetail> {
  const url = buildDashboardUrl(
    `/api/v1/records/${encodeURIComponent(recordId)}`,
    {},
  );
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  const csrfToken = getCsrfToken();
  if (csrfToken) {
    headers["X-CSRF-Token"] = csrfToken;
  }

  try {
    const response = await fetch(url, {
      method: "PATCH",
      credentials: "include",
      cache: "no-store",
      signal,
      headers,
      body: JSON.stringify(payload),
    });
    const rawData = await handleResponse<unknown>(response);
    return validateRecordDetailResponse(rawData);
  } catch (error) {
    if (error instanceof DashboardApiError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new DashboardApiError("Request was cancelled.", 0, "aborted");
    }
    throw new DashboardApiError(
      "Unable to connect to the scientific service. Please check your network connection.",
      0,
      "network",
    );
  }
}
