"use client";

import Image from "next/image";
import { ChangeEvent, DragEvent, useEffect, useId, useMemo, useState } from "react";
import { CategoryImagePreview } from "./category-image-preview";
import styles from "./category-management.module.css";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function CategoryImageInput({
  existingMediaAssetId,
  file,
  onFileChange,
  rights,
  onRightsChange,
  removeExisting,
  onRemoveExistingChange,
}: {
  existingMediaAssetId: string | null;
  file: File | null;
  onFileChange: (file: File | null) => void;
  rights: string;
  onRightsChange: (value: string) => void;
  removeExisting: boolean;
  onRemoveExistingChange: (value: boolean) => void;
}) {
  const inputId = useId();
  const [dragging, setDragging] = useState(false);
  const localUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => {
    return () => {
      if (localUrl) URL.revokeObjectURL(localUrl);
    };
  }, [localUrl]);

  function choose(selected: File | null) {
    if (selected && !ACCEPTED_TYPES.includes(selected.type)) return;
    onFileChange(selected);
    if (selected) onRemoveExistingChange(false);
  }

  function drop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    choose(event.dataTransfer.files?.[0] ?? null);
  }

  function changed(event: ChangeEvent<HTMLInputElement>) {
    choose(event.target.files?.[0] ?? null);
  }

  return (
    <fieldset className={styles.imageFieldset}>
      <legend>Category image</legend>
      <div className={styles.imageEditorGrid}>
        {localUrl ? (
          <div className={styles.imageFrame}>
            <Image
              src={localUrl}
              alt="Selected category image preview"
              fill
              sizes="(max-width: 760px) 100vw, 420px"
              unoptimized
              className={styles.image}
            />
          </div>
        ) : removeExisting ? (
          <CategoryImagePreview mediaAssetId={null} alt="" />
        ) : (
          <CategoryImagePreview
            mediaAssetId={existingMediaAssetId}
            alt="Current category image"
          />
        )}

        <div className={styles.imageControls}>
          <label
            htmlFor={inputId}
            className={`${styles.dropZone} ${dragging ? styles.dropZoneActive : ""}`}
            onDragEnter={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={() => setDragging(false)}
            onDrop={drop}
          >
            <strong>Drop an image here</strong>
            <span>or choose a JPEG, PNG, or WebP file</span>
            <input
              id={inputId}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={changed}
            />
          </label>
          {file && (
            <button type="button" className={styles.secondaryButton} onClick={() => choose(null)}>
              Clear selected image
            </button>
          )}
          {existingMediaAssetId && !file && (
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={removeExisting}
                onChange={(event) => onRemoveExistingChange(event.target.checked)}
              />
              Remove the current image from this draft
            </label>
          )}
          {file && (
            <label className={styles.fieldLabel}>
              Image credit and rights
              <textarea
                required
                maxLength={2000}
                rows={3}
                value={rights}
                onChange={(event) => onRightsChange(event.target.value)}
                placeholder="Who owns this image, and how may it be used?"
              />
            </label>
          )}
        </div>
      </div>
    </fieldset>
  );
}
