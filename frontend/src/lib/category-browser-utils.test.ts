import { describe, expect, it } from "vitest";
import type { ManagedCategory } from "./category-management-api";
import { filterCategoryHierarchy } from "./category-browser-utils";

const base = {
  summary: null,
  description: null,
  publicationStatus: "draft" as const,
  status: "active" as const,
  position: 0,
  imageMediaAssetId: null,
  draftRevision: null,
  readiness: { publishable: false, issues: [] },
  hasUnpublishedChanges: false,
};

const items: ManagedCategory[] = [
  { ...base, id: "rocks", parentId: null, name: "Rocks", displayState: "published", publicationStatus: "published" },
  { ...base, id: "sedimentary", parentId: "rocks", name: "Sedimentary rocks", displayState: "draft" },
  { ...base, id: "fossils", parentId: null, name: "Fossils", displayState: "published", publicationStatus: "published" },
];

describe("filterCategoryHierarchy", () => {
  it("keeps a parent as context when a child matches", () => {
    expect(filterCategoryHierarchy(items, "sedimentary", "all").map((item) => item.id)).toEqual([
      "rocks",
      "sedimentary",
    ]);
  });

  it("shows children when their parent matches a text search", () => {
    expect(filterCategoryHierarchy(items, "rocks", "all").map((item) => item.id)).toEqual([
      "rocks",
      "sedimentary",
    ]);
  });

  it("filters by managed display state while retaining hierarchy context", () => {
    expect(filterCategoryHierarchy(items, "", "draft").map((item) => item.id)).toEqual([
      "rocks",
      "sedimentary",
    ]);
  });
});
