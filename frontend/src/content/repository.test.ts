import { describe, expect, it } from "vitest";
import {
  getCategoryBySlug,
  getFieldObservation,
  getProduct,
  getRecordBySlug,
  getResearch,
  getResearchDocument,
  listProducts,
  listRecords,
  listResearch,
  searchContent,
} from "./repository";

describe("showcase content repository", () => {
  it("searches geological records across names, localities, ages and formations", () => {
    expect(listRecords({ q: "Rawandiz" }).some((record) => record.slug === "rawandiz-folded-landscape")).toBe(true);
    expect(listRecords({ q: "Cretaceous" }).some((record) => record.geologicalAge?.includes("Cretaceous"))).toBe(true);
    expect(listRecords({ q: "Qamchuqa" }).map((record) => record.slug)).toContain("carbonate-cliff-section");
  });

  it("combines category-specific filters", () => {
    const results = listRecords({ category: "formations", region: "Erbil", age: "Cretaceous" });
    expect(results.length).toBeGreaterThan(0);
    expect(results.map((record) => record.slug)).toContain("carbonate-cliff-section");
    expect(results.every((record) => record.category === "formations" && record.region.includes("Erbil") && record.geologicalAge?.includes("Cretaceous"))).toBe(true);
  });

  it("returns an empty collection for unmatched filters", () => {
    expect(listRecords({ category: "minerals", formation: "not-a-formation" })).toEqual([]);
    expect(listResearch({ q: "not-a-publication" })).toEqual([]);
  });

  it("filters publications and study objects by their local display categories", () => {
    expect(listResearch({ type: "Methods paper" }).map((item) => item.slug)).toEqual(["cataloguing-regional-formations", "mountain-springs-observation-guide"]);
    expect(listProducts({ category: "Map print" }).map((item) => item.slug)).toEqual(["zagros-fold-map"]);
  });

  it("keeps every showcase publication connected to readable content", () => {
    expect(listResearch()).toHaveLength(9);
    expect(listResearch().every((publication) => getResearchDocument(publication.slug)?.sections.length)).toBe(true);
  });

  it("groups global search results by discriminated content kind", () => {
    const results = searchContent({ q: "Rawandiz" });
    expect(new Set(results.map((result) => result.kind))).toEqual(new Set(["record", "research", "location", "field"]));
    expect(searchContent({ q: "field", type: "research" }).every((result) => result.kind === "research")).toBe(true);
  });

  it("applies contextual region refinement across compatible search result types", () => {
    const results = searchContent({ q: "Rawandiz", region: "Erbil" });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((result) => !result.context.includes("Sulaymaniyah"))).toBe(true);
  });

  it("returns undefined for invalid dynamic-route slugs", () => {
    expect(getCategoryBySlug("missing")).toBeUndefined();
    expect(getRecordBySlug("rocks", "missing")).toBeUndefined();
    expect(getResearch("missing")).toBeUndefined();
    expect(getFieldObservation("missing")).toBeUndefined();
    expect(getProduct("missing")).toBeUndefined();
  });
});
