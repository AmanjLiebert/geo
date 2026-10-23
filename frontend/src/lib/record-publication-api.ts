import {
  DashboardApiError,
  validateRecordDetailResponse,
  type ScientificRecordDetail,
  type ScientificRecordStatus,
} from "./dashboard-api";
import { requestRecordResource } from "./record-extras-api";

export type RecordReadinessIssue = {
  field: string;
  code: string;
  message: string;
};

export type RecordReadiness = {
  recordId: string;
  status: ScientificRecordStatus;
  isOwner: boolean;
  readyForReview: boolean;
  publishableByCurrentUser: boolean;
  issues: RecordReadinessIssue[];
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

const statuses: ScientificRecordStatus[] = [
  "unclassified_draft",
  "draft",
  "in_review",
  "published",
  "archived",
];

export function validateRecordReadiness(value: unknown): RecordReadiness {
  if (
    !object(value) ||
    typeof value.recordId !== "string" ||
    !statuses.includes(value.status as ScientificRecordStatus) ||
    typeof value.isOwner !== "boolean" ||
    typeof value.readyForReview !== "boolean" ||
    typeof value.publishableByCurrentUser !== "boolean" ||
    !Array.isArray(value.issues)
  ) {
    return invalid();
  }
  const issues = value.issues.map((issue) => {
    if (
      !object(issue) ||
      typeof issue.field !== "string" ||
      typeof issue.code !== "string" ||
      typeof issue.message !== "string"
    ) {
      return invalid();
    }
    return {
      field: issue.field,
      code: issue.code,
      message: issue.message,
    };
  });
  return {
    recordId: value.recordId,
    status: value.status as ScientificRecordStatus,
    isOwner: value.isOwner,
    readyForReview: value.readyForReview,
    publishableByCurrentUser: value.publishableByCurrentUser,
    issues,
  };
}

export async function getRecordReadiness(recordId: string) {
  return validateRecordReadiness(
    await requestRecordResource(
      `/api/v1/records/${encodeURIComponent(recordId)}/readiness`,
    ),
  );
}

async function transition(
  recordId: string,
  action: "submit-review" | "publish" | "unpublish",
): Promise<ScientificRecordDetail> {
  return validateRecordDetailResponse(
    await requestRecordResource(
      `/api/v1/records/${encodeURIComponent(recordId)}/${action}`,
      "POST",
    ),
  );
}

export function submitRecordForReview(recordId: string) {
  return transition(recordId, "submit-review");
}

export function publishRecord(recordId: string) {
  return transition(recordId, "publish");
}

export function unpublishRecord(recordId: string) {
  return transition(recordId, "unpublish");
}

export async function requestRecordChanges(
  recordId: string,
  reason: string,
): Promise<ScientificRecordDetail> {
  return validateRecordDetailResponse(
    await requestRecordResource(
      `/api/v1/records/${encodeURIComponent(recordId)}/request-changes`,
      "POST",
      { reason },
    ),
  );
}
