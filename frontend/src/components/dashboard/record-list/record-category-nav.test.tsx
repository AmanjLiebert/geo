import { readFileSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { StructureCategory } from "@/lib/dashboard-api";
import {
  buildRecordCategoryTree,
  getRecordCategoryPathSlugs,
  RecordCategoryNav,
} from "./record-category-nav";

function category(
  id: string,
  name: string,
  slug: string,
  parentId: string | null,
  position: number,
): StructureCategory {
  return {
    id,
    parentId,
    stableKey: slug,
    slug,
    recordsAllowed: parentId !== null,
    position,
    name,
    description: null,
    locale: "en",
    translationAvailable: true,
  };
}

const categories = [
  category("cat-fossils", "Fossils", "fossils", null, 1),
  category("cat-fossils-vert", "Vertebrate fossils", "vertebrate-fossils", "cat-fossils", 2),
  category("cat-fossils-inv", "Invertebrate fossils", "invertebrate-fossils", "cat-fossils", 1),
  category("cat-rocks", "Rocks and minerals", "rocks", null, 0),
];

const css = readFileSync(
  path.join(import.meta.dirname, "record-category-nav.module.css"),
  "utf8",
);

function cssDeclarations(selector: string): string {
  for (const rule of css.split("}")) {
    const [selectors, body] = rule.split("{");
    if (!body) continue;
    if (selectors.split(",").some((entry) => entry.trim() === selector)) {
      return body;
    }
  }
  throw new Error(`No CSS rule declares ${selector}`);
}

function cssPx(declarations: string, property: string): number {
  for (const declaration of declarations.split(";")) {
    const [name, value] = declaration.split(":");
    if (name?.trim() !== property) continue;
    const match = /^(\d+)px$/.exec(value?.trim() ?? "");
    if (match) return Number(match[1]);
  }
  throw new Error(`No ${property} in pixels`);
}

function render(selectedSlug: string | null, options: { loading?: boolean; error?: boolean } = {}) {
  return renderToStaticMarkup(
    createElement(RecordCategoryNav, {
      items: categories,
      selectedSlug,
      onSelect: vi.fn(),
      onRetry: vi.fn(),
      ...options,
    }),
  );
}

describe("buildRecordCategoryTree", () => {
  it("builds a positioned hierarchy from the existing scientific categories", () => {
    const tree = buildRecordCategoryTree(categories);
    expect(tree.map((node) => node.slug)).toEqual(["rocks", "fossils"]);
    expect(tree[1]?.children.map((node) => node.slug)).toEqual([
      "invertebrate-fossils",
      "vertebrate-fossils",
    ]);
  });

  it("omits orphaned categories instead of inventing a second taxonomy", () => {
    const tree = buildRecordCategoryTree([
      ...categories,
      category("cat-orphan", "Orphan", "orphan", "missing-parent", 0),
    ]);
    expect(tree.map((node) => node.slug)).toEqual(["rocks", "fossils"]);
    expect(JSON.stringify(tree)).not.toContain("orphan");
  });

  it("returns the ancestor path for a selected descendant", () => {
    const tree = buildRecordCategoryTree(categories);
    expect(getRecordCategoryPathSlugs(tree, "invertebrate-fossils")).toEqual([
      "fossils",
      "invertebrate-fossils",
    ]);
    expect(getRecordCategoryPathSlugs(tree, "missing")).toEqual([]);
  });
});

describe("RecordCategoryNav", () => {
  it("presents All categories, the hierarchy, and the descendant hint", () => {
    const html = render(null);
    expect(html).toContain('aria-label="Filter records by category"');
    expect(html).toContain("All categories");
    expect(html).toContain('aria-current="true"');
    expect(html).toContain("Fossils");
    expect(html).toContain("Rocks and minerals");
    expect(html).toContain("Selecting a category includes its subcategories.");
    expect(html).toContain("Show subcategories of Fossils");
  });

  it("marks the selected category and reveals its path", () => {
    const html = render("invertebrate-fossils");
    expect(html).toContain('aria-current="true"');
    expect(html).toContain("Invertebrate fossils");
    expect(html).toContain("Vertebrate fossils");
  });

  it("always offers a flat, labelled mobile selector with descendant options", () => {
    const html = render(null);
    expect(html).toContain('for="record-category-select"');
    expect(html).toContain('<option value=""');
    expect(html).toContain("All categories</option>");
    expect(html).toContain("Fossils (includes subcategories)</option>");
    expect(html).toContain("— Invertebrate fossils</option>");
  });

  it("keeps a fallback option when the selected category is not in the list", () => {
    const html = render("legacy-category");
    expect(html).toContain('<option value="legacy-category"');
    expect(html).toContain("Selected category</option>");
  });

  it("shows a loading state without hiding All categories", () => {
    const html = render(null, { loading: true });
    expect(html).toContain("Loading categories…");
    expect(html).toContain("All categories");
  });

  it("explains a category-loading failure while leaving record filters usable", () => {
    const html = render(null, { error: true });
    expect(html).toContain("Category browsing is temporarily unavailable.");
    expect(html).toContain("You can still search and filter records by status.");
    expect(html).toContain("Retry");
  });

  it("keeps every interactive category target at least 44px", () => {
    for (const selector of [
      ".allButton",
      ".categoryButton",
      ".mobileField select",
      ".retryButton",
    ]) {
      expect(cssPx(cssDeclarations(selector), "min-height"), selector).toBeGreaterThanOrEqual(44);
    }

    const toggle = cssDeclarations(".toggle");
    expect(cssPx(toggle, "width")).toBeGreaterThanOrEqual(44);
    expect(cssPx(toggle, "min-width")).toBeGreaterThanOrEqual(44);
    expect(cssPx(toggle, "height")).toBeGreaterThanOrEqual(44);
  });
});
