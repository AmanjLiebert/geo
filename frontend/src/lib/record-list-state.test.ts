import { describe, expect, it } from "vitest";
import {
  applyRecordListFilter,
  buildNewRecordHref,
  buildRecordEditHref,
  buildRecordListHref,
  buildRecordListSummary,
  buildRecordsSignInHref,
  defaultRecordListState,
  parseRecordListState,
  RECORD_LIST_MAX_PAGE,
  RECORD_LIST_PATH,
  sanitizeRecordsReturnTo,
  withRecordListPage,
} from "./record-list-state";

function parse(query: string) {
  return parseRecordListState(new URLSearchParams(query));
}

describe("record-list-state", () => {
  describe("parseRecordListState", () => {
    it("returns defaults for an empty query", () => {
      expect(parse("")).toEqual(defaultRecordListState);
    });

    it("parses known category, status, query, and page values", () => {
      expect(
        parse(
          "category=invertebrate-fossils&status=draft&query=ammonite&page=3",
        ),
      ).toEqual({
        category: "invertebrate-fossils",
        status: "draft",
        query: "ammonite",
        page: 3,
        view: "categories",
      });
    });

    it("trims category, query, and page values", () => {
      expect(
        parse("category=%20fossils%20&query=%20ammonite%20&page=%202%20"),
      ).toEqual({
        category: "fossils",
        status: "all",
        query: "ammonite",
        page: 2,
        view: "categories",
      });
    });

    it.each([
      ["category=Fossils", "category", null],
      ["category=fossils_rocks", "category", null],
      ["category=fossils%2F..%2Frecords", "category", null],
      ["status=deleted", "status", "all"],
      ["status=Draft", "status", "all"],
      ["query=a", "query", ""],
      ["query=", "query", ""],
      ["page=0", "page", 1],
      ["page=-2", "page", 1],
      ["page=two", "page", 1],
      ["page=1.5", "page", 1],
    ])("ignores or normalizes an invalid value: %s", (input, key, expected) => {
      const state = parse(input) as Record<string, unknown>;
      expect(state[key]).toBe(expected);
    });

    it("clamps an excessive page to the supported offset ceiling", () => {
      expect(parse(`page=${RECORD_LIST_MAX_PAGE + 200}`).page).toBe(
        RECORD_LIST_MAX_PAGE,
      );
    });

    it("ignores unknown parameters", () => {
      expect(parse("owner=someone&template=abc&page=2")).toEqual({
        ...defaultRecordListState,
        page: 2,
      });
    });
  });

  describe("buildRecordListHref", () => {
    it("returns the bare path when every value is default", () => {
      expect(buildRecordListHref(defaultRecordListState)).toBe(
        RECORD_LIST_PATH,
      );
    });

    it("serializes known values in a deterministic order and omits defaults", () => {
      expect(
        buildRecordListHref({
          category: "fossils",
          status: "published",
          query: "ammonite",
          page: 4,
          view: "all_records",
        }),
      ).toBe(
        `${RECORD_LIST_PATH}?category=fossils&status=published&query=ammonite&page=4&view=all`,
      );
    });

    it("round-trips a parsed state", () => {
      const href = `${RECORD_LIST_PATH}?category=fossils&status=draft&query=ammonite&page=2`;
      const state = parseRecordListState(
        new URLSearchParams(href.split("?")[1] ?? ""),
      );
      expect(buildRecordListHref(state)).toBe(href);
    });
  });

  describe("applyRecordListFilter", () => {
    const base = {
      category: "fossils",
      status: "draft",
      query: "ammonite",
      page: 4,
      view: "categories",
    } as const;

    it("resets pagination when the category changes", () => {
      expect(applyRecordListFilter(base, { category: "rocks" })).toEqual({
        category: "rocks",
        status: "draft",
        query: "ammonite",
        page: 1,
        view: "categories",
      });
    });

    it("resets pagination when status changes and preserves category", () => {
      expect(applyRecordListFilter(base, { status: "archived" })).toEqual({
        category: "fossils",
        status: "archived",
        query: "ammonite",
        page: 1,
        view: "categories",
      });
    });

    it("clears filters with explicit null and empty values", () => {
      expect(
        applyRecordListFilter(base, {
          category: null,
          status: "all",
          query: "",
        }),
      ).toEqual(defaultRecordListState);
    });

    it("does not reset unrelated values", () => {
      expect(applyRecordListFilter(base, {})).toEqual({ ...base, page: 1 });
    });

    it("preserves an explicit all-records view in the URL", () => {
      const allRecords = applyRecordListFilter(defaultRecordListState, {
        view: "all_records",
      });
      expect(buildRecordListHref(allRecords)).toBe(
        `${RECORD_LIST_PATH}?view=all`,
      );
      expect(parse("view=all").view).toBe("all_records");
    });
  });

  describe("withRecordListPage", () => {
    it("clamps pages to the supported range", () => {
      expect(withRecordListPage(defaultRecordListState, 0).page).toBe(1);
      expect(withRecordListPage(defaultRecordListState, 10_000_000).page).toBe(
        RECORD_LIST_MAX_PAGE,
      );
      expect(withRecordListPage(defaultRecordListState, 3).page).toBe(3);
    });
  });

  describe("sanitizeRecordsReturnTo", () => {
    it("accepts the bare records path", () => {
      expect(sanitizeRecordsReturnTo(RECORD_LIST_PATH)).toBe(RECORD_LIST_PATH);
    });

    it("accepts a known internal list URL and canonicalizes parameter order", () => {
      expect(
        sanitizeRecordsReturnTo(
          `${RECORD_LIST_PATH}?view=all&page=2&query=ammonite&status=draft&category=fossils`,
        ),
      ).toBe(
        `${RECORD_LIST_PATH}?category=fossils&status=draft&query=ammonite&page=2&view=all`,
      );
    });

    it("drops unknown or unsupported parameters", () => {
      expect(
        sanitizeRecordsReturnTo(
          `${RECORD_LIST_PATH}?category=fossils&template=secret-id&owner=user-1&page=2`,
        ),
      ).toBe(`${RECORD_LIST_PATH}?category=fossils&page=2`);
    });

    it("normalizes invalid known values to safe defaults", () => {
      expect(
        sanitizeRecordsReturnTo(
          `${RECORD_LIST_PATH}?category=Fossils&status=deleted&query=a&page=abc`,
        ),
      ).toBe(RECORD_LIST_PATH);
    });

    it.each([
      null,
      undefined,
      "",
      "   ",
      "https://evil.example/dashboard/records",
      "//evil.example/dashboard/records",
      "javascript:alert(1)",
      "/dashboard/records-evil",
      "/dashboard/records/edit?recordId=1",
      "/dashboard/categories",
      "/dashboard/records#fragment",
      "/dashboard/records?category=fossils#fragment",
      "\\dashboard\\records",
      "/dashboard/records?category=" + "x".repeat(4096),
    ])("rejects an unsafe return destination: %s", (value) => {
      expect(sanitizeRecordsReturnTo(value)).toBeNull();
    });
  });

  describe("buildRecordListSummary", () => {
    it("describes the unfiltered collection", () => {
      expect(
        buildRecordListSummary(12, defaultRecordListState, null, "All"),
      ).toBe("12 records");
    });

    it("names the category and status together", () => {
      expect(
        buildRecordListSummary(
          12,
          { category: "fossils", status: "draft", query: "" },
          "Fossils",
          "Draft",
        ),
      ).toBe("12 records in Fossils · Draft");
    });

    it("includes a title search and falls back when the category name is unknown", () => {
      expect(
        buildRecordListSummary(
          1,
          { category: "fossils", status: "published", query: "ammonite" },
          null,
          "Published",
        ),
      ).toBe(
        "1 record in the selected category · Published · matching “ammonite”",
      );
    });
  });

  describe("record workspace href helpers", () => {
    it("builds an edit href with an encoded return destination", () => {
      expect(
        buildRecordEditHref("record-1", `${RECORD_LIST_PATH}?category=fossils`),
      ).toBe(
        `${RECORD_LIST_PATH}/edit?recordId=record-1&returnTo=${encodeURIComponent(
          `${RECORD_LIST_PATH}?category=fossils`,
        )}`,
      );
    });

    it("omits the return destination when it is absent", () => {
      expect(buildRecordEditHref("record-1")).toBe(
        `${RECORD_LIST_PATH}/edit?recordId=record-1`,
      );
      expect(buildNewRecordHref()).toBe(`${RECORD_LIST_PATH}/new`);
    });

    it("builds a new-record href with a return destination", () => {
      expect(buildNewRecordHref(`${RECORD_LIST_PATH}?status=draft`)).toBe(
        `${RECORD_LIST_PATH}/new?returnTo=${encodeURIComponent(
          `${RECORD_LIST_PATH}?status=draft`,
        )}`,
      );
    });

    it("builds a sign-in href with a return destination", () => {
      expect(buildRecordsSignInHref(`${RECORD_LIST_PATH}?page=2`)).toBe(
        `/account?returnTo=${encodeURIComponent(`${RECORD_LIST_PATH}?page=2`)}`,
      );
      expect(buildRecordsSignInHref()).toBe("/account");
    });
  });
});
