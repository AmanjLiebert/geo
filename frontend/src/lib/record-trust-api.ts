import { DashboardApiError } from "./dashboard-api";
import { requestRecordResource } from "./record-extras-api";

export type ReferenceChoice = {
  id: string;
  title: string;
  sourceType: string;
  identifier: string | null;
  verificationStatus: string;
};
export type RecordEvidenceItem = {
  id: string;
  referenceId: string;
  referenceTitle: string;
  sourceType: string;
  evidenceKind: string;
  fieldKey: string | null;
  notes: string | null;
  verificationStatus: string;
  canVerify: boolean;
};
export type RecordLocationItem = {
  id: string;
  label: string | null;
  visibility: "public" | "approximate" | "restricted" | "embargoed";
  regionLabel: string | null;
  exactLatitude: number;
  exactLongitude: number;
  publicLatitude: number | null;
  publicLongitude: number | null;
  publicPrecisionMetres: number | null;
  sensitivityReason: string | null;
  embargoUntil: string | null;
};

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function invalid(): never {
  throw new DashboardApiError(
    "The scientific service returned an invalid response.",
    200,
    "server",
  );
}

function geoPoint(value: unknown): { latitude: number; longitude: number } | null {
  if (
    !object(value) ||
    value.type !== "Point" ||
    !Array.isArray(value.coordinates) ||
    value.coordinates.length !== 2 ||
    typeof value.coordinates[0] !== "number" ||
    typeof value.coordinates[1] !== "number" ||
    !Number.isFinite(value.coordinates[0]) ||
    !Number.isFinite(value.coordinates[1])
  ) {
    return null;
  }
  return { longitude: value.coordinates[0], latitude: value.coordinates[1] };
}

export async function searchReferences(
  query: string,
): Promise<ReferenceChoice[]> {
  const response = await requestRecordResource(
    `/api/v1/references?limit=50&offset=0&q=${encodeURIComponent(query.trim())}`,
  );
  if (!object(response) || !Array.isArray(response.items)) return invalid();
  return response.items.map((item: unknown) => {
    if (
      !object(item) ||
      typeof item.id !== "string" ||
      typeof item.title !== "string" ||
      typeof item.sourceType !== "string" ||
      (item.identifier !== null && typeof item.identifier !== "string") ||
      typeof item.verificationStatus !== "string"
    )
      return invalid();
    return item as ReferenceChoice;
  });
}

export async function verifyReference(referenceId: string): Promise<void> {
  const response = await requestRecordResource(
    `/api/v1/references/${encodeURIComponent(referenceId)}/verify`,
    "POST",
  );
  if (!object(response) || typeof response.id !== "string") invalid();
}

export async function createReference(data: {
  sourceType: string;
  title: string;
  authors: Array<{ name: string }>;
  sourceUrl?: string;
  identifier?: string;
  publication?: string;
  publicationYear?: number;
  pagesOrFigure?: string;
  rightsStatement?: string;
}): Promise<string> {
  const response = await requestRecordResource(
    "/api/v1/references",
    "POST",
    data,
  );
  if (!object(response) || typeof response.id !== "string") return invalid();
  return response.id;
}

export async function listRecordEvidence(
  recordId: string,
): Promise<RecordEvidenceItem[]> {
  const response = await requestRecordResource(
    `/api/v1/records/${encodeURIComponent(recordId)}/evidence`,
  );
  if (!object(response) || !Array.isArray(response.items)) return invalid();
  return response.items.map((item: unknown) => {
    if (
      !object(item) ||
      typeof item.id !== "string" ||
      typeof item.referenceId !== "string" ||
      typeof item.referenceTitle !== "string" ||
      typeof item.sourceType !== "string" ||
      typeof item.evidenceKind !== "string" ||
      (item.fieldKey !== null && typeof item.fieldKey !== "string") ||
      (item.notes !== null && typeof item.notes !== "string") ||
      typeof item.verificationStatus !== "string" ||
      typeof item.canVerify !== "boolean"
    )
      return invalid();
    return item as RecordEvidenceItem;
  });
}

export async function addRecordEvidence(
  recordId: string,
  data: {
    referenceId: string;
    evidenceKind: string;
    fieldKey?: string;
    notes?: string;
  },
): Promise<void> {
  const response = await requestRecordResource(
    `/api/v1/records/${encodeURIComponent(recordId)}/evidence`,
    "POST",
    data,
  );
  if (!object(response) || typeof response.id !== "string") invalid();
}

export async function listRecordLocations(
  recordId: string,
): Promise<RecordLocationItem[]> {
  const response = await requestRecordResource(
    `/api/v1/records/${encodeURIComponent(recordId)}/locations`,
  );
  if (!object(response) || !Array.isArray(response.items)) return invalid();
  return response.items.map((item: unknown) => {
    const exactPoint = object(item) ? geoPoint(item.exact_geometry) : null;
    const publicPoint = object(item) ? geoPoint(item.public_geometry) : null;
    if (
      !object(item) ||
      typeof item.id !== "string" ||
      (item.label !== null && typeof item.label !== "string") ||
      !["public", "approximate", "restricted", "embargoed"].includes(
        String(item.visibility),
      ) ||
      (item.region_label !== null && typeof item.region_label !== "string") ||
      !exactPoint ||
      (item.public_geometry !== null && !publicPoint) ||
      (item.public_precision_metres !== null &&
        (!Number.isInteger(item.public_precision_metres) ||
          Number(item.public_precision_metres) < 0)) ||
      (item.sensitivity_reason !== null &&
        typeof item.sensitivity_reason !== "string") ||
      (item.embargo_until !== null && typeof item.embargo_until !== "string")
    )
      return invalid();
    return {
      id: item.id,
      label: item.label,
      visibility: item.visibility as RecordLocationItem["visibility"],
      regionLabel: item.region_label,
      exactLatitude: exactPoint.latitude,
      exactLongitude: exactPoint.longitude,
      publicLatitude: publicPoint?.latitude ?? null,
      publicLongitude: publicPoint?.longitude ?? null,
      publicPrecisionMetres:
        typeof item.public_precision_metres === "number"
          ? item.public_precision_metres
          : null,
      sensitivityReason: item.sensitivity_reason,
      embargoUntil: item.embargo_until,
    };
  });
}

export type NewRecordLocation = {
  label?: string;
  regionLabel?: string;
  exactLatitude: number;
  exactLongitude: number;
  visibility: "public" | "approximate" | "restricted" | "embargoed";
  publicLatitude?: number;
  publicLongitude?: number;
  publicPrecisionMetres?: number;
  sensitivityReason?: string;
  embargoUntil?: string;
};

export async function addRecordLocation(
  recordId: string,
  data: NewRecordLocation,
): Promise<void> {
  const response = await requestRecordResource(
    `/api/v1/records/${encodeURIComponent(recordId)}/locations`,
    "POST",
    data,
  );
  if (!object(response) || typeof response.id !== "string") invalid();
}
