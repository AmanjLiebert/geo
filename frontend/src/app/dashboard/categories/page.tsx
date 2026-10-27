"use client";

import { ChevronDown, ChevronRight, FolderTree, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CategoryImagePreview } from "@/components/dashboard/category-management/category-image-preview";
import {
  changeCategoryArchive,
  getCategoryActions,
  getCategoryBadgeState,
  listManagedCategories,
  previewCategoryArchive,
  publishCategory,
  unpublishCategory,
  type ManagedCategory,
} from "@/lib/category-management-api";
import {
  filterCategoryHierarchy,
  shouldRevealCategoryChildren,
  type CategoryBrowserStatus,
} from "@/lib/category-browser-utils";
import { DashboardApiError } from "@/lib/dashboard-api";
import styles from "./page.module.css";

export default function CategoriesPage() {
  const [items, setItems] = useState<ManagedCategory[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<CategoryBrowserStatus>("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [reauthenticationCategoryId, setReauthenticationCategoryId] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      setItems(await listManagedCategories());
    } catch {
      setError("Categories could not be loaded. Refresh and try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    listManagedCategories()
      .then((result) => {
        if (active) setItems(result);
      })
      .catch(() => {
        if (active) setError("Categories could not be loaded. Refresh and try again.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const visibleItems = useMemo(
    () => filterCategoryHierarchy(items, query, status),
    [items, query, status],
  );
  const roots = visibleItems.filter((item) => item.parentId === null);

  function toggle(rootId: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(rootId)) next.delete(rootId);
      else next.add(rootId);
      return next;
    });
  }

  function protectedError(cause: unknown, categoryId: string, fallback: string) {
    if (cause instanceof DashboardApiError && cause.kind === "reauthentication") {
      setReauthenticationCategoryId(categoryId);
      setError("Confirm your identity before changing publication status.");
      return;
    }
    if (cause instanceof DashboardApiError && cause.kind === "forbidden") {
      setError(cause.message);
      return;
    }
    setError(fallback);
  }

  async function handlePublish(item: ManagedCategory) {
    const parent = items.find((candidate) => candidate.id === item.parentId);
    const actions = getCategoryActions(item, item.parentId !== null, parent);
    if (actions.isPublishDisabled) {
      setError("Complete the listed requirements before publishing this category.");
      return;
    }
    setBusyId(item.id);
    setError("");
    setMessage("");
    try {
      await publishCategory(item.id);
      setMessage(`“${item.name}” published.`);
      await refresh();
    } catch (cause) {
      protectedError(cause, item.id, "The category could not be published. Refresh and try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleUnpublish(item: ManagedCategory) {
    if (!window.confirm(`Unpublish “${item.name}”? It will be hidden from public view.`)) return;
    setBusyId(item.id);
    setError("");
    setMessage("");
    try {
      await unpublishCategory(item.id);
      setMessage(`“${item.name}” unpublished.`);
      await refresh();
    } catch (cause) {
      protectedError(cause, item.id, "The category could not be unpublished. Refresh and try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleArchive(item: ManagedCategory) {
    setBusyId(item.id);
    setError("");
    setMessage("");
    try {
      const impact = await previewCategoryArchive(item.id);
      const restore = item.status === "archived";
      const action = restore ? "Restore" : "Remove";
      if (!window.confirm(`${action} “${item.name}” and ${impact.categoryCount - 1} subcategories? ${impact.recordCount} records will be preserved.`)) return;
      await changeCategoryArchive(item.id, restore, impact);
      setMessage(restore ? `“${item.name}” restored.` : `“${item.name}” removed from active use.`);
      await refresh();
    } catch {
      setError("The category status could not be changed. Refresh and try again.");
    } finally {
      setBusyId(null);
    }
  }

  function renderStatus(item: ManagedCategory) {
    const badge = getCategoryBadgeState(item);
    const label = badge === "removed" ? "Removed" : badge;
    return <span className={`${styles.badge} ${styles[`badge_${badge}`]}`}>{label}</span>;
  }

  function CategoryRow({ item, child = false, childCount = 0, open = false, onToggle }: {
    item: ManagedCategory;
    child?: boolean;
    childCount?: number;
    open?: boolean;
    onToggle?: () => void;
  }) {
    const parent = items.find((candidate) => candidate.id === item.parentId);
    const actions = getCategoryActions(item, child, parent);
    const imageId = item.draftRevision?.imageMediaAssetId ?? item.imageMediaAssetId;
    const hasLifecycleActions = actions.canPublish || actions.canUnpublish || actions.canRemove;

    return (
      <article id={`category-${item.id}`} className={`${styles.categoryRow} ${child ? styles.childRow : ""}`}>
        {onToggle ? (
          <button className={styles.expandButton} type="button" onClick={onToggle} aria-expanded={open} aria-label={`${open ? "Collapse" : "Expand"} ${item.name}`}>
            {open ? <ChevronDown aria-hidden="true" /> : <ChevronRight aria-hidden="true" />}
          </button>
        ) : <span className={styles.toggleSpacer} aria-hidden="true" />}

        <div className={styles.thumbnail}>
          <CategoryImagePreview mediaAssetId={imageId} alt={imageId ? `${item.name} category` : ""} compact />
        </div>

        <div className={styles.identity}>
          <div className={styles.identityLine}>
            <h2>{item.name}</h2>
            {!child && childCount > 0 && <span className={styles.childCount}>{childCount} {childCount === 1 ? "subcategory" : "subcategories"}</span>}
          </div>
          <p>{item.summary || "No summary yet"}</p>
        </div>

        <div className={styles.stateCell}>
          {renderStatus(item)}
          {actions.hasUnpublishedChanges && <span className={styles.quietState}>Changes not live</span>}
          {actions.isReadyToPublish && <span className={styles.readyState}>Ready</span>}
          {actions.showReadinessIssues && <span className={styles.needsState}>Needs details</span>}
        </div>

        <div className={styles.rowActions}>
          {actions.canEdit && <Link className={styles.editAction} href={`/dashboard/categories/edit?categoryId=${encodeURIComponent(item.id)}`}>Edit</Link>}
          {actions.canRestore && <button className={styles.restoreAction} type="button" disabled={busyId === item.id || actions.isRestoreDisabled} onClick={() => void handleArchive(item)}>Restore</button>}
          {hasLifecycleActions && (
            <details className={styles.actionMenu}>
              <summary>Actions <ChevronDown size={16} aria-hidden="true" /></summary>
              <div className={styles.actionPanel}>
                {actions.showReadinessIssues && (
                  <section className={styles.readinessPanel}>
                    <h3>Before publishing</h3>
                    <ul>{item.readiness.issues.map((issue) => <li key={`${item.id}-${issue.code}`}>{issue.message}</li>)}</ul>
                  </section>
                )}
                {actions.canPublish && <button className={styles.publishAction} type="button" disabled={busyId === item.id || actions.isPublishDisabled} onClick={() => void handlePublish(item)}>{actions.publishLabel}</button>}
                {actions.canUnpublish && <button type="button" disabled={busyId === item.id} onClick={() => void handleUnpublish(item)}>Unpublish</button>}
                {actions.canRemove && <button className={styles.dangerAction} type="button" disabled={busyId === item.id} onClick={() => void handleArchive(item)}>Remove</button>}
              </div>
            </details>
          )}
          {reauthenticationCategoryId === item.id && <Link className={styles.identityLink} href={`/account?returnTo=${encodeURIComponent(`/dashboard/categories#category-${item.id}`)}`}>Confirm identity</Link>}
        </div>
      </article>
    );
  }

  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.titleGroup}>
          <div className={styles.titleIcon} aria-hidden="true"><FolderTree /></div>
          <div><h1>Categories</h1><p>Find a category, open its subcategories, or update its content.</p></div>
        </div>
        <Link href="/dashboard/categories/new" className={styles.addButton}><Plus size={18} aria-hidden="true" /> Add category</Link>
      </header>

      {error && <p className={styles.error} role="alert">{error}</p>}
      {message && <p className={styles.success} role="status">{message}</p>}

      <section className={styles.toolbar} aria-label="Category filters">
        <label className={styles.searchField}><span>Find a category</span><span className={styles.searchControl}><Search size={18} aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title or summary" /></span></label>
        <label className={styles.filterField}><span>Show</span><select value={status} onChange={(event) => setStatus(event.target.value as CategoryBrowserStatus)}><option value="all">All categories</option><option value="draft">Draft</option><option value="published">Published</option><option value="unpublished">Unpublished</option><option value="archived">Removed</option></select></label>
        <p className={styles.resultCount}>{visibleItems.length} {visibleItems.length === 1 ? "result" : "results"}</p>
      </section>

      {loading ? <p className={styles.statePanel} role="status">Loading categories…</p> : roots.length === 0 ? (
        <section className={styles.statePanel}><h2>No matching categories</h2><p>Change the search or filter, or add a category.</p></section>
      ) : (
        <div className={styles.tree} aria-label="Category hierarchy">
          {roots.map((root) => {
            const children = visibleItems.filter((item) => item.parentId === root.id);
            const totalChildCount = items.filter((item) => item.parentId === root.id).length;
            const isExpanded = shouldRevealCategoryChildren(expanded.has(root.id), query, status);
            return (
              <section key={root.id} className={styles.branch}>
                <CategoryRow item={root} childCount={totalChildCount} open={isExpanded} onToggle={totalChildCount > 0 ? () => toggle(root.id) : undefined} />
                {children.length > 0 && isExpanded && <div className={styles.children} role="group" aria-label={`${root.name} subcategories`}>{children.map((child) => <CategoryRow key={child.id} item={child} child />)}</div>}
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
