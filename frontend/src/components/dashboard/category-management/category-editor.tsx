"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import {
  createManagedCategory,
  saveCategoryEdit,
  uploadCategoryImage,
  type ManagedCategory,
} from "@/lib/category-management-api";
import { DashboardApiError } from "@/lib/dashboard-api";
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
  const [needsReauthentication, setNeedsReauthentication] = useState(false);
  const existingImageId = savedImageId;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const saveAsDraft =
      submitter instanceof HTMLButtonElement && submitter.dataset.intent === "draft";
    const publishAfterSave = mode === "edit" && !saveAsDraft;
    setBusy(true);
    setError("");
    setMessage("");
    setNeedsReauthentication(false);
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
      const result = await saveCategoryEdit(category.id, {
        title: title.trim(),
        summary: summary.trim(),
        description: description.trim(),
        imageMediaAssetId: nextImageId,
        position,
      }, publishAfterSave);
      setImage(null);
      setSavedImageId(nextImageId);
      setRights("");
      setRemoveImage(false);
      if (result.state === "published") {
        setMessage("Changes saved and published. They are now live on the public website.");
      } else if (result.state === "draft_saved") {
        setMessage("Draft saved. These changes are not live on the public website.");
      } else if (
        result.cause instanceof DashboardApiError &&
        result.cause.kind === "reauthentication"
      ) {
        setNeedsReauthentication(true);
        setError("Your draft is safe. Confirm your identity to publish these changes.");
      } else if (
        result.cause instanceof DashboardApiError &&
        result.cause.kind === "forbidden"
      ) {
        setError("Your draft is safe, but you do not have access to publish these changes.");
      } else if (
        result.cause instanceof DashboardApiError &&
        result.cause.kind === "validation"
      ) {
        setError("Your draft is safe, but it is not live yet. Complete the publication requirements and try again.");
      } else {
        setError("Your draft is safe, but it could not be made live. Try publishing again.");
      }
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
            : "Save and publish to update the public website, or keep unfinished work as a private draft."}
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
              {busy
                ? "Saving…"
                : mode === "create"
                  ? "Save category draft"
                  : category?.publicationStatus === "published"
                    ? "Save and publish changes"
                    : "Save and publish"}
            </button>
            {mode === "edit" && (
              <button
                type="submit"
                data-intent="draft"
                className={styles.secondaryButton}
                disabled={busy}
              >
                Save draft
              </button>
            )}
            <Link href="/dashboard/categories" className={styles.cancelButton}>Cancel</Link>
            {needsReauthentication && category && (
              <Link
                className={styles.secondaryButton}
                href={`/account?returnTo=${encodeURIComponent(`/dashboard/categories/edit?categoryId=${category.id}`)}`}
              >
                Confirm identity
              </Link>
            )}
          </div>
        </form>
      </section>
    </main>
  );
}
