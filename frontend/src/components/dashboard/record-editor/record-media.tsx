"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { DashboardApiError } from "@/lib/dashboard-api";
import {
  detachRecordMedia,
  getOnlineMediaPages,
  listRecordMedia,
  reorderRecordMedia,
  setRecordPrimaryMedia,
  updateRecordMediaAttachment,
  uploadRecordMedia,
  type OnlineMediaPage,
  type RecordMediaAttachment,
} from "@/lib/record-extras-api";
import styles from "./record-editor.module.css";

const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "video/mp4",
  "video/webm",
];

export function RecordMedia({
  recordId,
  initialItems,
}: {
  recordId: string;
  initialItems?: RecordMediaAttachment[];
}) {
  const [items, setItems] = useState<RecordMediaAttachment[]>(
    initialItems ?? [],
  );
  const [file, setFile] = useState<File | null>(null);
  const [rights, setRights] = useState("");
  const [credit, setCredit] = useState("");
  const [licence, setLicence] = useState("");
  const [purpose, setPurpose] = useState("");
  const [caption, setCaption] = useState("");
  const [description, setDescription] = useState("");
  const [altText, setAltText] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);

  // Operation states
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [settingPrimaryId, setSettingPrimaryId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Inline editing state
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [editPurpose, setEditPurpose] = useState("");
  const [editCaption, setEditCaption] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editAltText, setEditAltText] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Detach confirmation state
  const [confirmDetachAssetId, setConfirmDetachAssetId] = useState<
    string | null
  >(null);
  const [detaching, setDetaching] = useState(false);

  // Viewer modal state
  const [view, setView] = useState<{
    filename: string;
    mediaKind: string;
    pages: OnlineMediaPage[];
  } | null>(null);
  const viewerCloseRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let active = true;
    listRecordMedia(recordId)
      .then((loaded) => {
        if (active) setItems(loaded);
      })
      .catch(() => {
        if (active) setError("Files could not be loaded.");
      });
    return () => {
      active = false;
    };
  }, [recordId]);

  useEffect(() => {
    if (!view) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    viewerCloseRef.current?.focus();
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") setView(null);
    }
    window.addEventListener("keydown", escape);
    return () => {
      window.removeEventListener("keydown", escape);
      previouslyFocused?.focus();
    };
  }, [view]);

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    if (!file || !ACCEPTED_TYPES.includes(file.type)) {
      setError("Choose a JPEG, PNG, WebP, PDF, MP4, or WebM file.");
      return;
    }
    if (!rights.trim() || !purpose.trim()) {
      setError("Describe the file rights and its purpose.");
      return;
    }
    setUploading(true);
    try {
      await uploadRecordMedia(recordId, file, {
        rightsStatement: rights.trim(),
        credit: credit.trim() || undefined,
        licence: licence.trim() || undefined,
        purpose: purpose.trim(),
        caption: caption.trim() || undefined,
        description: description.trim() || undefined,
        altText: file.type.startsWith("image/")
          ? altText.trim() || undefined
          : undefined,
        isPrimary: isPrimary && file.type.startsWith("image/"),
      });
      setItems(await listRecordMedia(recordId));
      // Reset only upon success; preserve inputs on failure
      setFile(null);
      setRights("");
      setCredit("");
      setLicence("");
      setPurpose("");
      setCaption("");
      setDescription("");
      setAltText("");
      setIsPrimary(false);
      const input = document.getElementById(
        "record-media-file",
      ) as HTMLInputElement | null;
      if (input) input.value = "";
      setMessage(
        "File received. It will be available to view after processing and approval.",
      );
    } catch (cause) {
      setError(
        cause instanceof DashboardApiError
          ? cause.message
          : "The file could not be uploaded.",
      );
    } finally {
      setUploading(false);
    }
  }

  async function openViewer(item: RecordMediaAttachment) {
    setError(null);
    try {
      const pages = await getOnlineMediaPages(item.mediaAssetId);
      setView({
        filename: item.filename,
        mediaKind: item.mediaKind,
        pages,
      });
    } catch (cause) {
      setError(
        cause instanceof DashboardApiError
          ? cause.message
          : "The file could not be opened.",
      );
    }
  }

  async function refreshFiles() {
    setRefreshing(true);
    setError(null);
    try {
      setItems(await listRecordMedia(recordId));
    } catch {
      setError("Files could not be refreshed.");
    } finally {
      setRefreshing(false);
    }
  }

  async function makePrimary(mediaAssetId: string) {
    setSettingPrimaryId(mediaAssetId);
    setError(null);
    setMessage(null);
    try {
      await setRecordPrimaryMedia(recordId, mediaAssetId);
      setItems(await listRecordMedia(recordId));
      setMessage("Primary image updated.");
    } catch (cause) {
      setError(
        cause instanceof DashboardApiError
          ? cause.message
          : "Could not set as primary image.",
      );
    } finally {
      setSettingPrimaryId(null);
    }
  }

  async function moveAttachment(index: number, direction: "up" | "down") {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;
    const newItems = [...items];
    const [moved] = newItems.splice(index, 1);
    newItems.splice(targetIndex, 0, moved);

    setReordering(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await reorderRecordMedia(
        recordId,
        newItems.map((it) => it.mediaAssetId),
      );
      setItems(updated);
      setMessage("Attachment order updated.");
    } catch (cause) {
      setError(
        cause instanceof DashboardApiError
          ? cause.message
          : "Attachment order could not be updated.",
      );
    } finally {
      setReordering(false);
    }
  }

  function startEditing(item: RecordMediaAttachment) {
    setEditingAssetId(item.mediaAssetId);
    setEditPurpose(item.purpose);
    setEditCaption(item.caption ?? "");
    setEditDescription(item.description ?? "");
    setEditAltText(item.altText ?? "");
    setError(null);
    setMessage(null);
  }

  async function saveEdit(
    event: FormEvent<HTMLFormElement>,
    item: RecordMediaAttachment,
  ) {
    event.preventDefault();
    if (!editPurpose.trim()) {
      setError("Purpose is required.");
      return;
    }
    setSavingEdit(true);
    setError(null);
    setMessage(null);
    try {
      await updateRecordMediaAttachment(recordId, item.mediaAssetId, {
        purpose: editPurpose.trim(),
        caption: editCaption.trim() || null,
        description: editDescription.trim() || null,
        altText:
          item.mediaKind === "image" ? editAltText.trim() || null : undefined,
      });
      setItems(await listRecordMedia(recordId));
      setEditingAssetId(null);
      setMessage("Attachment details updated.");
    } catch (cause) {
      setError(
        cause instanceof DashboardApiError
          ? cause.message
          : "Attachment details could not be updated.",
      );
    } finally {
      setSavingEdit(false);
    }
  }

  async function confirmDetach(mediaAssetId: string) {
    setDetaching(true);
    setError(null);
    setMessage(null);
    try {
      await detachRecordMedia(recordId, mediaAssetId);
      setItems(await listRecordMedia(recordId));
      setConfirmDetachAssetId(null);
      setMessage("Attachment detached from this record.");
    } catch (cause) {
      setError(
        cause instanceof DashboardApiError
          ? cause.message
          : "Could not detach attachment.",
      );
    } finally {
      setDetaching(false);
    }
  }

  const isChosenFileImage = Boolean(file && file.type.startsWith("image/"));

  return (
    <section className={styles.stepCard} aria-labelledby="record-media-title">
      <div className={styles.stepHeader}>
        <h2 id="record-media-title" className={styles.stepTitle}>
          Images, videos, and documents
        </h2>
        <p className={styles.stepDescription}>
          Add field photographs, geological videos, or supporting PDFs. Files
          are scanned and processed before they can be viewed.
        </p>
      </div>

      <div
        className={styles.actionsBar}
        style={{ borderTop: "none", paddingTop: 0 }}
      >
        <button
          className={styles.buttonSecondary}
          type="button"
          onClick={() => void refreshFiles()}
          disabled={refreshing}
        >
          {refreshing ? "Refreshing…" : "Refresh files"}
        </button>
      </div>

      {error && (
        <p className={styles.bannerError} role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className={styles.bannerSuccess} role="status">
          {message}
        </p>
      )}

      {items.length > 0 ? (
        <ul className={styles.galleryList} aria-label="Attached files">
          {items.map((item, index) => {
            const isEditing = editingAssetId === item.mediaAssetId;
            const isConfirmingDetach =
              confirmDetachAssetId === item.mediaAssetId;
            const isFailed =
              item.processingStatus === "rejected" ||
              item.processingStatus === "failed";

            return (
              <li key={item.mediaAssetId} className={styles.galleryCard}>
                <div className={styles.galleryCardHeader}>
                  <strong className={styles.galleryFilename}>
                    {item.filename}
                  </strong>
                  <div className={styles.badgeGroup}>
                    <span className={styles.kindBadge}>
                      {item.mediaKind === "image"
                        ? "Image"
                        : item.mediaKind === "video"
                          ? "Video"
                          : "Document"}
                    </span>
                    {item.isPrimary && (
                      <span className={styles.primaryBadge} role="status">
                        ★ Primary image
                      </span>
                    )}
                    {item.processingStatus === "approved" ? (
                      <span className={styles.statusBadgeReady}>Ready</span>
                    ) : isFailed ? (
                      <span className={styles.statusBadgeFailed}>
                        Could not be processed
                      </span>
                    ) : (
                      <span className={styles.statusBadgeProcessing}>
                        Processing
                      </span>
                    )}
                  </div>
                </div>

                <div className={styles.galleryCardMeta}>
                  <div>
                    <strong>Purpose:</strong> {item.purpose}
                  </div>
                  {item.caption && (
                    <div>
                      <strong>Caption:</strong> {item.caption}
                    </div>
                  )}
                  {item.description && (
                    <div>
                      <strong>Description:</strong> {item.description}
                    </div>
                  )}
                  {item.altText && item.mediaKind === "image" && (
                    <div>
                      <strong>Alt text:</strong> {item.altText}
                    </div>
                  )}
                  <div>
                    <strong>Rights:</strong> {item.rightsStatement}
                  </div>
                  {item.credit && (
                    <div>
                      <strong>Credit:</strong> {item.credit}
                    </div>
                  )}
                  {item.licence && (
                    <div>
                      <strong>Licence:</strong> {item.licence}
                    </div>
                  )}
                </div>

                <div className={styles.galleryCardActions}>
                  {item.processingStatus === "approved" && (
                    <button
                      className={styles.buttonSecondary}
                      type="button"
                      onClick={() => void openViewer(item)}
                    >
                      View online
                    </button>
                  )}
                  {item.mediaKind === "image" && !item.isPrimary && (
                    <button
                      className={styles.buttonSecondary}
                      type="button"
                      onClick={() => void makePrimary(item.mediaAssetId)}
                      disabled={
                        settingPrimaryId === item.mediaAssetId || reordering
                      }
                    >
                      {settingPrimaryId === item.mediaAssetId
                        ? "Setting primary…"
                        : "Make primary image"}
                    </button>
                  )}
                  <button
                    className={styles.buttonGhost}
                    type="button"
                    onClick={() => void moveAttachment(index, "up")}
                    disabled={index === 0 || reordering}
                    aria-label={`Move ${item.filename} up`}
                  >
                    ↑ Move up
                  </button>
                  <button
                    className={styles.buttonGhost}
                    type="button"
                    onClick={() => void moveAttachment(index, "down")}
                    disabled={index === items.length - 1 || reordering}
                    aria-label={`Move ${item.filename} down`}
                  >
                    ↓ Move down
                  </button>
                  <button
                    className={styles.buttonGhost}
                    type="button"
                    onClick={() => startEditing(item)}
                    disabled={isEditing}
                  >
                    Edit details
                  </button>
                  <button
                    className={styles.buttonGhost}
                    type="button"
                    onClick={() => setConfirmDetachAssetId(item.mediaAssetId)}
                    disabled={isConfirmingDetach}
                  >
                    Detach
                  </button>
                </div>

                {isEditing && (
                  <form
                    className={styles.inlineEditBox}
                    onSubmit={(e) => void saveEdit(e, item)}
                  >
                    <div className={styles.fieldGroup}>
                      <label
                        className={styles.fieldLabel}
                        htmlFor={`edit-purpose-${item.mediaAssetId}`}
                      >
                        Purpose{" "}
                        <span className={styles.requiredTag}>Required</span>
                      </label>
                      <input
                        id={`edit-purpose-${item.mediaAssetId}`}
                        className={styles.input}
                        maxLength={40}
                        required
                        value={editPurpose}
                        onChange={(e) => setEditPurpose(e.target.value)}
                      />
                    </div>
                    <div className={styles.fieldGroup}>
                      <label
                        className={styles.fieldLabel}
                        htmlFor={`edit-caption-${item.mediaAssetId}`}
                      >
                        Caption (optional)
                      </label>
                      <input
                        id={`edit-caption-${item.mediaAssetId}`}
                        className={styles.input}
                        maxLength={160}
                        value={editCaption}
                        onChange={(e) => setEditCaption(e.target.value)}
                      />
                    </div>
                    {item.mediaKind === "image" && (
                      <div className={styles.fieldGroup}>
                        <label
                          className={styles.fieldLabel}
                          htmlFor={`edit-alt-${item.mediaAssetId}`}
                        >
                          Alt text (optional)
                        </label>
                        <input
                          id={`edit-alt-${item.mediaAssetId}`}
                          className={styles.input}
                          maxLength={500}
                          value={editAltText}
                          onChange={(e) => setEditAltText(e.target.value)}
                        />
                      </div>
                    )}
                    <div className={styles.fieldGroup}>
                      <label
                        className={styles.fieldLabel}
                        htmlFor={`edit-desc-${item.mediaAssetId}`}
                      >
                        Description (optional)
                      </label>
                      <textarea
                        id={`edit-desc-${item.mediaAssetId}`}
                        className={styles.textarea}
                        maxLength={2000}
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                      />
                    </div>
                    <div className={styles.actionGroup}>
                      <button
                        className={styles.buttonPrimary}
                        type="submit"
                        disabled={savingEdit}
                      >
                        {savingEdit ? "Saving…" : "Save details"}
                      </button>
                      <button
                        className={styles.buttonSecondary}
                        type="button"
                        onClick={() => setEditingAssetId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {isConfirmingDetach && (
                  <div className={styles.inlineConfirmBox}>
                    <p className={styles.inlineConfirmText}>
                      Detach this file from the record? The media asset and its
                      history remain safely stored.
                    </p>
                    <div className={styles.actionGroup}>
                      <button
                        className={styles.buttonPrimary}
                        type="button"
                        onClick={() => void confirmDetach(item.mediaAssetId)}
                        disabled={detaching}
                      >
                        {detaching ? "Detaching…" : "Confirm detach"}
                      </button>
                      <button
                        className={styles.buttonSecondary}
                        type="button"
                        onClick={() => setConfirmDetachAssetId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className={styles.stepDescription}>No files attached yet.</p>
      )}

      <form className={styles.formSection} onSubmit={upload}>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} htmlFor="record-media-file">
            File <span className={styles.requiredTag}>Required</span>
          </label>
          <input
            id="record-media-file"
            className={styles.input}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf,video/mp4,video/webm"
            required
            onChange={(event) => {
              const selected = event.target.files?.[0] ?? null;
              setFile(selected);
              if (selected && !selected.type.startsWith("image/")) {
                setIsPrimary(false);
                setAltText("");
              }
            }}
          />
          <small className={styles.fieldHelp}>
            Images up to 25 MB; PDFs up to 20 MB; Videos up to 50 MB.
          </small>
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} htmlFor="record-media-purpose">
            Purpose <span className={styles.requiredTag}>Required</span>
          </label>
          <input
            id="record-media-purpose"
            className={styles.input}
            maxLength={40}
            required
            value={purpose}
            onChange={(event) => setPurpose(event.target.value)}
            placeholder="E.g. Outcrop photograph, Thin section, Stratigraphy"
          />
        </div>

        <div className={styles.formGrid}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="record-media-caption">
              Caption (optional)
            </label>
            <input
              id="record-media-caption"
              className={styles.input}
              maxLength={160}
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="record-media-alt">
              Alt text (for images)
            </label>
            <input
              id="record-media-alt"
              className={styles.input}
              maxLength={500}
              value={altText}
              disabled={!isChosenFileImage}
              onChange={(event) => setAltText(event.target.value)}
              placeholder="Descriptive text for accessibility"
            />
          </div>
        </div>

        <div className={styles.fieldGroup}>
          <label
            className={styles.fieldLabel}
            htmlFor="record-media-description"
          >
            Description (optional)
          </label>
          <textarea
            id="record-media-description"
            className={styles.textarea}
            maxLength={2000}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Additional geological context, methodology, or notes"
          />
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} htmlFor="record-media-rights">
            Rights statement{" "}
            <span className={styles.requiredTag}>Required</span>
          </label>
          <input
            id="record-media-rights"
            className={styles.input}
            maxLength={2000}
            required
            value={rights}
            onChange={(event) => setRights(event.target.value)}
          />
        </div>

        <div className={styles.formGrid}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="record-media-credit">
              Credit (optional)
            </label>
            <input
              id="record-media-credit"
              className={styles.input}
              maxLength={1000}
              value={credit}
              onChange={(event) => setCredit(event.target.value)}
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="record-media-licence">
              Licence (optional)
            </label>
            <input
              id="record-media-licence"
              className={styles.input}
              maxLength={160}
              value={licence}
              onChange={(event) => setLicence(event.target.value)}
            />
          </div>
        </div>

        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            className={styles.checkboxInput}
            checked={isPrimary}
            disabled={!isChosenFileImage}
            onChange={(e) => setIsPrimary(e.target.checked)}
          />
          <span className={styles.checkboxText}>
            Set as primary image for this record{" "}
            {!file || isChosenFileImage ? "" : "(images only)"}
          </span>
        </label>

        <div className={styles.actionsBar}>
          <button
            className={styles.buttonPrimary}
            type="submit"
            disabled={uploading || !file}
          >
            {uploading ? "Uploading…" : "Add file"}
          </button>
        </div>
      </form>

      {view && (
        <div
          className={styles.viewerBackdrop}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setView(null);
          }}
        >
          <div
            className={styles.viewerPanel}
            role="dialog"
            aria-modal="true"
            aria-label={`View ${view.filename}`}
          >
            <div className={styles.viewerHeader}>
              <strong>{view.filename}</strong>
              <button
                ref={viewerCloseRef}
                className={styles.buttonSecondary}
                type="button"
                onClick={() => setView(null)}
              >
                Close
              </button>
            </div>
            <div className={styles.viewerPages}>
              {view.pages.map((page, index) => (
                <div key={`${page.kind}-${page.pageNumber ?? index}`}>
                  {page.kind === "playback" ? (
                    <video
                      controls
                      controlsList="nodownload"
                      playsInline
                      src={page.url}
                      className={styles.viewerVideo}
                      aria-label={view.filename}
                    >
                      Your browser does not support video playback.
                    </video>
                  ) : (
                    /* Approved derivative only; the original file is never linked from this screen. */
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={page.url}
                      alt={
                        page.pageNumber === null
                          ? view.filename
                          : `${view.filename}, page ${page.pageNumber}`
                      }
                      className={styles.viewerImage}
                      referrerPolicy="no-referrer"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
