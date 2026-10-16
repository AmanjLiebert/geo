import { DashboardApiError } from "./dashboard-api";
import { requestRecordResource } from "./record-extras-api";

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
};

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function listManagedCategories(): Promise<ManagedCategory[]> {
  const response = await requestRecordResource("/api/v1/scientific-structure/categories/manage?locale=en");
  if (!object(response) || !Array.isArray(response.items)) throw new DashboardApiError("Categories could not be loaded.", 200, "server");
  return response.items.map((item: unknown) => {
    if (!object(item) || typeof item.id !== "string" || (item.parentId !== null && typeof item.parentId !== "string") || typeof item.name !== "string" || (item.summary !== null && typeof item.summary !== "string") || (item.description !== null && typeof item.description !== "string") || !["draft", "published"].includes(String(item.publicationStatus)) || !["active", "archived"].includes(String(item.status)) || !Number.isInteger(item.position) || (item.imageMediaAssetId !== null && typeof item.imageMediaAssetId !== "string") || (item.draftRevision !== null && (!object(item.draftRevision) || typeof item.draftRevision.title !== "string" || typeof item.draftRevision.summary !== "string" || typeof item.draftRevision.description !== "string" || !Number.isInteger(item.draftRevision.position) || (item.draftRevision.imageMediaAssetId !== null && typeof item.draftRevision.imageMediaAssetId !== "string")))) {
      throw new DashboardApiError("Categories could not be loaded.", 200, "server");
    }
    return { id: item.id, parentId: item.parentId, name: item.name, summary: item.summary, description: item.description, publicationStatus: item.publicationStatus, status: item.status, position: item.position, imageMediaAssetId: item.imageMediaAssetId, draftRevision: item.draftRevision } as ManagedCategory;
  });
}

export async function previewCategoryArchive(id: string): Promise<{ categoryCount: number; recordCount: number; status: "active" | "archived" }> {
  const result = await requestRecordResource(`/api/v1/scientific-structure/categories/${encodeURIComponent(id)}/archive-preview`);
  if (!object(result) || !Number.isInteger(result.categoryCount) || !Number.isInteger(result.recordCount) || !["active", "archived"].includes(String(result.status))) throw new DashboardApiError("Category impact could not be loaded.", 200, "server");
  return result as { categoryCount: number; recordCount: number; status: "active" | "archived" };
}

export async function changeCategoryArchive(id: string, restore: boolean, impact: { categoryCount: number; recordCount: number }): Promise<void> {
  const result = await requestRecordResource(`/api/v1/scientific-structure/categories/${encodeURIComponent(id)}/${restore ? "restore" : "archive"}`, "POST", impact);
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
