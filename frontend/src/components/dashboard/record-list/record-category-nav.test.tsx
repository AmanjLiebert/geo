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
  category(
    "cat-fossils-vert",
    "Vertebrate fossils",
    "vertebrate-fossils",
    "cat-fossils",
    2,
  ),
  category(
    "cat-fossils-inv",
    "Invertebrate fossils",
    "invertebrate-fossils",
    "cat-fossils",
    1,
  ),
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

function render(
  selectedSlug: string | null,
  options: { loading?: boolean; error?: boolean } = {},
) {
  return renderToStaticMarkup(
    createElement(RecordCategoryNav, {
      items: categories,
      selectedSlug,
      onSelect: vi.fn(),
      onShowAll: vi.fn(),
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
  it("starts with every top-level category and hides nested rows until drilled in", () => {
    const html = render(null);
    expect(html).toContain('aria-label="Filter records by category"');
    expect(html).toContain("Top-level categories");
    expect(html).toContain("Rocks and minerals");
    expect(html).toContain("Fossils");
    expect(html).toContain("2 subcategories");
    expect(html).not.toContain("Invertebrate fossils");
    expect(html).toContain(
      "Choose a category to see its subcategories and records.",
    );
    expect(html).toContain("View all records");
    expect(html).toContain("Skip category selection");
  });

  it("drills into a selected category's subcategories", () => {
    const html = render("fossils");
    expect(html).toContain("Subcategories of Fossils");
    expect(html).toContain("Invertebrate fossils");
    expect(html).toContain("Vertebrate fossils");
    expect(html).toContain('aria-current="page">Fossils');
    expect(html).toContain("All categories");
    expect(html).toContain(
      "Fossils includes records in its subcategories. Choose one to narrow further.",
    );
  });

  it("keeps the selected leaf visible with its siblings and a path back", () => {
    const html = render("invertebrate-fossils");
    expect(html).toContain("Subcategories of Fossils");
    expect(html).toContain("Vertebrate fossils");
    expect(html).toContain("Invertebrate fossils");
    expect(html).toContain('aria-current="true"');
    expect(html).toContain('aria-current="page">Invertebrate fossils');
  });

  it("falls back to the full tree when the selected category is not listed", () => {
    const html = render("legacy-category");
    expect(html).toContain(
      "Selected category is not in the current category list.",
    );
    expect(html).toContain("Show all categories");
    expect(html).toContain("Rocks and minerals");
  });

  it("shows a loading state without inventing categories", () => {
    const html = render(null, { loading: true });
    expect(html).toContain("Loading categories…");
    expect(html).not.toContain("Rocks and minerals");
  });

  it("explains a category-loading failure while leaving record filters usable", () => {
    const html = render(null, { error: true });
    expect(html).toContain("Category browsing is temporarily unavailable.");
    expect(html).toContain(
      "You can still search and filter records by status.",
    );
    expect(html).toContain("Retry");
  });

  it("keeps every interactive category target at least 44px", () => {
    for (const selector of [
      ".categoryButton",
      ".breadcrumbButton",
      ".retryButton",
      ".resetButton",
      ".showAllButton",
    ]) {
      expect(
        cssPx(cssDeclarations(selector), "min-height"),
        selector,
      ).toBeGreaterThanOrEqual(44);
    }
  });
});
