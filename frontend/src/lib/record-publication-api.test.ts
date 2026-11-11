import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardApiError } from "./dashboard-api";
import {
  getRecordReadiness,
  publishRecord,
  requestRecordChanges,
  submitRecordForReview,
  unpublishRecord,
  validateRecordReadiness,
} from "./record-publication-api";

const recordId = "11111111-1111-4111-8111-111111111111";

function ok(value: unknown): Response {
  return { ok: true, status: 200, json: async () => value } as Response;
}

const record = {
  id: recordId,
  stableId: "22222222-2222-4222-8222-222222222222",
  slug: "sample-record",
  status: "draft",
  categoryId: "33333333-3333-4333-8333-333333333333",
  recordTypeId: "44444444-4444-4444-8444-444444444444",
  templateVersionId: "55555555-5555-4555-8555-555555555555",
  attributes: {},
  ownerUserId: "66666666-6666-4666-8666-666666666666",
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
  translations: [],
};

describe("record publication API", () => {
  beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it("validates actionable readiness without accepting malformed issues", async () => {
    const readiness = {
      recordId,
      status: "draft",
      isOwner: true,
      readyForReview: false,
      publishableByCurrentUser: false,
      issues: [{ field: "media", code: "primary_image_required", message: "Choose one primary image." }],
    };
    expect(validateRecordReadiness(readiness)).toEqual(readiness);
    expect(() =>
      validateRecordReadiness({ ...readiness, issues: [{ field: "media", code: 42, message: "Bad" }] }),
    ).toThrow(DashboardApiError);
  });

  it("loads readiness through an authenticated no-store request", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      ok({
        recordId,
        status: "draft",
        isOwner: true,
        readyForReview: true,
        publishableByCurrentUser: false,
        issues: [],
      }),
    );
    expect((await getRecordReadiness(recordId)).readyForReview).toBe(true);
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toContain(`/api/v1/records/${recordId}/readiness`);
    expect(init?.credentials).toBe("include");
    expect(init?.cache).toBe("no-store");
  });

  it.each([
    ["submit-review", submitRecordForReview],
    ["publish", publishRecord],
    ["unpublish", unpublishRecord],
  ] as const)("posts the %s transition and validates the record", async (action, run) => {
    vi.mocked(fetch).mockResolvedValueOnce(ok(record));
    await run(recordId);
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toContain(`/api/v1/records/${recordId}/${action}`);
    expect(init?.method).toBe("POST");
  });

  it("sends a bounded return-for-changes reason", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(ok(record));
    await requestRecordChanges(recordId, "Clarify the source.");
    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect(JSON.parse(String(init?.body))).toEqual({ reason: "Clarify the source." });
  });
});
