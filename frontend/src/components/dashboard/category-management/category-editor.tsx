"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import {
  createManagedCategory,
  saveCategoryDraft,
  uploadCategoryImage,
  type ManagedCategory,
} from "@/lib/category-management-api";
import { CategoryImageInput } from "./category-image-input";
import styles from "./category-management.module.css";

export function CategoryEditor({
  mode,
  category,
  roots,
}: {
  mode: "create" | "edit";
  category?: ManagedCategory;
  roots: ManagedCategory[];
}) {
  const router = useRouter();
  const pending = category?.draftRevision;
  const [parentId, setParentId] = useState("");
  const [title, setTitle] = useState(pending?.title ?? category?.name ?? "");
  const [summary, setSummary] = useState(pending?.summary ?? category?.summary ?? "");
  const [description, setDescription] = useState(
    pending?.description ?? category?.description ?? "",
  );
  const [position, setPosition] = useState(pending?.position ?? category?.position ?? 0);
  const [image, setImage] = useState<File | null>(null);
  const [rights, setRights] = useState("");
  const [removeImage, setRemoveImage] = useState(false);
  const [savedImageId, setSavedImageId] = useState(
    pending?.imageMediaAssetId ?? category?.imageMediaAssetId ?? null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const existingImageId = savedImageId;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (image && !rights.trim()) {
        setError("Add the image credit and rights before saving.");
        return;
      }
      const uploadedId = image
        ? await uploadCategoryImage(image, rights.trim())
        : undefined;

      if (mode === "create") {
        await createManagedCategory({
          title: title.trim(),
          summary: summary.trim(),
          description: description.trim(),
          parentId: parentId || undefined,
          imageMediaAssetId: uploadedId,
        });
        router.push("/dashboard/categories");
        return;
      }

      if (!category) return;
      const nextImageId = uploadedId ?? (removeImage ? null : existingImageId);
      await saveCategoryDraft(category.id, {
        title: title.trim(),
        summary: summary.trim(),
        description: description.trim(),
        imageMediaAssetId: nextImageId,
        position,
      });
      setImage(null);
      setSavedImageId(nextImageId);
      setRights("");
      setRemoveImage(false);
      setMessage("Draft changes saved. The public version is unchanged until publication.");
      router.refresh();
    } catch {
      setError("Changes could not be saved. Check the details and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={styles.workspace}>
      <Link href="/dashboard/categories" className={styles.backLink}>
        ← Back to categories
      </Link>
      <header className={styles.workspaceHeader}>
        <h1>{mode === "create" ? "Add category" : `Edit ${category?.name ?? "category"}`}</h1>
        <p>
          {mode === "create"
            ? "Create a top-level subject or place a subcategory under an existing subject."
            : "Save private draft changes without changing the current public category."}
        </p>
      </header>
      <section className={styles.panel}>
        {error && <p className={styles.error} role="alert">{error}</p>}
        {message && <p className={styles.success} role="status">{message}</p>}
        <form className={styles.form} onSubmit={(event) => void submit(event)}>
          {mode === "create" && (
            <label>
              Place under
              <select value={parentId} onChange={(event) => setParentId(event.target.value)}>
                <option value="">Top-level category</option>
                {roots
                  .filter((item) => item.status === "active")
                  .map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
              </select>
            </label>
          )}
          <label>
            Title
            <input required minLength={2} maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label>
            Summary
            <input required minLength={2} maxLength={500} value={summary} onChange={(event) => setSummary(event.target.value)} />
          </label>
          <label>
            Description
            <textarea required minLength={2} maxLength={4000} rows={7} value={description} onChange={(event) => setDescription(event.target.value)} />
          </label>
          {mode === "edit" && (
            <div className={styles.formGrid}>
              <div />
              <label>
                Display order
                <input required type="number" min={0} max={100000} step={1} value={position} onChange={(event) => setPosition(Number(event.target.value))} />
              </label>
            </div>
          )}
          <CategoryImageInput
            existingMediaAssetId={existingImageId}
            file={image}
            onFileChange={setImage}
            rights={rights}
            onRightsChange={setRights}
            removeExisting={removeImage}
            onRemoveExistingChange={setRemoveImage}
          />
          <div className={styles.formActions}>
            <button type="submit" className={styles.primaryButton} disabled={busy}>
              {busy ? "Saving…" : mode === "create" ? "Save category draft" : "Save draft changes"}
            </button>
            <Link href="/dashboard/categories" className={styles.cancelButton}>Cancel</Link>
          </div>
        </form>
      </section>
    </main>
  );
}
