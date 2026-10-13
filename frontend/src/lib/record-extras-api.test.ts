import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardApiError } from "./dashboard-api";
import {
  addRecordRelationship,
  listRecordMedia,
  listRecordRelationships,
  saveEnglishRecordDetails,
  uploadRecordMedia,
  validateMediaAttachments,
  validateRelationships,
} from "./record-extras-api";

const recordId = "11111111-1111-4111-8111-111111111111";
const targetId = "22222222-2222-4222-8222-222222222222";
const mediaId = "33333333-3333-4333-8333-333333333333";

function ok(data: unknown, status = 200): Response {
  return { ok: true, status, json: async () => data } as Response;
}

describe("record extras API", () => {
  beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it("saves English details to the existing protected record endpoint", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      ok({
        id: recordId,
        stableId: targetId,
        slug: null,
        status: "draft",
        categoryId: targetId,
        recordTypeId: targetId,
        templateVersionId: targetId,
        attributes: {},
        ownerUserId: targetId,
        createdAt: "2026-10-01T00:00:00Z",
        updatedAt: "2026-10-01T00:00:00Z",
        translations: [],
      }),
    );
    await saveEnglishRecordDetails(recordId, {
      title: "Ammonite",
      summary: "",
      description: "",
    });
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toContain(`/api/v1/records/${recordId}/translations/en`);
    expect(init?.method).toBe("PUT");
    expect(init?.credentials).toBe("include");
    expect(init?.cache).toBe("no-store");
  });

  it("validates related-item list and uses an authenticated write", async () => {
    const item = {
      id: mediaId,
      targetType: "record",
      targetId,
      targetTitle: "Limestone",
      relationshipType: "related_to",
      notes: null,
      createdAt: "2026-10-01T00:00:00Z",
    };
    vi.mocked(fetch)
      .mockResolvedValueOnce(ok({ items: [item] }))
      .mockResolvedValueOnce(ok({ id: mediaId }));
    expect(await listRecordRelationships(recordId)).toEqual([item]);
    await addRecordRelationship(recordId, {
      targetType: "record",
      targetId,
      relationshipType: "related_to",
    });
    expect(vi.mocked(fetch).mock.calls[1][1]?.method).toBe("POST");
    expect(vi.mocked(fetch).mock.calls[1][1]?.credentials).toBe("include");
    expect(() =>
      validateRelationships({ items: [{ ...item, targetTitle: 7 }] }),
    ).toThrow(DashboardApiError);
  });

  it("rejects malformed media lists", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(ok({ items: [] }));
    expect(await listRecordMedia(recordId)).toEqual([]);
    expect(() =>
      validateMediaAttachments({ items: [{ mediaAssetId: mediaId }] }),
    ).toThrow(DashboardApiError);
  });

  it("never uploads an unsupported video", async () => {
    const video = { name: "field.mp4", type: "video/mp4", size: 100 } as File;
    await expect(
      uploadRecordMedia(recordId, video, {
        rightsStatement: "Owned",
        purpose: "field",
      }),
    ).rejects.toBeInstanceOf(DashboardApiError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("sends a supported file only to an HTTPS signed upload URL without app cookies", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        ok({
          mediaAssetId: mediaId,
          uploadUrl: "https://storage.example.test/signed-upload",
          method: "PUT",
          requiredHeaders: { "content-type": "image/png" },
        }),
      )
      .mockResolvedValueOnce({ ok: true, status: 200 } as Response)
      .mockResolvedValueOnce(
        ok({ mediaAssetId: mediaId, status: "quarantined" }),
      )
      .mockResolvedValueOnce(ok({ mediaAssetId: mediaId }));
    const file = { name: "field.png", type: "image/png", size: 64 } as File;
    await uploadRecordMedia(recordId, file, {
      rightsStatement: "Owned by author",
      purpose: "field photo",
    });
    const [signedUrl, uploadInit] = vi.mocked(fetch).mock.calls[1];
    expect(signedUrl).toBe("https://storage.example.test/signed-upload");
    expect(uploadInit?.method).toBe("PUT");
    expect(uploadInit?.credentials).toBe("omit");
    expect(vi.mocked(fetch).mock.calls[2][0]).toContain(
      `/api/v1/media/${mediaId}/confirm`,
    );
  });
});
