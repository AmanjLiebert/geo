import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardApiError } from "./dashboard-api";
import {
  addRecordEvidence,
  addRecordLocation,
  createReference,
  getReference,
  listRecordEvidence,
  listRecordLocations,
  searchReferences,
  updateReference,
} from "./record-trust-api";

const recordId = "11111111-1111-4111-8111-111111111111";
const referenceId = "22222222-2222-4222-8222-222222222222";
function ok(value: unknown): Response {
  return { ok: true, status: 200, json: async () => value } as Response;
}

describe("record trust API", () => {
  beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it("searches references with an encoded query and validates the list", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      ok({
        items: [
          {
            id: referenceId,
            title: "Limestone study",
            sourceType: "journal",
            identifier: null,
          },
        ],
        total: 1,
        limit: 50,
        offset: 0,
      }),
    );
    expect((await searchReferences("  field & map  "))[0]?.title).toBe(
      "Limestone study",
    );
    expect(vi.mocked(fetch).mock.calls[0][0]).toContain("q=field%20%26%20map");
  });

  it("creates and attaches a source using protected writes", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(ok({ id: referenceId }))
      .mockResolvedValueOnce(ok({ id: referenceId }));
    expect(
      await createReference({
        sourceType: "journal",
        title: "Study",
        authors: [{ name: "Researcher" }],
        identifier: "10.1234/example",
        publication: "Journal of Regional Geology",
        publicationYear: 2026,
        pagesOrFigure: "12–18",
        rightsStatement: "Used as a bibliographic citation",
      }),
    ).toBe(referenceId);
    await addRecordEvidence(recordId, {
      referenceId,
      evidenceKind: "published_source",
    });
    expect(vi.mocked(fetch).mock.calls[0][1]?.method).toBe("POST");
    const createBody = JSON.parse(
      String(vi.mocked(fetch).mock.calls[0][1]?.body),
    );
    expect(createBody.publicationYear).toBe(2026);
    expect(createBody.pagesOrFigure).toBe("12–18");
    expect(vi.mocked(fetch).mock.calls[1][1]?.credentials).toBe("include");
    expect(vi.mocked(fetch).mock.calls[1][0]).toContain(
      `/api/v1/records/${recordId}/evidence`,
    );
  });

  it("loads and updates a saved source without a verification action", async () => {
    const source = {
      id: referenceId,
      sourceType: "journal",
      authors: [{ name: "Researcher" }],
      title: "Study",
      publication: "Journal",
      publicationYear: 2026,
      identifier: "doi:example",
      pagesOrFigure: null,
      sourceUrl: null,
      rightsStatement: null,
    };
    vi.mocked(fetch)
      .mockResolvedValueOnce(ok(source))
      .mockResolvedValueOnce(ok(source));
    expect((await getReference(referenceId)).title).toBe("Study");
    await updateReference(referenceId, {
      sourceType: "journal",
      authors: [{ name: "Researcher" }],
      title: "Updated study",
      identifier: "doi:example",
    });
    expect(vi.mocked(fetch).mock.calls[1][1]?.method).toBe("PATCH");
    expect(vi.mocked(fetch).mock.calls[1][0]).toContain(
      `/references/${referenceId}`,
    );
  });

  it("validates evidence and location response fields", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        ok({
          items: [
            {
              id: referenceId,
              referenceId,
              referenceTitle: "Study",
              sourceType: "journal",
              evidenceKind: "published_source",
              fieldKey: null,
              notes: null,
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        ok({
          items: [
            {
              id: referenceId,
              label: "Site",
              visibility: "restricted",
              region_label: "Zagros",
              exact_geometry: { type: "Point", coordinates: [44.25, 36.5] },
              public_geometry: null,
              public_precision_metres: null,
              sensitivity_reason: "Sensitive fossil locality",
              embargo_until: null,
            },
          ],
        }),
      );
    expect(await listRecordEvidence(recordId)).toHaveLength(1);
    expect((await listRecordLocations(recordId))[0]).toMatchObject({
      visibility: "restricted",
      regionLabel: "Zagros",
      exactLatitude: 36.5,
      exactLongitude: 44.25,
      sensitivityReason: "Sensitive fossil locality",
    });
    vi.mocked(fetch).mockResolvedValueOnce(
      ok({
        items: [
          {
            id: referenceId,
            label: "Bad",
            visibility: "everyone",
            region_label: null,
          },
        ],
      }),
    );
    await expect(listRecordLocations(recordId)).rejects.toBeInstanceOf(
      DashboardApiError,
    );
  });

  it("submits a restricted location without public coordinates", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(ok({ id: referenceId }));
    await addRecordLocation(recordId, {
      exactLatitude: 36,
      exactLongitude: 44,
      visibility: "restricted",
      sensitivityReason: "Protected field site",
    });
    const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body));
    expect(body.visibility).toBe("restricted");
    expect(body.publicLatitude).toBeUndefined();
    expect(body.publicLongitude).toBeUndefined();
  });
});
