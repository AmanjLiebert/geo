import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildDashboardUrl,
  DashboardApiError,
  listDashboardRecords,
  listDashboardResearch,
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
});
