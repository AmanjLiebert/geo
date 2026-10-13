import { DashboardApiError } from "./dashboard-api";
import { requestRecordResource } from "./record-extras-api";

export type ManagedCategory = {
  id: string;
  parentId: string | null;
  name: string;
  summary: string | null;
  description: string | null;
  publicationStatus: "draft" | "published";
};

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function listManagedCategories(): Promise<ManagedCategory[]> {
  const response = await requestRecordResource("/api/v1/scientific-structure/categories?locale=en");
  if (!object(response) || !Array.isArray(response.items)) throw new DashboardApiError("Categories could not be loaded.", 200, "server");
  return response.items.map((item: unknown) => {
    if (!object(item) || typeof item.id !== "string" || (item.parentId !== null && typeof item.parentId !== "string") || typeof item.name !== "string" || (item.summary !== null && typeof item.summary !== "string") || (item.description !== null && typeof item.description !== "string") || !["draft", "published"].includes(String(item.publicationStatus))) {
      throw new DashboardApiError("Categories could not be loaded.", 200, "server");
    }
    return { id: item.id, parentId: item.parentId, name: item.name, summary: item.summary, description: item.description, publicationStatus: item.publicationStatus } as ManagedCategory;
  });
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
