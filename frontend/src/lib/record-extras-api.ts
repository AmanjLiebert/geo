import {
  buildDashboardUrl,
  DashboardApiError,
  validateRecordDetailResponse,
  type ScientificRecordDetail,
} from "./dashboard-api";

export type RecordRelationship = {
  id: string;
  targetType: "record" | "research";
  targetId: string;
  targetTitle?: string | null;
  relationshipType: string;
  notes: string | null;
  createdAt: string;
};

export type RecordMediaAttachment = {
  mediaAssetId: string;
  purpose: string;
  position: number;
  caption?: string | null;
  description?: string | null;
  altText?: string | null;
  isPrimary: boolean;
  mediaKind: "image" | "document" | "video";
  processingStatus: string;
  filename: string;
  rightsStatement: string;
  licence: string | null;
  credit: string | null;
};

export type OnlineMediaPage = {
  kind: string;
  pageNumber: number | null;
  url: string;
};

export type MediaUploadRequest = {
  filename: string;
  contentType:
    | "image/jpeg"
    | "image/png"
    | "image/webp"
    | "application/pdf"
    | "video/mp4"
    | "video/webm";
  byteSize: number;
  rightsStatement: string;
  licence?: string;
  credit?: string;
};

type UploadTicket = {
  mediaAssetId: string;
  uploadUrl: string;
  method: "PUT";
  requiredHeaders: Record<string, string>;
};

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalidResponse(): never {
  throw new DashboardApiError(
    "The scientific service returned an invalid response.",
    200,
    "server",
  );
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function optionalBoundedString(value: unknown, maximum: number): boolean {
  return (
    value === undefined ||
    value === null ||
    (typeof value === "string" && value.length <= maximum)
  );
}

function csrfToken(): string | null {
  if (typeof document === "undefined") return null;
  const cookie = document.cookie
    .split("; ")
    .find((part) => part.startsWith("gk_csrf="));
  return cookie ? decodeURIComponent(cookie.slice("gk_csrf=".length)) : null;
}

export async function requestRecordResource(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<unknown> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const token = csrfToken();
  if (method !== "GET" && token) headers["X-CSRF-Token"] = token;
  let response: Response;
  try {
    response = await fetch(buildDashboardUrl(path, {}), {
      method,
      credentials: "include",
      cache: "no-store",
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new DashboardApiError(
      "Could not connect to the scientific service.",
      0,
      "network",
    );
  }
  if (!response.ok) {
    let problemCode: unknown;
    try {
      const problem = (await response.json()) as unknown;
      if (typeof problem === "object" && problem !== null) {
        problemCode = (problem as Record<string, unknown>).code;
      }
    } catch {
      problemCode = undefined;
    }
    const kind =
      response.status === 401
        ? "unauthorized"
        : response.status === 403 && problemCode === "reauthentication_required"
          ? "reauthentication"
        : response.status === 403
          ? "forbidden"
          : response.status === 400 || response.status === 409
            ? "validation"
            : "server";
    throw new DashboardApiError(
      kind === "unauthorized"
        ? "Sign in to continue."
        : kind === "reauthentication"
          ? "Confirm your identity to continue this protected action."
        : kind === "forbidden"
          ? "You do not have access to this action."
          : kind === "validation"
            ? "This request could not be saved. Check the details and try again."
            : "The request could not be completed.",
      response.status,
      kind,
    );
  }
  try {
    return await response.json();
  } catch {
    return invalidResponse();
  }
}

export async function saveEnglishRecordDetails(
  recordId: string,
  details: { title: string; summary: string; description: string },
): Promise<ScientificRecordDetail> {
  return validateRecordDetailResponse(
    await requestRecordResource(
      `/api/v1/records/${encodeURIComponent(recordId)}/translations/en`,
      "PUT",
      details,
    ),
  );
}

export function validateRelationships(value: unknown): RecordRelationship[] {
  if (!object(value) || !Array.isArray(value.items)) return invalidResponse();
  return value.items.map((item: unknown) => {
    if (
      !object(item) ||
      typeof item.id !== "string" ||
      (item.targetType !== "record" && item.targetType !== "research") ||
      typeof item.targetId !== "string" ||
      (item.targetTitle !== undefined &&
        item.targetTitle !== null &&
        typeof item.targetTitle !== "string") ||
      typeof item.relationshipType !== "string" ||
      (item.notes !== null && typeof item.notes !== "string") ||
      typeof item.createdAt !== "string"
    )
      return invalidResponse();
    return item as RecordRelationship;
  });
}

export async function listRecordRelationships(
  recordId: string,
): Promise<RecordRelationship[]> {
  return validateRelationships(
    await requestRecordResource(
      `/api/v1/records/${encodeURIComponent(recordId)}/relationships`,
    ),
  );
}

export async function addRecordRelationship(
  recordId: string,
  data: {
    targetType: "record" | "research";
    targetId: string;
    relationshipType: string;
    notes?: string;
  },
): Promise<void> {
  const result = await requestRecordResource(
    `/api/v1/records/${encodeURIComponent(recordId)}/relationships`,
    "POST",
    data,
  );
  if (!object(result) || typeof result.id !== "string") invalidResponse();
}

export function validateMediaAttachments(
  value: unknown,
): RecordMediaAttachment[] {
  if (!object(value) || !Array.isArray(value.items)) return invalidResponse();
  return value.items.map((item: unknown) => {
    if (
      !object(item) ||
      typeof item.mediaAssetId !== "string" ||
      !uuidPattern.test(item.mediaAssetId) ||
      typeof item.purpose !== "string" ||
      item.purpose.trim().length < 1 ||
      item.purpose.length > 40 ||
      !Number.isInteger(item.position) ||
      Number(item.position) < 0 ||
      Number(item.position) > 10_000 ||
      !optionalBoundedString(item.caption, 160) ||
      !optionalBoundedString(item.description, 2_000) ||
      !optionalBoundedString(item.altText, 500) ||
      typeof item.isPrimary !== "boolean" ||
      !["image", "document", "video"].includes(String(item.mediaKind)) ||
      ![
        "pending",
        "quarantined",
        "processing",
        "approved",
        "rejected",
        "failed",
        "archived",
      ].includes(String(item.processingStatus)) ||
      typeof item.filename !== "string" ||
      item.filename.length < 1 ||
      item.filename.length > 300 ||
      typeof item.rightsStatement !== "string" ||
      item.rightsStatement.trim().length < 1 ||
      item.rightsStatement.length > 2_000 ||
      !optionalBoundedString(item.licence, 160) ||
      !optionalBoundedString(item.credit, 1_000)
    )
      return invalidResponse();
    return {
      mediaAssetId: item.mediaAssetId,
      purpose: item.purpose,
      position: item.position as number,
      caption: (item.caption ?? null) as string | null,
      description: (item.description ?? null) as string | null,
      altText: (item.altText ?? null) as string | null,
      isPrimary: item.isPrimary,
      mediaKind: item.mediaKind as "image" | "document" | "video",
      processingStatus: item.processingStatus as string,
      filename: item.filename,
      rightsStatement: item.rightsStatement,
      licence: (item.licence ?? null) as string | null,
      credit: (item.credit ?? null) as string | null,
    };
  });
}

export async function listRecordMedia(
  recordId: string,
): Promise<RecordMediaAttachment[]> {
  return validateMediaAttachments(
    await requestRecordResource(
      `/api/v1/media/records/${encodeURIComponent(recordId)}/attachments`,
    ),
  );
}

export async function updateRecordMediaAttachment(
  recordId: string,
  mediaAssetId: string,
  data: {
    purpose?: string;
    caption?: string | null;
    description?: string | null;
    altText?: string | null;
    rightsStatement?: string;
    credit?: string | null;
    licence?: string | null;
    position?: number;
    isPrimary?: boolean;
  },
): Promise<void> {
  await requestRecordResource(
    `/api/v1/media/records/${encodeURIComponent(recordId)}/attachments/${encodeURIComponent(mediaAssetId)}`,
    "PATCH",
    data,
  );
}

export async function setRecordPrimaryMedia(
  recordId: string,
  mediaAssetId: string,
): Promise<void> {
  await requestRecordResource(
    `/api/v1/media/records/${encodeURIComponent(recordId)}/attachments/${encodeURIComponent(mediaAssetId)}/primary`,
    "POST",
  );
}

export async function reorderRecordMedia(
  recordId: string,
  mediaAssetIds: string[],
): Promise<RecordMediaAttachment[]> {
  return validateMediaAttachments(
    await requestRecordResource(
      `/api/v1/media/records/${encodeURIComponent(recordId)}/attachments/order`,
      "PUT",
      { mediaAssetIds },
    ),
  );
}

export async function detachRecordMedia(
  recordId: string,
  mediaAssetId: string,
): Promise<void> {
  await requestRecordResource(
    `/api/v1/media/records/${encodeURIComponent(recordId)}/attachments/${encodeURIComponent(mediaAssetId)}`,
    "DELETE",
  );
}

export async function getOnlineMediaPages(
  mediaAssetId: string,
  options: { includeThumbnails?: boolean } = {},
): Promise<OnlineMediaPage[]> {
  const response = await requestRecordResource(
    `/api/v1/media/${encodeURIComponent(mediaAssetId)}/view`,
    "POST",
  );
  if (
    !object(response) ||
    response.disposition !== "inline" ||
    !Array.isArray(response.items)
  )
    return invalidResponse();
  const pages = response.items.map((item: unknown) => {
    if (
      !object(item) ||
      !["display", "thumbnail", "page", "playback"].includes(
        String(item.kind),
      ) ||
      (item.pageNumber !== null && typeof item.pageNumber !== "number") ||
      typeof item.url !== "string"
    )
      return invalidResponse();
    try {
      if (new URL(item.url).protocol !== "https:") return invalidResponse();
    } catch {
      return invalidResponse();
    }
    return {
      kind: item.kind,
      pageNumber: item.pageNumber,
      url: item.url,
    } as OnlineMediaPage;
  });
  if (options.includeThumbnails) return pages;
  const displayPages = pages.filter((page) => page.kind !== "thumbnail");
  return displayPages.length ? displayPages : pages;
}

function validateUploadTicket(value: unknown): UploadTicket {
  if (
    !object(value) ||
    typeof value.mediaAssetId !== "string" ||
    typeof value.uploadUrl !== "string" ||
    value.method !== "PUT" ||
    !object(value.requiredHeaders) ||
    !Object.entries(value.requiredHeaders).every(
      ([key, val]) =>
        key.toLowerCase() === "content-type" && typeof val === "string",
    )
  )
    return invalidResponse();
  try {
    if (new URL(value.uploadUrl).protocol !== "https:")
      return invalidResponse();
  } catch {
    return invalidResponse();
  }
  return value as UploadTicket;
}

export async function uploadRecordMedia(
  recordId: string,
  file: File,
  metadata: Omit<
    MediaUploadRequest,
    "filename" | "contentType" | "byteSize"
  > & {
    purpose: string;
    caption?: string;
    description?: string;
    altText?: string;
    position?: number;
    isPrimary?: boolean;
  },
): Promise<void> {
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
    "video/mp4",
    "video/webm",
  ];
  if (!allowedTypes.includes(file.type))
    throw new DashboardApiError(
      "Choose a JPEG, PNG, WebP, PDF, MP4, or WebM file.",
      400,
      "validation",
    );

  let maximum = 25 * 1024 * 1024;
  if (file.type === "application/pdf") {
    maximum = 20 * 1024 * 1024;
  } else if (file.type.startsWith("video/")) {
    maximum = 50 * 1024 * 1024;
  }

  if (file.size < 1 || file.size > maximum)
    throw new DashboardApiError(
      `Choose a file smaller than ${maximum / 1024 / 1024} MB.`,
      400,
      "validation",
    );
  const ticket = validateUploadTicket(
    await requestRecordResource("/api/v1/media/uploads", "POST", {
      filename: file.name,
      contentType: file.type,
      byteSize: file.size,
      rightsStatement: metadata.rightsStatement,
      licence: metadata.licence,
      credit: metadata.credit,
    }),
  );
  if (ticket.requiredHeaders["content-type"] !== file.type)
    return invalidResponse();
  let uploadResponse: Response;
  try {
    uploadResponse = await fetch(ticket.uploadUrl, {
      method: "PUT",
      body: file,
      headers: ticket.requiredHeaders,
      credentials: "omit",
      cache: "no-store",
    });
  } catch {
    throw new DashboardApiError(
      "The file could not be uploaded. Please try again.",
      0,
      "network",
    );
  }
  if (!uploadResponse.ok)
    throw new DashboardApiError(
      "The file could not be uploaded. Please try again.",
      uploadResponse.status,
      "server",
    );
  const confirmed = await requestRecordResource(
    `/api/v1/media/${encodeURIComponent(ticket.mediaAssetId)}/confirm`,
    "POST",
  );
  if (
    !object(confirmed) ||
    confirmed.mediaAssetId !== ticket.mediaAssetId ||
    confirmed.status !== "quarantined"
  )
    invalidResponse();
  const attached = await requestRecordResource(
    `/api/v1/media/records/${encodeURIComponent(recordId)}/attachments`,
    "POST",
    {
      mediaAssetId: ticket.mediaAssetId,
      purpose: metadata.purpose,
      caption: metadata.caption?.trim() || undefined,
      description: metadata.description?.trim() || undefined,
      altText: metadata.altText?.trim() || undefined,
      position: metadata.position,
      isPrimary: metadata.isPrimary,
    },
  );
  if (!object(attached) || attached.mediaAssetId !== ticket.mediaAssetId)
    invalidResponse();
}
