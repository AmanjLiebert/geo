import { afterEach, describe, expect, it, vi } from "vitest";
import {
  listPublicCategories,
  listPublicRecords,
  publicScientificValidators,
} from "./public-scientific-api";

const category = {
  slug: "rocks",
  parentSlug: null,
  name: "Rocks",
  summary: "Published rock records",
  description: null,
  recordsAllowed: true,
  recordCount: 1,
  locale: "en",
  image: { viewEndpoint: "/api/v1/public/scientific/categories/rocks/image" },
};

const record = {
  publicId: "259a10d9-68c8-4d74-932f-0e75cf8b2fe1",
  slug: "granite-sample",
  title: "Granite sample",
  summary: "A published sample",
  category: { slug: "rocks", name: "Rocks" },
  recordType: "Rock specimen",
  locale: "en",
  publishedAt: "2026-10-24T10:00:00.000Z",
  updatedAt: "2026-10-24T10:00:00.000Z",
  image: {
    viewEndpoint: "/api/v1/public/scientific/records/259a10d9-68c8-4d74-932f-0e75cf8b2fe1/image",
    caption: "Granite",
  },
};

describe("public scientific API", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("accepts the minimal public category and record projections", () => {
    expect(publicScientificValidators.category(category)).toBe(true);
    expect(publicScientificValidators.recordSummary(record)).toBe(true);
    expect(
      publicScientificValidators.recordDetail({
        ...record,
        description: "A field description",
        fields: [{ label: "Colour", dataType: "text", unit: null, value: "grey" }],
        locations: [],
        references: [],
        media: [],
        relatedRecords: [],
      }),
    ).toBe(true);
  });

  it("accepts canonical UUIDv4 and deterministic UUIDv5 public identifiers", () => {
    expect(publicScientificValidators.recordSummary(record)).toBe(true);
    expect(
      publicScientificValidators.recordSummary({
        ...record,
        publicId: "2d09f6c8-f467-5c5b-8442-453e210393ce",
      }),
    ).toBe(true);
    expect(
      publicScientificValidators.recordSummary({
        ...record,
        publicId: "00000000-0000-0000-0000-000000000000",
      }),
    ).toBe(false);
    expect(
      publicScientificValidators.recordSummary({ ...record, publicId: "not-a-public-id" }),
    ).toBe(false);
  });

  it("rejects signed, external, or otherwise non-public image locations", () => {
    expect(
      publicScientificValidators.category({
        ...category,
        image: { viewEndpoint: "https://storage.example/private-object" },
      }),
    ).toBe(false);
    expect(
      publicScientificValidators.recordSummary({
        ...record,
        image: { viewEndpoint: `${record.image.viewEndpoint}?signature=secret` },
      }),
    ).toBe(false);
  });

  it("rejects malformed detail fields and insecure reference links", () => {
    expect(
      publicScientificValidators.recordDetail({
        ...record,
        description: null,
        fields: [{ label: "Colour", dataType: "text", unit: null }],
        locations: [],
        references: [],
        media: [],
        relatedRecords: [],
      }),
    ).toBe(false);
    expect(
      publicScientificValidators.recordDetail({
        ...record,
        description: null,
        fields: [],
        locations: [],
        references: [
          {
            sourceType: "website",
            authors: [],
            title: "Unsafe source",
            publication: null,
            year: null,
            identifier: null,
            pagesOrFigure: null,
            url: "http://example.com",
            rightsStatement: null,
            evidenceKind: "supporting",
          },
        ],
        media: [],
        relatedRecords: [],
      }),
    ).toBe(false);
  });

  it("loads categories and paginates records without accepting mock fallback data", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ items: [category], total: 1, limit: 100, offset: 0 })),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ items: Array.from({ length: 100 }, () => record), total: 101, limit: 100, offset: 0 }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ items: [record], total: 101, limit: 100, offset: 100 })),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(listPublicCategories()).resolves.toEqual([category]);
    await expect(listPublicRecords("rocks")).resolves.toHaveLength(101);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(String(fetchMock.mock.calls[2]?.[0])).toContain("offset=100");
  });
});
