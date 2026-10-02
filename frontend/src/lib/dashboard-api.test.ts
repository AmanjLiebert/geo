import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildDashboardUrl,
  createRecord,
  DashboardApiError,
  getActiveTemplate,
  getRecord,
  getTemplateVersion,
  listCategoryRecordTypes,
  listDashboardNews,
  listDashboardPages,
  listDashboardRecords,
  listDashboardResearch,
  listStructureCategories,
  updateRecord,
  validateActiveTemplateResponse,
  validateCategoryListResponse,
  validateRecordDetailResponse,
  validateRecordTypeListResponse,
} from "./dashboard-api";

describe("dashboard-api", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("buildDashboardUrl", () => {
    it("composes query parameters omitting undefined or empty values", () => {
      const url = buildDashboardUrl("/api/v1/records", {
        limit: 20,
        offset: 0,
        status: "published",
        empty: "",
        notDefined: undefined,
      });
      expect(url).toContain("/api/v1/records?limit=20&offset=0&status=published");
      expect(url).not.toContain("empty");
      expect(url).not.toContain("notDefined");
    });

    it("returns clean path without query string when no parameters given", () => {
      const url = buildDashboardUrl("/api/v1/research", {});
      expect(url).toBe("/api/v1/research");
    });
  });

  describe("listDashboardRecords", () => {
    it("fetches records with credentials: 'include' and cache: 'no-store'", async () => {
      const mockData = {
        items: [
          {
            id: "rec-1",
            title: "Limestone Bedding",
            status: "published" as const,
            isClassified: true,
            updatedAt: "2026-01-02T00:00:00.000Z",
          },
        ],
        total: 1,
        limit: 20,
        offset: 0,
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockData),
      } as Response);

      const result = await listDashboardRecords({ limit: 20, offset: 0, status: "published" });

      expect(fetch).toHaveBeenCalledTimes(1);
      const [url, init] = vi.mocked(fetch).mock.calls[0];
      expect(url).toContain("/api/v1/records?limit=20&offset=0&status=published");
      expect(init?.credentials).toBe("include");
      expect(init?.cache).toBe("no-store");
      expect(result).toEqual(mockData);
    });

    it("maps 401 status to unauthorized error without leaking details", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: "Firebase token expired at xyz" }),
      } as Response);

      try {
        await listDashboardRecords();
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(DashboardApiError);
        const apiError = err as DashboardApiError;
        expect(apiError.status).toBe(401);
        expect(apiError.kind).toBe("unauthorized");
        expect(apiError.message).not.toContain("Firebase");
        expect(apiError.message).toContain("session has expired");
      }
    });

    it("maps 403 status to forbidden error without leaking details", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: () => Promise.resolve({ internalRole: "visitor", needed: "teacher" }),
      } as Response);

      try {
        await listDashboardRecords();
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(DashboardApiError);
        const apiError = err as DashboardApiError;
        expect(apiError.status).toBe(403);
        expect(apiError.kind).toBe("forbidden");
        expect(apiError.message).toContain("permission");
      }
    });

    it("maps 429 status to rate_limited error", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: () => Promise.resolve({}),
      } as Response);

      try {
        await listDashboardRecords();
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(DashboardApiError);
        const apiError = err as DashboardApiError;
        expect(apiError.status).toBe(429);
        expect(apiError.kind).toBe("rate_limited");
      }
    });

    it("maps network errors safely", async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new TypeError("Failed to fetch"));

      try {
        await listDashboardRecords();
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(DashboardApiError);
        const apiError = err as DashboardApiError;
        expect(apiError.status).toBe(0);
        expect(apiError.kind).toBe("network");
        expect(apiError.message).toContain("network connection");
      }
    });

    it("handles AbortSignal cancellation", async () => {
      const abortError = new DOMException("The operation was aborted.", "AbortError");
      vi.mocked(fetch).mockRejectedValueOnce(abortError);

      try {
        await listDashboardRecords({ signal: new AbortController().signal });
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(DashboardApiError);
        const apiError = err as DashboardApiError;
        expect(apiError.kind).toBe("aborted");
      }
    });

    it("throws server error on malformed 200 responses (non-object envelope)", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(["not", "an", "object"]),
      } as Response);

      await expect(listDashboardRecords()).rejects.toThrow(
        "The scientific server returned an unparseable response.",
      );
    });

    it("throws server error on malformed 200 responses (invalid pagination or non-array items)", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ total: -1, limit: 20, offset: 0, items: [] }),
      } as Response);

      await expect(listDashboardRecords()).rejects.toThrow(
        "The scientific server returned an unparseable response.",
      );
    });

    it("throws server error when record item has invalid status or non-boolean isClassified", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            total: 1,
            limit: 20,
            offset: 0,
            items: [
              {
                id: "rec-1",
                title: "Test",
                status: "invalid_status",
                isClassified: "not-a-boolean",
                updatedAt: "2026-01-01T00:00:00.000Z",
              },
            ],
          }),
      } as Response);

      try {
        await listDashboardRecords();
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(DashboardApiError);
        const apiError = err as DashboardApiError;
        expect(apiError.status).toBe(200);
        expect(apiError.kind).toBe("server");
      }
    });

    it("throws server error when record item has invalid updatedAt date string", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            total: 1,
            limit: 20,
            offset: 0,
            items: [
              {
                id: "rec-1",
                title: "Test",
                status: "draft",
                isClassified: false,
                updatedAt: "not-a-valid-date",
              },
            ],
          }),
      } as Response);

      await expect(listDashboardRecords()).rejects.toThrow(
        "The scientific server returned an unparseable response.",
      );
    });
  });

  describe("listDashboardResearch", () => {
    it("fetches research publications and parses minimal projection response", async () => {
      const mockData = {
        items: [
          {
            id: "res-1",
            title: "Tectonics of Kurdistan",
            status: "published" as const,
            publicationYear: 2024,
            doi: "10.1234/zagros",
            updatedAt: "2024-05-02T00:00:00.000Z",
          },
        ],
        total: 1,
        limit: 50,
        offset: 0,
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockData),
      } as Response);

      const result = await listDashboardResearch({ limit: 50, offset: 0 });

      expect(fetch).toHaveBeenCalledTimes(1);
      const [url, init] = vi.mocked(fetch).mock.calls[0];
      expect(url).toContain("/api/v1/research?limit=50&offset=0");
      expect(init?.credentials).toBe("include");
      expect(init?.cache).toBe("no-store");
      expect(result.items[0].id).toBe("res-1");
      expect(result.items[0].title).toBe("Tectonics of Kurdistan");
      expect(result.items[0].status).toBe("published");
      expect(result.items[0].publicationYear).toBe(2024);
      expect(result.items[0].doi).toBe("10.1234/zagros");
      expect(result.items[0].updatedAt).toBe("2024-05-02T00:00:00.000Z");
    });

    it("handles genuine empty state from API", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 }),
      } as Response);

      const result = await listDashboardResearch();
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });

    it("throws server error on malformed 200 responses (non-object envelope)", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(null),
      } as Response);

      await expect(listDashboardResearch()).rejects.toThrow(
        "The scientific server returned an unparseable response.",
      );
    });

    it("throws server error when research item has invalid status", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            total: 1,
            limit: 20,
            offset: 0,
            items: [
              {
                id: "res-1",
                title: "Paper",
                status: "unknown_status",
                publicationYear: 2023,
                doi: null,
                updatedAt: "2026-01-01T00:00:00.000Z",
              },
            ],
          }),
      } as Response);

      try {
        await listDashboardResearch();
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(DashboardApiError);
        const apiError = err as DashboardApiError;
        expect(apiError.status).toBe(200);
        expect(apiError.kind).toBe("server");
      }
    });

    it("throws server error when research item has non-integer publicationYear or non-string doi", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            total: 1,
            limit: 20,
            offset: 0,
            items: [
              {
                id: "res-1",
                title: "Paper",
                status: "draft",
                publicationYear: "twenty-twenty",
                doi: 12345,
                updatedAt: "2026-01-01T00:00:00.000Z",
              },
            ],
          }),
      } as Response);

      await expect(listDashboardResearch()).rejects.toThrow(
        "The scientific server returned an unparseable response.",
      );
    });
  });

  describe("listDashboardNews", () => {
    it("fetches news items and parses minimal projection response", async () => {
      const mockData = {
        items: [
          {
            id: "news-1",
            title: "New Discovery in Zagros",
            slug: "new-discovery-in-zagros",
            status: "published" as const,
            publishedAt: "2026-02-01T12:00:00.000Z",
            updatedAt: "2026-02-01T12:00:00.000Z",
          },
        ],
        total: 1,
        limit: 20,
        offset: 0,
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockData),
      } as Response);

      const result = await listDashboardNews({ limit: 20, offset: 0, status: "published" });

      expect(fetch).toHaveBeenCalledTimes(1);
      const [url, init] = vi.mocked(fetch).mock.calls[0];
      expect(url).toContain("/api/v1/editorial/news?limit=20&offset=0&status=published");
      expect(init?.credentials).toBe("include");
      expect(init?.cache).toBe("no-store");
      expect(result.items[0]).toEqual({
        id: "news-1",
        title: "New Discovery in Zagros",
        slug: "new-discovery-in-zagros",
        status: "published",
        publishedAt: "2026-02-01T12:00:00.000Z",
        updatedAt: "2026-02-01T12:00:00.000Z",
      });
      expect(result.total).toBe(1);
    });

    it("handles genuine empty state from API", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ items: [], total: 0, limit: 20, offset: 0 }),
      } as Response);

      const result = await listDashboardNews();
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });

    it("maps 403 status to forbidden error without leaking details", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: () => Promise.resolve({ error: "Missing MANAGE_NEWS permission" }),
      } as Response);

      try {
        await listDashboardNews();
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(DashboardApiError);
        const apiError = err as DashboardApiError;
        expect(apiError.status).toBe(403);
        expect(apiError.kind).toBe("forbidden");
        expect(apiError.message).toContain("permission");
      }
    });

    it("throws server error on malformed 200 response (invalid status)", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            items: [
              {
                id: "news-1",
                title: "Bad Status",
                slug: "bad-status",
                status: "nonexistent_status",
                publishedAt: null,
                updatedAt: "2026-01-01T00:00:00.000Z",
              },
            ],
            total: 1,
            limit: 20,
            offset: 0,
          }),
      } as Response);

      await expect(listDashboardNews()).rejects.toThrow(
        "The editorial server returned an unparseable response.",
      );
    });

    it("throws server error on malformed 200 response (invalid date)", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            items: [
              {
                id: "news-1",
                title: "Bad Date",
                slug: "bad-date",
                status: "draft",
                publishedAt: null,
                updatedAt: "invalid-date",
              },
            ],
            total: 1,
            limit: 20,
            offset: 0,
          }),
      } as Response);

      await expect(listDashboardNews()).rejects.toThrow(
        "The editorial server returned an unparseable response.",
      );
    });
  });

  describe("listDashboardPages", () => {
    it("fetches managed pages and parses minimal projection response", async () => {
      const mockData = {
        items: [
          {
            id: "page-1",
            pageType: "about",
            title: "About Geo-Kurdistan",
            status: "published" as const,
            effectiveAt: "2026-01-01T00:00:00.000Z",
            publishedAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        ],
        total: 1,
        limit: 10,
        offset: 0,
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockData),
      } as Response);

      const result = await listDashboardPages({ limit: 10, offset: 0, status: "published" });

      expect(fetch).toHaveBeenCalledTimes(1);
      const [url, init] = vi.mocked(fetch).mock.calls[0];
      expect(url).toContain("/api/v1/editorial/pages?limit=10&offset=0&status=published");
      expect(init?.credentials).toBe("include");
      expect(init?.cache).toBe("no-store");
      expect(result.items[0]).toEqual({
        id: "page-1",
        pageType: "about",
        title: "About Geo-Kurdistan",
        status: "published",
        effectiveAt: "2026-01-01T00:00:00.000Z",
        publishedAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      });
      expect(result.total).toBe(1);
    });

    it("handles genuine empty state from API", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ items: [], total: 0, limit: 10, offset: 0 }),
      } as Response);

      const result = await listDashboardPages();
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });

    it("maps 403 status to forbidden error without leaking details", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: () => Promise.resolve({ error: "Missing MANAGE_SITE_CONTENT permission" }),
      } as Response);

      try {
        await listDashboardPages();
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(DashboardApiError);
        const apiError = err as DashboardApiError;
        expect(apiError.status).toBe(403);
        expect(apiError.kind).toBe("forbidden");
        expect(apiError.message).toContain("permission");
      }
    });

    it("throws server error on malformed 200 response (missing pageType)", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            items: [
              {
                id: "page-1",
                pageType: "",
                title: "Test Page",
                status: "draft",
                effectiveAt: null,
                publishedAt: null,
                updatedAt: "2026-01-01T00:00:00.000Z",
              },
            ],
            total: 1,
            limit: 10,
            offset: 0,
          }),
      } as Response);

      await expect(listDashboardPages()).rejects.toThrow(
        "The editorial server returned an unparseable response.",
      );
    });

    it("throws server error on malformed 200 response (invalid date in effectiveAt)", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            items: [
              {
                id: "page-1",
                pageType: "terms",
                title: "Terms",
                status: "draft",
                effectiveAt: "not-a-date",
                publishedAt: null,
                updatedAt: "2026-01-01T00:00:00.000Z",
              },
            ],
            total: 1,
            limit: 10,
            offset: 0,
          }),
      } as Response);

      await expect(listDashboardPages()).rejects.toThrow(
        "The editorial server returned an unparseable response.",
      );
    });
  });

  describe("listStructureCategories", () => {
    it("fetches categories and validates runtime shape", async () => {
      const mockCategories = {
        items: [
          {
            id: "cat-1",
            parentId: null,
            stableKey: "fossils",
            slug: "fossils",
            recordsAllowed: false,
            position: 1,
            name: "Fossils",
            description: "Fossil specimens",
            locale: "en",
            translationAvailable: true,
          },
          {
            id: "cat-2",
            parentId: "cat-1",
            stableKey: "invertebrates",
            slug: "invertebrates",
            recordsAllowed: true,
            position: 1,
            name: "Invertebrate fossils",
            description: null,
            locale: "en",
            translationAvailable: true,
          },
        ],
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockCategories),
      } as Response);

      const result = await listStructureCategories("en");
      expect(result.items).toHaveLength(2);
      expect(result.items[0].id).toBe("cat-1");
      expect(result.items[0].parentId).toBeNull();
      expect(result.items[0].recordsAllowed).toBe(false);
      expect(result.items[1].parentId).toBe("cat-1");
      expect(result.items[1].recordsAllowed).toBe(true);
    });

    it("rejects malformed categories response", () => {
      expect(() => validateCategoryListResponse({ items: "not-an-array" })).toThrow(
        DashboardApiError,
      );
      expect(() =>
        validateCategoryListResponse({
          items: [{ id: "cat-1", stableKey: "k" }],
        }),
      ).toThrow(DashboardApiError);
    });
  });

  describe("listCategoryRecordTypes", () => {
    it("fetches record types for a specified category", async () => {
      const mockTypes = {
        items: [
          {
            id: "rt-1",
            stableKey: "specimen",
            position: 1,
            name: "Physical Specimen",
            description: "Physical geological specimen",
            activeTemplateVersionId: "tv-1",
            locale: "en",
            translationAvailable: true,
          },
        ],
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockTypes),
      } as Response);

      const result = await listCategoryRecordTypes("cat-1", "en");
      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe("rt-1");
      expect(result.items[0].name).toBe("Physical Specimen");
      expect(result.items[0].activeTemplateVersionId).toBe("tv-1");
    });

    it("rejects malformed record types response", () => {
      expect(() => validateRecordTypeListResponse({ items: [{ invalid: true }] })).toThrow(
        DashboardApiError,
      );
    });
  });

  describe("getActiveTemplate", () => {
    it("fetches active template with all field data types and definitions", async () => {
      const mockTemplate = {
        id: "tmpl-1",
        stableKey: "specimen-template",
        name: "Specimen Template",
        version: { id: "tv-1", number: 1, status: "active" },
        fields: [
          {
            id: "f-1",
            stableKey: "formation",
            dataType: "text",
            required: true,
            validation: { minLength: 2, maxLength: 100 },
            unit: null,
            searchable: true,
            filterable: true,
            position: 1,
            status: "active",
            label: "Formation",
            helpText: "Stratigraphic unit",
            locale: "en",
            translationAvailable: true,
          },
          {
            id: "f-2",
            stableKey: "age_ma",
            dataType: "decimal",
            required: false,
            validation: { minimum: 0 },
            unit: "Ma",
            searchable: false,
            filterable: true,
            position: 2,
            status: "active",
            label: "Age",
            helpText: "Age in millions of years",
            locale: "en",
            translationAvailable: true,
          },
        ],
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockTemplate),
      } as Response);

      const result = await getActiveTemplate("cat-1", "rt-1", "en");
      expect(result.id).toBe("tmpl-1");
      expect(result.fields).toHaveLength(2);
      expect(result.fields[0].dataType).toBe("text");
      expect(result.fields[0].required).toBe(true);
      expect(result.fields[1].unit).toBe("Ma");
    });

    it("rejects invalid field data type in template response", () => {
      const invalidTemplate = {
        id: "tmpl-1",
        stableKey: "k",
        name: "Name",
        version: { id: "v1", number: 1, status: "active" },
        fields: [
          {
            id: "f-1",
            stableKey: "f",
            dataType: "invalid_type",
            required: false,
            validation: {},
            unit: null,
            searchable: false,
            filterable: false,
            position: 1,
            status: "active",
            label: "Label",
            helpText: null,
            locale: "en",
            translationAvailable: true,
          },
        ],
      };
      expect(() => validateActiveTemplateResponse(invalidTemplate)).toThrow(DashboardApiError);
    });
  });

  describe("createRecord, getRecord, and updateRecord", () => {
    const validRecordDetail = {
      id: "rec-1",
      stableId: "stab-1",
      slug: "my-draft-specimen",
      status: "draft",
      categoryId: "cat-1",
      recordTypeId: "rt-1",
      templateVersionId: "tv-1",
      attributes: { formation: "Bekhme", age_ma: 68.5 },
      ownerUserId: "user-1",
      createdAt: "2026-03-01T00:00:00.000Z",
      updatedAt: "2026-03-01T00:00:00.000Z",
      translations: [],
    };

    it("validates record detail response and rejects malformed responses", () => {
      const valid = validateRecordDetailResponse(validRecordDetail);
      expect(valid.id).toBe("rec-1");
      expect(valid.status).toBe("draft");

      expect(() => validateRecordDetailResponse(null)).toThrow(DashboardApiError);
      expect(() => validateRecordDetailResponse({ id: "rec-1" })).toThrow(DashboardApiError);
    });

    it("creates a draft record via POST /api/v1/records", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve(validRecordDetail),
      } as Response);

      const result = await createRecord({
        categoryId: "cat-1",
        recordTypeId: "rt-1",
        slug: "my-draft-specimen",
        attributes: { formation: "Bekhme" },
      });

      expect(fetch).toHaveBeenCalledTimes(1);
      const [url, init] = vi.mocked(fetch).mock.calls[0];
      expect(url).toContain("/api/v1/records");
      expect(init?.method).toBe("POST");
      expect(result.id).toBe("rec-1");
      expect(result.status).toBe("draft");
      expect(result.attributes.formation).toBe("Bekhme");
    });

    it("retrieves a draft record by ID via GET /api/v1/records/:id", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(validRecordDetail),
      } as Response);

      const result = await getRecord("rec-1");
      expect(result.id).toBe("rec-1");
      expect(result.slug).toBe("my-draft-specimen");
      expect(result.attributes.age_ma).toBe(68.5);
    });

    it("updates a draft record via PATCH /api/v1/records/:id", async () => {
      const updatedDetail = {
        ...validRecordDetail,
        attributes: { formation: "Shiranish", age_ma: 70 },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(updatedDetail),
      } as Response);

      const result = await updateRecord("rec-1", {
        attributes: { formation: "Shiranish", age_ma: 70 },
      });

      expect(fetch).toHaveBeenCalledTimes(1);
      const [url, init] = vi.mocked(fetch).mock.calls[0];
      expect(url).toContain("/api/v1/records/rec-1");
      expect(init?.method).toBe("PATCH");
      expect(result.attributes.formation).toBe("Shiranish");
    });

    it("parses 400 validation error with field-level issues", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () =>
          Promise.resolve({
            message: "Record attributes are invalid.",
            issues: [
              { field: "formation", code: "minLength", message: "Use at least 2 characters." },
            ],
          }),
      } as Response);

      try {
        await createRecord({ attributes: { formation: "A" } });
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(DashboardApiError);
        const apiErr = err as DashboardApiError;
        expect(apiErr.kind).toBe("validation");
        expect(apiErr.status).toBe(400);
        expect(apiErr.message).toBe("Record attributes are invalid.");
        expect(apiErr.issues).toHaveLength(1);
        expect(apiErr.issues[0].field).toBe("formation");
        expect(apiErr.issues[0].message).toBe("Use at least 2 characters.");
      }
    });

    it("parses 400 class-validator array messages", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () =>
          Promise.resolve({
            message: ["slug must match /^[a-z0-9]+(?:-[a-z0-9]+)*$/"],
          }),
      } as Response);

      try {
        await createRecord({ slug: "Invalid Slug" });
        expect.fail("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(DashboardApiError);
        const apiErr = err as DashboardApiError;
        expect(apiErr.kind).toBe("validation");
        expect(apiErr.message).toContain("slug must match");
      }
    });

    it("loads pinned template version via getTemplateVersion", async () => {
      const versionId = "77777777-7777-4777-8777-777777777777";
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            id: "tmpl-pinned",
            stableKey: "fossil_specimen",
            name: "Fossil Specimen",
            version: { id: versionId, number: 1, status: "superseded" },
            fields: [
              {
                id: "fld-1",
                stableKey: "genus",
                dataType: "text",
                required: true,
                validation: {},
                unit: null,
                searchable: true,
                filterable: true,
                position: 1,
                status: "active",
                label: "Genus",
                helpText: null,
                locale: "en",
                translationAvailable: true,
              },
            ],
          }),
      } as Response);

      const template = await getTemplateVersion(versionId);
      expect(template.id).toBe("tmpl-pinned");
      expect(template.version.id).toBe(versionId);
      expect(template.version.number).toBe(1);
      expect(template.fields).toHaveLength(1);
      expect(template.fields[0].stableKey).toBe("genus");
    });
  });

  describe("updateRecord", () => {
    const recordId = "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d";
    const sampleRecord = {
      id: recordId,
      stableId: "stable-1",
      slug: null,
      status: "draft",
      categoryId: "11111111-1111-4111-8111-111111111111",
      recordTypeId: "22222222-2222-4222-8222-222222222222",
      templateVersionId: "33333333-3333-4333-8333-333333333333",
      attributes: { sample: "value" },
      ownerUserId: "usr-1",
      createdAt: "2026-03-01T00:00:00.000Z",
      updatedAt: "2026-03-01T00:00:00.000Z",
    };

    it("sends slug: null in payload when slug is explicitly cleared", async () => {
      let capturedBody: string | undefined;
      vi.mocked(fetch).mockImplementationOnce((_url, init) => {
        capturedBody = init?.body as string;
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve(sampleRecord),
        } as Response);
      });

      const result = await updateRecord(recordId, {
        slug: null,
        attributes: { sample: "value" },
      });

      expect(JSON.parse(capturedBody ?? "{}")).toEqual({
        slug: null,
        attributes: { sample: "value" },
      });
      expect(result.slug).toBeNull();
    });

    it("omits slug from payload when slug is undefined (omitted)", async () => {
      let capturedBody: string | undefined;
      vi.mocked(fetch).mockImplementationOnce((_url, init) => {
        capturedBody = init?.body as string;
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve({ ...sampleRecord, slug: "existing-slug" }),
        } as Response);
      });

      const result = await updateRecord(recordId, {
        attributes: { sample: "value" },
      });

      expect(JSON.parse(capturedBody ?? "{}")).toEqual({
        attributes: { sample: "value" },
      });
      expect(result.slug).toBe("existing-slug");
    });
  });
});
