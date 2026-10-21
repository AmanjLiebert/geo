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
      const result = await listManagedCategories();
      setItems(result);
      setExpanded((current) =>
        current.size
          ? current
          : new Set(result.filter((item) => item.parentId === null).map((item) => item.id)),
      );
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
        if (!active) return;
        setItems(result);
        setExpanded(
          new Set(result.filter((item) => item.parentId === null).map((item) => item.id)),
        );
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
    if (cause instanceof DashboardApiError && cause.status === 403) {
      setReauthenticationCategoryId(categoryId);
      setError("Confirm your identity before changing publication status.");
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

  function CategoryCard({ item, child = false }: { item: ManagedCategory; child?: boolean }) {
    const parent = items.find((candidate) => candidate.id === item.parentId);
    const actions = getCategoryActions(item, child, parent);
    const imageId = item.draftRevision?.imageMediaAssetId ?? item.imageMediaAssetId;
    return (
      <article id={`category-${item.id}`} className={`${styles.card} ${child ? styles.childCard : ""}`}>
        <CategoryImagePreview mediaAssetId={imageId} alt={imageId ? `${item.name} category` : ""} compact />
        <div className={styles.cardBody}>
          <div className={styles.cardHeading}>
            <div>
              {child && <span className={styles.eyebrow}>Subcategory</span>}
              <h2>{item.name}</h2>
            </div>
            <div className={styles.badges}>
              {renderStatus(item)}
              {actions.hasUnpublishedChanges && <span className={`${styles.badge} ${styles.badge_changes}`}>Unpublished changes</span>}
              {actions.isReadyToPublish && <span className={`${styles.badge} ${styles.badge_ready}`}>Ready</span>}
            </div>
          </div>
          <p className={styles.summary}>{item.summary || "No summary has been added yet."}</p>
          {actions.showReadinessIssues && (
            <details className={styles.requirements}>
              <summary>Requirements before publication</summary>
              <ul>{item.readiness.issues.map((issue) => <li key={`${item.id}-${issue.code}`}>{issue.message}</li>)}</ul>
            </details>
          )}
          <div className={styles.actions}>
            {actions.canEdit && <Link className={styles.primaryAction} href={`/dashboard/categories/edit?categoryId=${encodeURIComponent(item.id)}`}>Edit category</Link>}
            {actions.canPublish && <button className={styles.publishAction} type="button" disabled={busyId === item.id || actions.isPublishDisabled} onClick={() => void handlePublish(item)}>{actions.publishLabel}</button>}
            {actions.canRestore && <button className={styles.restoreAction} type="button" disabled={busyId === item.id || actions.isRestoreDisabled} onClick={() => void handleArchive(item)}>Restore</button>}
          </div>
          {(actions.canUnpublish || actions.canRemove) && (
            <details className={styles.moreActions}>
              <summary>More actions</summary>
              <div className={styles.secondaryActions}>
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
          <div><h1>Categories</h1><p>Browse and manage the geological structure used by scientific records.</p></div>
        </div>
        <Link href="/dashboard/categories/new" className={styles.addButton}><Plus size={18} aria-hidden="true" /> Add category</Link>
      </header>
      {error && <p className={styles.error} role="alert">{error}</p>}
      {message && <p className={styles.success} role="status">{message}</p>}
      <section className={styles.toolbar} aria-label="Category filters">
        <label className={styles.searchField}><span>Search categories</span><span className={styles.searchControl}><Search size={18} aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by title or description" /></span></label>
        <label className={styles.filterField}><span>Status</span><select value={status} onChange={(event) => setStatus(event.target.value as CategoryBrowserStatus)}><option value="all">All statuses</option><option value="draft">Draft</option><option value="published">Published</option><option value="unpublished">Unpublished</option><option value="archived">Removed</option></select></label>
        <p className={styles.resultCount}>{visibleItems.length} {visibleItems.length === 1 ? "category" : "categories"}</p>
      </section>
      {loading ? <p className={styles.statePanel} role="status">Loading categories…</p> : roots.length === 0 ? <section className={styles.statePanel}><h2>No matching categories</h2><p>Change the search or status filter, or add a category.</p></section> : (
        <div className={styles.tree}>
          {roots.map((root) => {
            const children = visibleItems.filter((item) => item.parentId === root.id);
            const isExpanded = expanded.has(root.id);
            return <section key={root.id} className={styles.branch}><div className={styles.rootRow}>{children.length > 0 && <button className={styles.expandButton} type="button" onClick={() => toggle(root.id)} aria-expanded={isExpanded} aria-label={`${isExpanded ? "Collapse" : "Expand"} ${root.name}`}>{isExpanded ? <ChevronDown aria-hidden="true" /> : <ChevronRight aria-hidden="true" />}</button>}<CategoryCard item={root} /></div>{children.length > 0 && isExpanded && <div className={styles.children}>{children.map((child) => <CategoryCard key={child.id} item={child} child />)}</div>}</section>;
          })}
        </div>
      )}
    </main>
  );
}
