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
  mediaKind: "image" | "document";
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
  contentType: "image/jpeg" | "image/png" | "image/webp" | "application/pdf";
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
    const kind =
      response.status === 401
        ? "unauthorized"
        : response.status === 403
          ? "forbidden"
          : response.status === 400 || response.status === 409
            ? "validation"
            : "server";
    throw new DashboardApiError(
      kind === "unauthorized"
        ? "Sign in to continue."
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
      !["record", "research"].includes(String(item.targetType)) ||
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
      typeof item.purpose !== "string" ||
      typeof item.position !== "number" ||
      !["image", "document"].includes(String(item.mediaKind)) ||
      typeof item.processingStatus !== "string" ||
      typeof item.filename !== "string" ||
      typeof item.rightsStatement !== "string" ||
      (item.licence !== null && typeof item.licence !== "string") ||
      (item.credit !== null && typeof item.credit !== "string")
    )
      return invalidResponse();
    return item as RecordMediaAttachment;
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

export async function getOnlineMediaPages(
  mediaAssetId: string,
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
      typeof item.kind !== "string" ||
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
  > & { purpose: string },
): Promise<void> {
  if (
    !["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(
      file.type,
    )
  )
    throw new DashboardApiError(
      "Choose a JPEG, PNG, WebP, or PDF file.",
      400,
      "validation",
    );
  const maximum =
    file.type === "application/pdf" ? 20 * 1024 * 1024 : 25 * 1024 * 1024;
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
    { mediaAssetId: ticket.mediaAssetId, purpose: metadata.purpose },
  );
  if (!object(attached) || attached.mediaAssetId !== ticket.mediaAssetId)
    invalidResponse();
}
