import { describe, expect, it } from "vitest";
import type {
  PublicCategory,
  PublicRecordDetail,
  PublicRecordSummary,
} from "@/lib/public-scientific-api";
import { mapPublicCategories, mapPublicRecord, mapPublicRecordDetail } from "./public-explore";

const categories: PublicCategory[] = [
  {
    slug: "rocks",
    parentSlug: null,
    name: "Rocks",
    summary: "Rock collections",
    description: "Published rock material",
    recordsAllowed: false,
    recordCount: 1,
    locale: "en",
    image: null,
  },
  {
    slug: "igneous-rocks",
    parentSlug: "rocks",
    name: "Igneous rocks",
    summary: null,
    description: null,
    recordsAllowed: true,
    recordCount: 1,
    locale: "en",
    image: null,
  },
];

const summary: PublicRecordSummary = {
  publicId: "259a10d9-68c8-4d74-932f-0e75cf8b2fe1",
  slug: "granite-sample",
  title: "Granite sample",
  summary: null,
  category: { slug: "igneous-rocks", name: "Igneous rocks" },
  recordType: "Rock specimen",
  locale: "en",
  publishedAt: "2026-10-24T10:00:00.000Z",
  updatedAt: "2026-10-24T10:00:00.000Z",
  image: null,
};

describe("public Explore mapping", () => {
  it("keeps the managed hierarchy and never invents missing images or descriptions", () => {
    const mapped = mapPublicCategories(categories);
    expect(mapped[0]?.themes).toEqual(["Igneous rocks"]);
    expect(mapped[1]?.parentSlug).toBe("rocks");
    expect(mapped[1]?.image.src).toBe("");
    expect(mapped[1]?.overview).toBe("No public description is available yet.");
  });

  it("makes descendant records discoverable through their root category path", () => {
    const record = mapPublicRecord(summary, categories);
    expect(record.categoryPath).toEqual(["igneous-rocks", "rocks"]);
    expect(record.status).toBe("Published");
    expect(record.image.src).toBe("");
    expect(record.summary).toBe("No public summary is available yet.");
  });

  it("maps only real public fields, safe locations, and verified references", () => {
    const detail: PublicRecordDetail = {
      ...summary,
      description: "Coarse-grained granite.",
      fields: [{ label: "Grain size", dataType: "text", unit: "mm", value: "5" }],
      locations: [
        {
          label: null,
          visibility: "region_only",
          regionLabel: "Erbil Governorate",
          precisionMetres: null,
          geometry: null,
        },
      ],
      references: [
        {
          sourceType: "journal",
          authors: ["A. Researcher"],
          title: "Regional granites",
          publication: "Geology Journal",
          year: 2025,
          identifier: "doi:example",
          pagesOrFigure: "12–18",
          url: "https://example.com/reference",
          rightsStatement: null,
          evidenceKind: "supporting",
        },
      ],
    };

    const mapped = mapPublicRecordDetail(detail, categories);
    expect(mapped.record.region).toBe("Erbil Governorate");
    expect(mapped.detail.sections.map((section) => section.title)).toEqual([
      "Record details",
      "Published location",
      "Verified sources",
    ]);
    expect(mapped.detail.related).toEqual([]);
    expect(mapped.gallery).toEqual([]);
  });
});
