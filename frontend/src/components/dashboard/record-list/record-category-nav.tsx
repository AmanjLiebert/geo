"use client";

import { useMemo } from "react";
import { ChevronRight, FolderTree, RotateCcw } from "lucide-react";
import type { StructureCategory } from "@/lib/dashboard-api";
import styles from "./record-category-nav.module.css";

export type RecordCategoryNode = {
  slug: string;
  name: string;
  children: RecordCategoryNode[];
};

export function buildRecordCategoryTree(
  items: StructureCategory[],
): RecordCategoryNode[] {
  const sorted = [...items].sort(
    (left, right) =>
      left.position - right.position || left.name.localeCompare(right.name),
  );
  const nodesById = new Map<string, RecordCategoryNode>();
  for (const item of sorted) {
    nodesById.set(item.id, {
      slug: item.slug,
      name: item.name,
      children: [],
    });
  }

  const roots: RecordCategoryNode[] = [];
  for (const item of sorted) {
    const node = nodesById.get(item.id);
    if (!node) continue;
    if (item.parentId === null) {
      roots.push(node);
      continue;
    }
    const parent = nodesById.get(item.parentId);
    if (parent) parent.children.push(node);
  }
  return roots;
}

export function getRecordCategoryPathSlugs(
  nodes: RecordCategoryNode[],
  slug: string,
): string[] {
  for (const node of nodes) {
    if (node.slug === slug) return [node.slug];
    const childPath = getRecordCategoryPathSlugs(node.children, slug);
    if (childPath.length > 0) return [node.slug, ...childPath];
  }
  return [];
}

function findRecordCategoryNode(
  nodes: RecordCategoryNode[],
  slug: string,
): RecordCategoryNode | null {
  for (const node of nodes) {
    if (node.slug === slug) return node;
    const match = findRecordCategoryNode(node.children, slug);
    if (match) return match;
  }
  return null;
}

export function RecordCategoryNav({
  items,
  selectedSlug,
  onSelect,
  loading = false,
  error = false,
  onRetry,
}: {
  items: StructureCategory[];
  selectedSlug: string | null;
  onSelect: (slug: string | null) => void;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
}) {
  const tree = useMemo(() => buildRecordCategoryTree(items), [items]);
  const pathSlugs = useMemo(
    () => (selectedSlug ? getRecordCategoryPathSlugs(tree, selectedSlug) : []),
    [tree, selectedSlug],
  );
  const trail = pathSlugs.flatMap((slug) => {
    const node = findRecordCategoryNode(tree, slug);
    return node ? [node] : [];
  });
  const selectedNode = trail.length > 0 ? trail[trail.length - 1] : null;
  const selectedExists = selectedNode !== null;

  // Clicking a category both filters the records and opens that branch. A leaf
  // keeps its parent level open so its siblings remain one click away.
  const openNode = selectedNode
    ? selectedNode.children.length > 0
      ? selectedNode
      : trail.length > 1
        ? trail[trail.length - 2]
        : null
    : null;
  const levelNodes = openNode ? openNode.children : tree;
  const levelHeading = openNode
    ? `Subcategories of ${openNode.name}`
    : "Top-level categories";

  const helperText = !selectedNode
    ? "Choose a category to see its subcategories and records."
    : selectedNode.children.length > 0
      ? `${selectedNode.name} includes records in its subcategories. Choose one to narrow further.`
      : "Choose a sibling category, or use the path above to go back.";

  return (
    <section className={styles.root} aria-label="Filter records by category">
      <div className={styles.navigator}>
        <div className={styles.navHeading}>
          <FolderTree size={18} aria-hidden="true" />
          <h2>Categories</h2>
        </div>

        {selectedNode && (
          <nav className={styles.breadcrumbs} aria-label="Category path">
            <ol className={styles.breadcrumbList}>
              <li>
                <button
                  type="button"
                  className={styles.breadcrumbButton}
                  onClick={() => onSelect(null)}
                >
                  All categories
                </button>
              </li>
              {trail.map((node, index) => {
                const isCurrent = index === trail.length - 1;
                return (
                  <li key={node.slug}>
                    {isCurrent ? (
                      <span
                        className={styles.breadcrumbCurrent}
                        aria-current="page"
                      >
                        {node.name}
                      </span>
                    ) : (
                      <button
                        type="button"
                        className={styles.breadcrumbButton}
                        onClick={() => onSelect(node.slug)}
                      >
                        {node.name}
                      </button>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        )}

        {selectedSlug && !selectedExists && (
          <div className={styles.notice}>
            <p>Selected category is not in the current category list.</p>
            <button
              type="button"
              className={styles.resetButton}
              onClick={() => onSelect(null)}
            >
              Show all categories
            </button>
          </div>
        )}

        <p className={styles.hint}>{helperText}</p>

        {loading && (
          <p className={styles.state} role="status">
            Loading categories…
          </p>
        )}

        {!loading && error && (
          <div className={styles.errorState} role="alert">
            <p>Category browsing is temporarily unavailable.</p>
            <p>You can still search and filter records by status.</p>
            {onRetry && (
              <button type="button" className={styles.retryButton} onClick={onRetry}>
                <RotateCcw size={15} aria-hidden="true" /> Retry
              </button>
            )}
          </div>
        )}

        {!loading && !error && tree.length === 0 && (
          <p className={styles.state}>
            No categories are available yet. Records remain searchable without a
            category.
          </p>
        )}

        {!loading && !error && levelNodes.length > 0 && (
          <div className={styles.level}>
            <h3 className={styles.levelHeading}>{levelHeading}</h3>
            <ul className={styles.levelList}>
              {levelNodes.map((node) => {
                const isSelected = selectedSlug === node.slug;
                const hasChildren = node.children.length > 0;
                return (
                  <li key={node.slug}>
                    <button
                      type="button"
                      className={
                        isSelected
                          ? `${styles.categoryButton} ${styles.categoryButtonSelected}`
                          : styles.categoryButton
                      }
                      aria-current={isSelected ? "true" : undefined}
                      onClick={() => onSelect(node.slug)}
                    >
                      <span className={styles.categoryText}>
                        <span className={styles.categoryName}>{node.name}</span>
                        <span className={styles.categoryMeta}>
                          {hasChildren
                            ? `${node.children.length} ${
                                node.children.length === 1
                                  ? "subcategory"
                                  : "subcategories"
                              }`
                            : "View records"}
                        </span>
                      </span>
                      {hasChildren && (
                        <ChevronRight
                          size={16}
                          aria-hidden="true"
                          className={styles.chevron}
                        />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
