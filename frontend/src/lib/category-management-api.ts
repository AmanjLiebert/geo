import { DashboardApiError } from "./dashboard-api";
import { requestRecordResource } from "./record-extras-api";

export type CategoryReadinessIssue = {
  field: string;
  code: string;
  message: string;
};

export type CategoryReadiness = {
  publishable: boolean;
  issues: CategoryReadinessIssue[];
};

export type CategoryDisplayState = "draft" | "published" | "unpublished" | "archived";
export type CategoryBadgeState = "draft" | "published" | "unpublished" | "removed";

export type ManagedCategory = {
  id: string;
  parentId: string | null;
  name: string;
  summary: string | null;
  description: string | null;
  publicationStatus: "draft" | "published";
  status: "active" | "archived";
  position: number;
  imageMediaAssetId: string | null;
  draftRevision: null | { title: string; summary: string; description: string; imageMediaAssetId: string | null; position: number };
  readiness: CategoryReadiness;
  displayState: CategoryDisplayState;
  hasUnpublishedChanges: boolean;
};

export function getCategoryBadgeState(item: ManagedCategory): CategoryBadgeState {
  if (item.status === "archived") return "removed";
  if (item.displayState === "published") return "published";
  if (item.displayState === "unpublished") return "unpublished";
  return "draft";
}

export function getCategoryActions(item: ManagedCategory, isChild = false, parentItem?: ManagedCategory): {
  canEdit: boolean;
  canPublish: boolean;
  isPublishDisabled: boolean;
  publishLabel: "Publish" | "Publish changes";
  canUnpublish: boolean;
  canRemove: boolean;
  canRestore: boolean;
  isRestoreDisabled: boolean;
  hasUnpublishedChanges: boolean;
  isReadyToPublish: boolean;
  showReadinessIssues: boolean;
} {
  const isArchived = item.status === "archived";
  const hasUnpublishedDraft = item.draftRevision !== null || item.hasUnpublishedChanges === true;
  const isNeedsPublish = !isArchived && (item.displayState !== "published" || hasUnpublishedDraft);
  const isReady = !isArchived && item.readiness?.publishable === true;
  const isNotReady = !isArchived && item.readiness !== undefined && !item.readiness.publishable;
  const isParentArchived = isChild && parentItem?.status === "archived";

  return {
    canEdit: !isArchived,
    canPublish: isNeedsPublish,
    isPublishDisabled: !isReady,
    publishLabel: item.displayState === "published" && hasUnpublishedDraft ? "Publish changes" : "Publish",
    canUnpublish: !isArchived && (item.displayState === "published" || item.publicationStatus === "published"),
    canRemove: !isArchived,
    canRestore: isArchived,
    isRestoreDisabled: isParentArchived,
    hasUnpublishedChanges: hasUnpublishedDraft,
    isReadyToPublish: isNeedsPublish && isReady,
    showReadinessIssues: isNeedsPublish && isNotReady,
  };
}

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseReadiness(value: unknown, errorMessage: string): CategoryReadiness {
  if (!object(value) || typeof value.publishable !== "boolean" || !Array.isArray(value.issues)) {
    throw new DashboardApiError(errorMessage, 200, "server");
  }
  const issues = value.issues.map((issue) => {
    if (!object(issue) || typeof issue.field !== "string" || typeof issue.code !== "string" || typeof issue.message !== "string") {
      throw new DashboardApiError(errorMessage, 200, "server");
    }
    return { field: issue.field, code: issue.code, message: issue.message };
  });
  return { publishable: value.publishable, issues };
}

export async function listManagedCategories(): Promise<ManagedCategory[]> {
  const response = await requestRecordResource("/api/v1/scientific-structure/categories/manage?locale=en");
  if (!object(response) || !Array.isArray(response.items)) throw new DashboardApiError("Categories could not be loaded.", 200, "server");
  return response.items.map((item: unknown) => {
    if (!object(item) || typeof item.id !== "string" || (item.parentId !== null && typeof item.parentId !== "string") || typeof item.name !== "string" || (item.summary !== null && typeof item.summary !== "string") || (item.description !== null && typeof item.description !== "string") || !["draft", "published"].includes(String(item.publicationStatus)) || !["active", "archived"].includes(String(item.status)) || !Number.isInteger(item.position) || (item.imageMediaAssetId !== null && typeof item.imageMediaAssetId !== "string") || (item.draftRevision !== null && (!object(item.draftRevision) || typeof item.draftRevision.title !== "string" || typeof item.draftRevision.summary !== "string" || typeof item.draftRevision.description !== "string" || !Number.isInteger(item.draftRevision.position) || (item.draftRevision.imageMediaAssetId !== null && typeof item.draftRevision.imageMediaAssetId !== "string"))) || typeof item.hasUnpublishedChanges !== "boolean" || typeof item.displayState !== "string" || !["draft", "published", "unpublished", "archived"].includes(item.displayState)) {
      throw new DashboardApiError("Categories could not be loaded.", 200, "server");
    }
    const readiness = parseReadiness(item.readiness, "Categories could not be loaded.");
    const displayState = item.displayState as CategoryDisplayState;
    return {
      id: item.id,
      parentId: item.parentId,
      name: item.name,
      summary: item.summary,
      description: item.description,
      publicationStatus: item.publicationStatus,
      status: item.status,
      position: item.position,
      imageMediaAssetId: item.imageMediaAssetId,
      draftRevision: item.draftRevision,
      readiness,
      displayState,
      hasUnpublishedChanges: item.hasUnpublishedChanges,
    } as ManagedCategory;
  });
}

export async function getCategoryReadiness(id: string): Promise<CategoryReadiness> {
  const result = await requestRecordResource(`/api/v1/scientific-structure/categories/${encodeURIComponent(id)}/readiness`);
  return parseReadiness(result, "Category readiness could not be loaded.");
}

export async function publishCategory(id: string): Promise<void> {
  const result = await requestRecordResource(`/api/v1/scientific-structure/categories/${encodeURIComponent(id)}/publish`, "POST");
  if (!object(result) || result.publicationStatus !== "published") throw new DashboardApiError("The category could not be published.", 200, "server");
}

export async function unpublishCategory(id: string): Promise<void> {
  const result = await requestRecordResource(`/api/v1/scientific-structure/categories/${encodeURIComponent(id)}/unpublish`, "POST");
  if (!object(result) || result.publicationStatus !== "draft") throw new DashboardApiError("The category could not be unpublished.", 200, "server");
}

export async function previewCategoryArchive(id: string): Promise<{ categoryCount: number; recordCount: number; status: "active" | "archived" }> {
  const result = await requestRecordResource(`/api/v1/scientific-structure/categories/${encodeURIComponent(id)}/archive-preview`);
  if (!object(result) || !Number.isInteger(result.categoryCount) || !Number.isInteger(result.recordCount) || !["active", "archived"].includes(String(result.status))) throw new DashboardApiError("Category impact could not be loaded.", 200, "server");
  return result as { categoryCount: number; recordCount: number; status: "active" | "archived" };
}

export async function changeCategoryArchive(id: string, restore: boolean, impact: { categoryCount: number; recordCount: number }): Promise<void> {
  const result = await requestRecordResource(
    `/api/v1/scientific-structure/categories/${encodeURIComponent(id)}/${restore ? "restore" : "archive"}`,
    "POST",
    { categoryCount: impact.categoryCount, recordCount: impact.recordCount },
  );
  if (!object(result) || result.status !== (restore ? "active" : "archived")) throw new DashboardApiError("Category change could not be confirmed.", 200, "server");
}

export async function saveCategoryDraft(id: string, input: { title: string; summary: string; description: string; imageMediaAssetId: string | null; position: number }): Promise<void> {
  const result = await requestRecordResource(`/api/v1/scientific-structure/categories/${encodeURIComponent(id)}`, "PATCH", input);
  if (!object(result) || result.id !== id || result.revisionSaved !== true) throw new DashboardApiError("The draft could not be confirmed.", 200, "server");
}

export async function createManagedCategory(input: { title: string; summary: string; description: string; parentId?: string; imageMediaAssetId?: string }): Promise<void> {
  const result = await requestRecordResource("/api/v1/scientific-structure/categories", "POST", input);
  if (!object(result) || typeof result.id !== "string" || result.publicationStatus !== "draft") throw new DashboardApiError("The category could not be confirmed.", 200, "server");
}

export async function uploadCategoryImage(file: File, rightsStatement: string): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size < 1 || file.size > 25 * 1024 * 1024) {
    throw new DashboardApiError("Choose a JPEG, PNG, or WebP image under 25 MB.", 400, "validation");
  }
  const ticket = await requestRecordResource("/api/v1/media/uploads", "POST", { filename: file.name, contentType: file.type, byteSize: file.size, rightsStatement });
  if (!object(ticket) || typeof ticket.mediaAssetId !== "string" || typeof ticket.uploadUrl !== "string" || !object(ticket.requiredHeaders) || ticket.requiredHeaders["content-type"] !== file.type || !ticket.uploadUrl.startsWith("https://")) {
    throw new DashboardApiError("The image upload could not be started.", 200, "server");
  }
  let response: Response;
  try {
    response = await fetch(ticket.uploadUrl, { method: "PUT", body: file, headers: { "content-type": file.type }, credentials: "omit", cache: "no-store" });
  } catch {
    throw new DashboardApiError("The image could not be uploaded.", 0, "network");
  }
  if (!response.ok) throw new DashboardApiError("The image could not be uploaded.", response.status, "server");
  const confirmed = await requestRecordResource(`/api/v1/media/${encodeURIComponent(ticket.mediaAssetId)}/confirm`, "POST");
  if (!object(confirmed) || confirmed.mediaAssetId !== ticket.mediaAssetId || confirmed.status !== "quarantined") throw new DashboardApiError("The image could not be confirmed.", 200, "server");
  return ticket.mediaAssetId;
}

export async function getCategoryImagePreviewUrl(mediaAssetId: string): Promise<string | null> {
  const response = await requestRecordResource(
    `/api/v1/media/${encodeURIComponent(mediaAssetId)}/view`,
    "POST",
  );
  if (!object(response) || response.disposition !== "inline" || !Array.isArray(response.items)) {
    return null;
  }
  const candidates = response.items.filter(
    (item): item is Record<string, unknown> =>
      object(item) &&
      ["thumbnail", "display"].includes(String(item.kind)) &&
      typeof item.url === "string",
  );
  const chosen =
    candidates.find((item) => item.kind === "thumbnail") ??
    candidates.find((item) => item.kind === "display");
  if (!chosen || typeof chosen.url !== "string") return null;
  try {
    return new URL(chosen.url).protocol === "https:" ? chosen.url : null;
  } catch {
    return null;
  }
}
