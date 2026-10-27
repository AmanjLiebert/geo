import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardApiError } from "./dashboard-api";
import {
  addRecordRelationship,
  detachRecordMedia,
  listRecordMedia,
  listRecordRelationships,
  reorderRecordMedia,
  requestRecordResource,
  saveEnglishRecordDetails,
  setRecordPrimaryMedia,
  updateRecordMediaAttachment,
  uploadRecordMedia,
  validateMediaAttachments,
  validateRelationships,
} from "./record-extras-api";

const recordId = "11111111-1111-4111-8111-111111111111";
const targetId = "22222222-2222-4222-8222-222222222222";
const mediaId = "33333333-3333-4333-8333-333333333333";
const secondMediaId = "44444444-4444-4444-8444-444444444444";

function ok(data: unknown, status = 200): Response {
  return { ok: true, status, json: async () => data } as Response;
}

describe("record extras API", () => {
  beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it("distinguishes required identity confirmation from a real permission denial", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: 403,
            code: "reauthentication_required",
            detail: "Recent authentication is required for this protected action.",
          }),
          { status: 403, headers: { "content-type": "application/problem+json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ status: 403, detail: "Forbidden" }), {
          status: 403,
          headers: { "content-type": "application/problem+json" },
        }),
      );

    await expect(requestRecordResource(`/api/v1/records/${recordId}/publish`, "POST")).rejects.toMatchObject({
      kind: "reauthentication",
      status: 403,
      message: "Confirm your identity to continue this protected action.",
    });
    await expect(requestRecordResource(`/api/v1/records/${recordId}/publish`, "POST")).rejects.toMatchObject({
      kind: "forbidden",
      status: 403,
      message: "You do not have access to this action.",
    });
  });

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

  it("validates multi-attachment gallery lists and rejects malformed items", async () => {
    const validAttachment = {
      mediaAssetId: mediaId,
      purpose: "field photo",
      position: 0,
      caption: "North outcrop",
      description: "Limestone layer",
      altText: "Bedding planes",
      isPrimary: true,
      mediaKind: "image",
      processingStatus: "approved",
      filename: "outcrop.jpg",
      rightsStatement: "CC-BY-4.0",
      licence: "CC-BY-4.0",
      credit: "Survey Team",
    };
    vi.mocked(fetch).mockResolvedValueOnce(ok({ items: [validAttachment] }));
    const result = await listRecordMedia(recordId);
    expect(result).toHaveLength(1);
    expect(result[0].caption).toBe("North outcrop");
    expect(result[0].isPrimary).toBe(true);

    expect(() =>
      validateMediaAttachments({ items: [{ mediaAssetId: mediaId }] }),
    ).toThrow(DashboardApiError);

    expect(() =>
      validateMediaAttachments({
        items: [{ ...validAttachment, isPrimary: "yes" }],
      }),
    ).toThrow(DashboardApiError);

    expect(() =>
      validateMediaAttachments({
        items: [{ ...validAttachment, mediaAssetId: "not-a-uuid" }],
      }),
    ).toThrow(DashboardApiError);
    expect(() =>
      validateMediaAttachments({
        items: [{ ...validAttachment, position: 1.5 }],
      }),
    ).toThrow(DashboardApiError);
    expect(() =>
      validateMediaAttachments({
        items: [{ ...validAttachment, processingStatus: "secret-state" }],
      }),
    ).toThrow(DashboardApiError);
  });

  it("rejects unsupported video format like AVI", async () => {
    const aviVideo = {
      name: "field.avi",
      type: "video/x-msvideo",
      size: 100,
    } as File;
    await expect(
      uploadRecordMedia(recordId, aviVideo, {
        rightsStatement: "Owned",
        purpose: "field",
      }),
    ).rejects.toBeInstanceOf(DashboardApiError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("uploads supported MP4 and WebM videos through signed quarantine upload", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        ok({
          mediaAssetId: mediaId,
          uploadUrl: "https://storage.example.test/signed-video-upload",
          method: "PUT",
          requiredHeaders: { "content-type": "video/mp4" },
        }),
      )
      .mockResolvedValueOnce({ ok: true, status: 200 } as Response)
      .mockResolvedValueOnce(
        ok({ mediaAssetId: mediaId, status: "quarantined" }),
      )
      .mockResolvedValueOnce(ok({ mediaAssetId: mediaId }));

    const video = {
      name: "outcrop.mp4",
      type: "video/mp4",
      size: 1024 * 1024,
    } as File;
    await uploadRecordMedia(recordId, video, {
      rightsStatement: "Survey Team",
      purpose: "field observation",
      caption: "360 sweep of outcrop",
    });

    expect(vi.mocked(fetch).mock.calls[0][1]?.body).toContain('"video/mp4"');
    const [signedUrl, uploadInit] = vi.mocked(fetch).mock.calls[1];
    expect(signedUrl).toBe("https://storage.example.test/signed-video-upload");
    expect(uploadInit?.method).toBe("PUT");
    expect(uploadInit?.credentials).toBe("omit");
    expect(vi.mocked(fetch).mock.calls[2][0]).toContain(
      `/api/v1/media/${mediaId}/confirm`,
    );
    expect(vi.mocked(fetch).mock.calls[3][1]?.body).toContain(
      '"360 sweep of outcrop"',
    );
  });

  it("updates attachment metadata and selects primary image", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(ok({ recordId, mediaAssetId: mediaId }))
      .mockResolvedValueOnce(ok({ recordId, mediaAssetId: mediaId }));

    await updateRecordMediaAttachment(recordId, mediaId, {
      caption: "Updated caption",
      description: "Updated description",
      altText: "New alt text",
      position: 1,
    });
    expect(vi.mocked(fetch).mock.calls[0][0]).toContain(
      `/api/v1/media/records/${recordId}/attachments/${mediaId}`,
    );
    expect(vi.mocked(fetch).mock.calls[0][1]?.method).toBe("PATCH");

    await setRecordPrimaryMedia(recordId, mediaId);
    expect(vi.mocked(fetch).mock.calls[1][0]).toContain(
      `/api/v1/media/records/${recordId}/attachments/${mediaId}/primary`,
    );
    expect(vi.mocked(fetch).mock.calls[1][1]?.method).toBe("POST");
  });

  it("reorders attachments and detaches with DELETE", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(ok({ items: [] }))
      .mockResolvedValueOnce(ok({ success: true }));

    await reorderRecordMedia(recordId, [secondMediaId, mediaId]);
    expect(vi.mocked(fetch).mock.calls[0][0]).toContain(
      `/api/v1/media/records/${recordId}/attachments/order`,
    );
    expect(vi.mocked(fetch).mock.calls[0][1]?.method).toBe("PUT");
    expect(vi.mocked(fetch).mock.calls[0][1]?.body).toContain(secondMediaId);

    await detachRecordMedia(recordId, mediaId);
    expect(vi.mocked(fetch).mock.calls[1][0]).toContain(
      `/api/v1/media/records/${recordId}/attachments/${mediaId}`,
    );
    expect(vi.mocked(fetch).mock.calls[1][1]?.method).toBe("DELETE");
  });
});
