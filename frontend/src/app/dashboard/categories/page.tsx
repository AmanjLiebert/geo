"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createManagedCategory, listManagedCategories, uploadCategoryImage, type ManagedCategory } from "@/lib/category-management-api";
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
      {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
    </section>
    <section className={styles.panel} aria-labelledby="category-list-title"><h2 id="category-list-title">Current categories</h2>
      {roots.length === 0 ? <p>No categories yet.</p> : <ul className={styles.tree}>{roots.map((root) => <li key={root.id}><strong>{root.name}</strong> <small>{root.publicationStatus === "draft" ? "Draft" : "Published"}</small>{root.summary && <p>{root.summary}</p>}{items.some((item) => item.parentId === root.id) && <ul>{items.filter((item) => item.parentId === root.id).map((child) => <li key={child.id}>{child.name} <small>{child.publicationStatus === "draft" ? "Draft" : "Published"}</small></li>)}</ul>}</li>)}</ul>}
    </section>
  </main>;
}
