"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import {
  changeCategoryArchive,
  createManagedCategory,
  getCategoryActions,
  getCategoryBadgeState,
  listManagedCategories,
  previewCategoryArchive,
  publishCategory,
  saveCategoryDraft,
  unpublishCategory,
  uploadCategoryImage,
  type ManagedCategory,
} from "@/lib/category-management-api";
import { DashboardApiError } from "@/lib/dashboard-api";
import styles from "./page.module.css";

export default function CategoriesPage() {
  const [items, setItems] = useState<ManagedCategory[]>([]);
  const [parentId, setParentId] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [rights, setRights] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [reauthenticationCategoryId, setReauthenticationCategoryId] = useState<string | null>(null);
  const [editing, setEditing] = useState<ManagedCategory | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editSummary, setEditSummary] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPosition, setEditPosition] = useState(0);
  const [editImage, setEditImage] = useState<File | null>(null);
  const [editRights, setEditRights] = useState("");
  const [removeImage, setRemoveImage] = useState(false);

  async function changeArchive(item: ManagedCategory) {
    setBusy(true); setError(""); setMessage("");
    try {
      const impact = await previewCategoryArchive(item.id);
      const restore = item.status === "archived";
      const action = restore ? "Restore" : "Remove";
      if (!window.confirm(`${action} ${item.name} and ${impact.categoryCount - 1} subcategories? ${impact.recordCount} records will be preserved.`)) return;
      await changeCategoryArchive(item.id, restore, impact);
      setMessage(restore ? "Category restored." : "Category removed from active use. Records were preserved.");
      await refresh();
    } catch { setError("Category status could not be changed. Refresh and try again."); }
    finally { setBusy(false); }
  }

  async function handlePublish(item: ManagedCategory) {
    if (item.readiness && !item.readiness.publishable) {
      setError("This category is not ready for publication. Resolve the missing requirements below.");
      return;
    }
    setBusy(true); setError(""); setMessage(""); setReauthenticationCategoryId(null);
    try {
      await publishCategory(item.id);
      setMessage(`"${item.name}" published successfully.`);
      await refresh();
    } catch (cause) {
      handleProtectedActionError(cause, item.id, "The category could not be published. Refresh and try again.");
    } finally { setBusy(false); }
  }

  async function handleUnpublish(item: ManagedCategory) {
    if (!window.confirm(`Unpublish "${item.name}"? It will be hidden from public view. Records and drafts will be preserved.`)) return;
    setBusy(true); setError(""); setMessage(""); setReauthenticationCategoryId(null);
    try {
      await unpublishCategory(item.id);
      setMessage(`"${item.name}" unpublished. Records and drafts were preserved.`);
      await refresh();
    } catch (cause) {
      handleProtectedActionError(cause, item.id, "The category could not be unpublished. Refresh and try again.");
    } finally { setBusy(false); }
  }

  function handleProtectedActionError(cause: unknown, categoryId: string, fallback: string) {
    if (cause instanceof DashboardApiError && cause.status === 403) {
      setReauthenticationCategoryId(categoryId);
      return;
    }
    setError(cause instanceof Error ? cause.message : fallback);
  }

  function beginEdit(item: ManagedCategory) {
    setEditing(item);
    setEditTitle(item.draftRevision?.title ?? item.name);
    setEditSummary(item.draftRevision?.summary ?? item.summary ?? "");
    setEditDescription(item.draftRevision?.description ?? item.description ?? "");
    setEditPosition(item.draftRevision?.position ?? item.position);
    setEditImage(null);
    setEditRights("");
    setRemoveImage(false);
    setError("");
    setMessage("");
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    setBusy(true); setError(""); setMessage("");
    try {
      if (editImage && !editRights.trim()) throw new Error("Add an image rights statement.");
      const imageMediaAssetId = editImage ? await uploadCategoryImage(editImage, editRights.trim()) : removeImage ? null : (editing.draftRevision?.imageMediaAssetId ?? editing.imageMediaAssetId);
      await saveCategoryDraft(editing.id, { title: editTitle.trim(), summary: editSummary.trim(), description: editDescription.trim(), imageMediaAssetId, position: editPosition });
      setEditing(null);
      setMessage("Changes saved as an unpublished draft.");
      await refresh();
    } catch (cause) { setError(cause instanceof Error && cause.message === "Add an image rights statement." ? cause.message : "Changes could not be saved. Check the details and try again."); }
    finally { setBusy(false); }
  }

  async function refresh() {
    try { setItems(await listManagedCategories()); }
    catch { setError("Categories could not be loaded. Try again."); }
  }
  useEffect(() => {
    let active = true;
    listManagedCategories()
      .then((loaded) => { if (active) setItems(loaded); })
      .catch(() => { if (active) setError("Categories could not be loaded. Try again."); });
    return () => { active = false; };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setMessage(""); setBusy(true);
    try {
      if (image && !rights.trim()) throw new Error("Add an image rights statement.");
      const imageMediaAssetId = image ? await uploadCategoryImage(image, rights.trim()) : undefined;
      await createManagedCategory({ title: title.trim(), summary: summary.trim(), description: description.trim(), parentId: parentId || undefined, imageMediaAssetId });
      setTitle(""); setSummary(""); setDescription(""); setImage(null); setRights("");
      setMessage("Category saved as a draft.");
      await refresh();
    } catch (cause) { setError(cause instanceof Error && cause.message === "Add an image rights statement." ? cause.message : "Category could not be saved. Check the details and try again."); }
    finally { setBusy(false); }
  }

  function getStatusBadge(item: ManagedCategory) {
    const badgeState = getCategoryBadgeState(item);
    if (badgeState === "removed") return <span className={`${styles.badge} ${styles.badgeRemoved}`}>Removed</span>;
    if (badgeState === "published") return <span className={`${styles.badge} ${styles.badgePublished}`}>Published</span>;
    if (badgeState === "unpublished") return <span className={`${styles.badge} ${styles.badgeUnpublished}`}>Unpublished</span>;
    return <span className={`${styles.badge} ${styles.badgeDraft}`}>Draft</span>;
  }

  function renderCategoryNode(item: ManagedCategory, isChild = false, parentItem?: ManagedCategory) {
    const actions = getCategoryActions(item, isChild, parentItem);

    return (
      <div id={`category-${item.id}`} className={styles.categoryItem}>
        <div className={styles.categoryHeader}>
          <span className={styles.categoryTitle}>{item.name}</span>
          {getStatusBadge(item)}
          {actions.hasUnpublishedChanges && <span className={`${styles.badge} ${styles.badgeChanges}`}>Unpublished changes</span>}
          {actions.isReadyToPublish && <span className={`${styles.badge} ${styles.badgeReady}`}>Ready to publish</span>}
        </div>
        {item.summary && <p className={styles.summary}>{item.summary}</p>}
        {actions.showReadinessIssues && (
          <ul className={styles.issuesList} aria-label={`Requirements before publishing ${item.name}`}>
            {item.readiness?.issues.map((issue) => (
              <li key={`${item.id}-${issue.code}`} className={styles.issueItem}>
                {issue.message}
              </li>
            ))}
          </ul>
        )}
        <div className={styles.actions}>
          {actions.canEdit && (
            <button type="button" className={styles.btnEdit} onClick={() => beginEdit(item)}>
              Edit
            </button>
          )}
          {actions.canPublish && (
            <button
              type="button"
              disabled={busy || actions.isPublishDisabled}
              className={styles.btnPublish}
              onClick={() => void handlePublish(item)}
              title={actions.isPublishDisabled ? "Complete requirements to publish" : undefined}
            >
              {actions.publishLabel}
            </button>
          )}
          {actions.canUnpublish && (
            <button
              type="button"
              disabled={busy}
              className={styles.btnUnpublish}
              onClick={() => void handleUnpublish(item)}
            >
              Unpublish
            </button>
          )}
          {actions.canRemove && (
            <button
              type="button"
              disabled={busy}
              className={styles.btnRemove}
              onClick={() => void changeArchive(item)}
            >
              Remove
            </button>
          )}
          {actions.canRestore && (
            <button
              type="button"
              disabled={busy || actions.isRestoreDisabled}
              className={styles.btnRestore}
              onClick={() => void changeArchive(item)}
            >
              Restore
            </button>
          )}
        </div>
        {reauthenticationCategoryId === item.id && (
          <div className={styles.reauthenticationPrompt} role="alert">
            <span>Confirm your identity before changing publication status.</span>
            <Link
              className={styles.reauthenticationLink}
              href={`/account?returnTo=${encodeURIComponent(`/dashboard/categories#category-${item.id}`)}`}
            >
              Confirm identity
            </Link>
          </div>
        )}
      </div>
    );
  }

  const roots = items.filter((item) => item.parentId === null);
  return <main className={styles.page}>
    <header><h1>Categories</h1><p>Organize geological subjects for the collection.</p></header>
    {error && <p role="alert">{error}</p>}
    {message && <p role="status">{message}</p>}
    <section className={styles.panel} aria-labelledby="category-create-title">
      <h2 id="category-create-title">Add category</h2>
      <form onSubmit={(event) => void submit(event)} className={styles.form}>
        <label>Place under <select value={parentId} onChange={(event) => setParentId(event.target.value)}><option value="">Top-level category</option>{roots.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>Title <input required minLength={2} maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} /></label>
        <label>Summary <input required minLength={2} maxLength={500} value={summary} onChange={(event) => setSummary(event.target.value)} /></label>
        <label>Description <textarea required minLength={2} maxLength={4000} rows={4} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
        <label>Image (optional) <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setImage(event.target.files?.[0] ?? null)} /></label>
        {image && <label>Image rights statement <input required maxLength={2000} value={rights} onChange={(event) => setRights(event.target.value)} /></label>}
        <button type="submit" disabled={busy}>{busy ? "Saving…" : parentId ? "Add subcategory" : "Add category"}</button>
      </form>
    </section>
    {editing && <section className={styles.panel} aria-labelledby="category-edit-title">
      <h2 id="category-edit-title">Edit {editing.name}</h2>
      <p>Changes are saved privately. The current public version stays unchanged.</p>
      <form onSubmit={(event) => void saveEdit(event)} className={styles.form}>
        <label>Title <input required minLength={2} maxLength={160} value={editTitle} onChange={(event) => setEditTitle(event.target.value)} /></label>
        <label>Summary <input required minLength={2} maxLength={500} value={editSummary} onChange={(event) => setEditSummary(event.target.value)} /></label>
        <label>Description <textarea required minLength={2} maxLength={4000} rows={4} value={editDescription} onChange={(event) => setEditDescription(event.target.value)} /></label>
        <label>Display order <input required type="number" min={0} max={100000} step={1} value={editPosition} onChange={(event) => setEditPosition(Number(event.target.value))} /></label>
        <label>Replace image (optional) <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setEditImage(event.target.files?.[0] ?? null)} /></label>
        {(editing.draftRevision?.imageMediaAssetId ?? editing.imageMediaAssetId) && !editImage && <label><input type="checkbox" checked={removeImage} onChange={(event) => setRemoveImage(event.target.checked)} /> Remove current image from this draft</label>}
        {editImage && <label>Image rights statement <input required maxLength={2000} value={editRights} onChange={(event) => setEditRights(event.target.value)} /></label>}
        <button type="submit" disabled={busy}>{busy ? "Saving…" : "Save draft changes"}</button>
        <button type="button" onClick={() => setEditing(null)}>Cancel</button>
      </form>
    </section>}
    <section className={styles.panel} aria-labelledby="category-list-title"><h2 id="category-list-title">Current categories</h2>
      {roots.length === 0 ? <p>No categories yet.</p> : (
        <ul className={styles.tree}>
          {roots.map((root) => {
            const children = items.filter((item) => item.parentId === root.id);
            return (
              <li key={root.id}>
                {renderCategoryNode(root, false)}
                {children.length > 0 && (
                  <ul>
                    {children.map((child) => (
                      <li key={child.id}>
                        {renderCategoryNode(child, true, root)}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  </main>;
}
