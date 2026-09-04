import { describe, expect, it } from "vitest";
import { listRecords } from "../content/repository";
import {
  EXPLORE_PAGE_SIZE,
  buildExploreHref,
  clampPage,
  filterExploreRecords,
  getRecordNavigation,
  paginateRecords,
  parseExploreQuery,
  serializeExploreQuery,
} from "./explore-utils";

describe("explore view utilities", () => {
  it("parses, sanitizes and serializes URL-backed state", () => {
    const state = parseExploreQuery({ q: "  calcite  ", region: "Erbil", page: "2", image: "1" });
    expect(state).toMatchObject({ q: "calcite", region: "Erbil", page: 2, image: 1 });
    expect(serializeExploreQuery(state)).toBe("q=calcite&region=Erbil&page=2&image=1");
    expect(parseExploreQuery({ page: "-9", image: "nope" })).toMatchObject({ page: 1, image: undefined });
  });

  it("builds stable links while allowing state changes", () => {
    const state = parseExploreQuery({ q: "fold", page: "2" });
    expect(buildExploreHref("/explore/formations", state, { page: 1, type: "Formation reference" }))
      .toBe("/explore/formations?q=fold&type=Formation+reference");
  });

  it("paginates a compact record grid and clamps impossible pages", () => {
    const records = listRecords({ category: "formations" });
    const firstPage = paginateRecords(records, 1);
    const lastPage = paginateRecords(records, 99);
    expect(firstPage.items).toHaveLength(EXPLORE_PAGE_SIZE);
    expect(lastPage.page).toBe(Math.ceil(records.length / EXPLORE_PAGE_SIZE));
    expect(lastPage.items.length).toBe(records.length - EXPLORE_PAGE_SIZE * (lastPage.page - 1));
    expect(clampPage(4, 0)).toBe(1);
  });

  it("walks records across the pagination boundary", () => {
    const records = listRecords({ category: "formations" });
    const lastOnFirstPage = records[EXPLORE_PAGE_SIZE - 1];
    const navigation = getRecordNavigation(records, lastOnFirstPage.slug);
    expect(navigation.next?.slug).toBe(records[EXPLORE_PAGE_SIZE].slug);
    expect(navigation.position).toBe(EXPLORE_PAGE_SIZE);
  });

  it("filters an in-memory collection without a route render", () => {
    const records = listRecords();
    const query = parseExploreQuery({ q: "Cretaceous", region: "Erbil" });
    const results = filterExploreRecords(records, "formations", query);
    expect(results.map((record) => record.slug)).toContain("carbonate-cliff-section");
    expect(results.every((record) => record.category === "formations")).toBe(true);
  });
});
