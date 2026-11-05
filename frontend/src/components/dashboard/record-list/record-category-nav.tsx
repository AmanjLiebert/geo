"use client";

import { useMemo, useState, type ReactNode } from "react";
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

function renderMobileOptions(
  nodes: RecordCategoryNode[],
  depth: number,
): ReactNode[] {
  return nodes.flatMap((node) => [
    <option key={node.slug} value={node.slug}>
      {`${"— ".repeat(depth)}${node.name}${
        node.children.length > 0 ? " (includes subcategories)" : ""
      }`}
    </option>,
    ...renderMobileOptions(node.children, depth + 1),
  ]);
}

function CategoryBranch({
  node,
  depth,
  selectedSlug,
  isExpanded,
  onToggle,
  onSelect,
}: {
  node: RecordCategoryNode;
  depth: number;
  selectedSlug: string | null;
  isExpanded: (slug: string) => boolean;
  onToggle: (slug: string) => void;
  onSelect: (slug: string) => void;
}) {
  const hasChildren = node.children.length > 0;
  const expanded = isExpanded(node.slug);
  const isSelected = selectedSlug === node.slug;
  const groupId = `record-category-children-${node.slug}`;

  return (
    <li className={styles.branch}>
      <div
        className={styles.categoryRow}
        style={depth > 0 ? { paddingInlineStart: `${depth * 16}px` } : undefined}
      >
        {hasChildren ? (
          <button
            type="button"
            className={styles.toggle}
            aria-expanded={expanded}
            aria-controls={groupId}
            aria-label={`${expanded ? "Hide" : "Show"} subcategories of ${node.name}`}
            onClick={() => onToggle(node.slug)}
          >
            <ChevronRight
              size={16}
              aria-hidden="true"
              className={expanded ? styles.chevronOpen : styles.chevron}
            />
          </button>
        ) : (
          <span className={styles.toggleSpacer} aria-hidden="true" />
        )}
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
          {node.name}
        </button>
      </div>
      {hasChildren && expanded && (
        <ul id={groupId} className={styles.children}>
          {node.children.map((child) => (
            <CategoryBranch
              key={child.slug}
              node={child}
              depth={depth + 1}
              selectedSlug={selectedSlug}
              isExpanded={isExpanded}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </li>
  );
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
  const selectedExists = pathSlugs.length > 0;
  const [expansion, setExpansion] = useState<{
    selection: string | null;
    expanded: Set<string>;
    collapsed: Set<string>;
  }>({
    selection: selectedSlug,
    expanded: new Set(),
    collapsed: new Set(),
  });
  const activeExpansion =
    expansion.selection === selectedSlug
      ? expansion
      : { selection: selectedSlug, expanded: new Set<string>(), collapsed: new Set<string>() };

  function isExpanded(slug: string): boolean {
    return (
      (pathSlugs.includes(slug) || activeExpansion.expanded.has(slug)) &&
      !activeExpansion.collapsed.has(slug)
    );
  }

  function toggle(slug: string) {
    setExpansion((current) => {
      const base =
        current.selection === selectedSlug
          ? current
          : {
              selection: selectedSlug,
              expanded: new Set<string>(),
              collapsed: new Set<string>(),
            };
      const nextExpanded = new Set(base.expanded);
      const nextCollapsed = new Set(base.collapsed);
      const currentlyExpanded =
        (pathSlugs.includes(slug) || nextExpanded.has(slug)) &&
        !nextCollapsed.has(slug);
      if (currentlyExpanded) {
        nextCollapsed.add(slug);
        nextExpanded.delete(slug);
      } else {
        nextCollapsed.delete(slug);
        nextExpanded.add(slug);
      }
      return {
        selection: selectedSlug,
        expanded: nextExpanded,
        collapsed: nextCollapsed,
      };
    });
  }

  const helperText = "Selecting a category includes its subcategories.";

  return (
    <section className={styles.root} aria-label="Filter records by category">
      <div className={styles.desktopNavigator}>
        <div className={styles.navHeading}>
          <FolderTree size={18} aria-hidden="true" />
          <h2>Categories</h2>
        </div>

        <button
          type="button"
          className={
            selectedSlug === null
              ? `${styles.allButton} ${styles.allButtonSelected}`
              : styles.allButton
          }
          aria-current={selectedSlug === null ? "true" : undefined}
          onClick={() => onSelect(null)}
        >
          All categories
        </button>
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
            No categories are available yet. Use All categories to browse every
            record.
          </p>
        )}

        {!loading && !error && tree.length > 0 && (
          <ul className={styles.tree}>
            {tree.map((node) => (
              <CategoryBranch
                key={node.slug}
                node={node}
                depth={0}
                selectedSlug={selectedSlug}
                isExpanded={isExpanded}
                onToggle={toggle}
                onSelect={onSelect}
              />
            ))}
          </ul>
        )}
      </div>

      <div className={styles.mobileNavigator}>
        <label className={styles.mobileField} htmlFor="record-category-select">
          <span>Categories</span>
          <select
            id="record-category-select"
            value={selectedSlug ?? ""}
            onChange={(event) => onSelect(event.target.value || null)}
          >
            <option value="">All categories</option>
            {selectedSlug && !selectedExists && (
              <option value={selectedSlug}>Selected category</option>
            )}
            {renderMobileOptions(tree, 0)}
          </select>
        </label>
        <p className={styles.hint}>{helperText}</p>
        {error && !loading && (
          <div className={styles.mobileError} role="alert">
            <span>Category browsing is temporarily unavailable. Search and status filters still work.</span>
            {onRetry && (
              <button type="button" className={styles.retryButton} onClick={onRetry}>
                <RotateCcw size={15} aria-hidden="true" /> Retry
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
