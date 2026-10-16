"use client";

import { useEffect, useState, type FormEvent } from "react";
import { changeCategoryArchive, createManagedCategory, listManagedCategories, previewCategoryArchive, saveCategoryDraft, uploadCategoryImage, type ManagedCategory } from "@/lib/category-management-api";
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

  const roots = items.filter((item) => item.parentId === null);
  return <main className={styles.page}>
    <header><h1>Categories</h1><p>Organize geological subjects for the collection.</p></header>
    {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
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
      {roots.length === 0 ? <p>No categories yet.</p> : <ul className={styles.tree}>{roots.map((root) => <li key={root.id}><strong>{root.name}</strong> <small>{root.status === "archived" ? "Removed" : root.publicationStatus === "draft" ? "Draft" : "Published"}</small>{root.draftRevision && <small>Unpublished changes</small>}{root.summary && <p>{root.summary}</p>}{root.status === "active" && <button type="button" onClick={() => beginEdit(root)}>Edit</button>} <button type="button" disabled={busy} onClick={() => void changeArchive(root)}>{root.status === "archived" ? "Restore" : "Remove"}</button>{items.some((item) => item.parentId === root.id) && <ul>{items.filter((item) => item.parentId === root.id).map((child) => <li key={child.id}>{child.name} <small>{child.status === "archived" ? "Removed" : child.publicationStatus === "draft" ? "Draft" : "Published"}</small>{child.draftRevision && <small>Unpublished changes</small>} {child.status === "active" && <button type="button" onClick={() => beginEdit(child)}>Edit</button>} <button type="button" disabled={busy || (child.status === "archived" && root.status === "archived")} onClick={() => void changeArchive(child)}>{child.status === "archived" ? "Restore" : "Remove"}</button></li>)}</ul>}</li>)}</ul>}
    </section>
  </main>;
}
