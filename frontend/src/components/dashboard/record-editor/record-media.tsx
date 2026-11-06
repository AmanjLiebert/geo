"use client";

import {
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
} from "react";
import {
  FileText,
  Film,
  ImageIcon,
  RefreshCw,
  UploadCloud,
} from "lucide-react";
import { DashboardApiError } from "@/lib/dashboard-api";
import { RecordThumbnail } from "@/components/dashboard/record-list/record-thumbnail";
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
  readOnly = false,
  onCountChange,
}: {
  recordId: string;
  initialItems?: RecordMediaAttachment[];
  readOnly?: boolean;
  onCountChange?: (count: number) => void;
}) {
  const [items, setItems] = useState<RecordMediaAttachment[]>(
    initialItems ?? [],
  );
  const [file, setFile] = useState<File | null>(null);
  const [rights, setRights] = useState("");
  const [credit, setCredit] = useState("");
  const [licence, setLicence] = useState("");
  const [description, setDescription] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(
    !(initialItems ?? []).some((item) => item.isPrimary),
  );
  const [isDragging, setIsDragging] = useState(false);
  const [selectedPreviewUrl, setSelectedPreviewUrl] = useState<string | null>(
    null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedPreviewUrlRef = useRef<string | null>(null);

  // Operation states
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [settingPrimaryId, setSettingPrimaryId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Inline editing state
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [editAltText, setEditAltText] = useState("");
  const [editRights, setEditRights] = useState("");
  const [editCredit, setEditCredit] = useState("");
  const [editLicence, setEditLicence] = useState("");
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
        if (active) {
          setItems(loaded);
          if (loaded.some((item) => item.isPrimary)) setUploadOpen(false);
        }
      })
      .catch(() => {
        if (active) setError("Files could not be loaded.");
      });
    return () => {
      active = false;
    };
  }, [recordId]);

  useEffect(() => onCountChange?.(items.length), [items.length, onCountChange]);

  useEffect(
    () => () => {
      if (selectedPreviewUrlRef.current) {
        URL.revokeObjectURL(selectedPreviewUrlRef.current);
      }
    },
    [],
  );

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

  function chooseFile(selected: File | null) {
    setError(null);
    if (selectedPreviewUrlRef.current) {
      URL.revokeObjectURL(selectedPreviewUrlRef.current);
      selectedPreviewUrlRef.current = null;
    }
    if (selected && !ACCEPTED_TYPES.includes(selected.type)) {
      setFile(null);
      setSelectedPreviewUrl(null);
      setIsPrimary(false);
      setError("Choose a JPEG, PNG, WebP, PDF, MP4, or WebM file.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (
      selected &&
      !items.some((item) => item.isPrimary) &&
      !selected.type.startsWith("image/")
    ) {
      setFile(null);
      setSelectedPreviewUrl(null);
      setIsPrimary(false);
      setError("Add the record's main image before adding documents or video.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setFile(selected);
    if (selected?.type.startsWith("image/")) {
      const previewUrl = URL.createObjectURL(selected);
      selectedPreviewUrlRef.current = previewUrl;
      setSelectedPreviewUrl(previewUrl);
      setIsPrimary(!items.some((item) => item.isPrimary));
    } else {
      setSelectedPreviewUrl(null);
    }
    if (!selected?.type.startsWith("image/")) {
      setIsPrimary(false);
    }
  }

  function dropFile(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    chooseFile(event.dataTransfer.files?.[0] ?? null);
  }

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    if (!file || !ACCEPTED_TYPES.includes(file.type)) {
      setError("Choose a JPEG, PNG, WebP, PDF, MP4, or WebM file.");
      return;
    }
    if (!rights.trim() || !description.trim()) {
      setError("Describe the file and why Geo-Kurdistan may use it.");
      return;
    }
    setUploading(true);
    try {
      await uploadRecordMedia(recordId, file, {
        rightsStatement: rights.trim(),
        credit: credit.trim() || undefined,
        licence: licence.trim() || undefined,
        purpose: description.trim().slice(0, 40),
        caption: description.trim().slice(0, 160),
        description: description.trim(),
        altText: file.type.startsWith("image/")
          ? description.trim().slice(0, 500)
          : undefined,
        isPrimary: isPrimary && file.type.startsWith("image/"),
      });
      const loaded = await listRecordMedia(recordId);
      setItems(loaded);
      if (loaded.some((item) => item.isPrimary)) setUploadOpen(false);
      // Reset only upon success; preserve inputs on failure
      chooseFile(null);
      setRights("");
      setCredit("");
      setLicence("");
      setDescription("");
      setIsPrimary(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
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
    setEditDescription(item.description ?? item.caption ?? item.purpose);
    setEditAltText(item.altText ?? "");
    setEditRights(item.rightsStatement);
    setEditCredit(item.credit ?? "");
    setEditLicence(item.licence ?? "");
    setError(null);
    setMessage(null);
  }

  async function saveEdit(
    event: FormEvent<HTMLFormElement>,
    item: RecordMediaAttachment,
  ) {
    event.preventDefault();
    if (!editDescription.trim() || !editRights.trim()) {
      setError("Describe the file and why Geo-Kurdistan may use it.");
      return;
    }
    if (item.mediaKind === "image" && editAltText.trim().length < 5) {
      setError("Describe what is visible in the image using at least 5 characters.");
      return;
    }
    setSavingEdit(true);
    setError(null);
    setMessage(null);
    try {
      await updateRecordMediaAttachment(recordId, item.mediaAssetId, {
        purpose: editDescription.trim().slice(0, 40),
        caption: editDescription.trim().slice(0, 160),
        description: editDescription.trim(),
        altText:
          item.mediaKind === "image" ? editAltText.trim() || null : undefined,
        rightsStatement: editRights.trim(),
        credit: editCredit.trim() || null,
        licence: editLicence.trim() || null,
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
  const hasPrimaryImage = items.some(
    (item) => item.isPrimary && item.mediaKind === "image",
  );

  return (
    <section className={styles.stepCard} aria-labelledby="record-media-title">
      <div className={styles.stepHeader}>
        <h2 id="record-media-title" className={styles.stepTitle}>
          Main image
        </h2>
        <p className={styles.stepDescription}>
          Add one clear image for the public record. It stays private while it is
          checked and must include a description and usage permission.
        </p>
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

      <div className={styles.mediaCollectionHeader}>
        <div>
          <h3>{hasPrimaryImage ? "Main image and attached files" : "Main image required"}</h3>
          <p>
            {items.length === 0
              ? "No files have been added."
              : `${items.length} ${items.length === 1 ? "file" : "files"} attached`}
          </p>
        </div>
        <button
          className={styles.buttonGhost}
          type="button"
          onClick={() => void refreshFiles()}
          disabled={refreshing}
        >
          <RefreshCw size={15} aria-hidden="true" />
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

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
                <div className={styles.mediaCardPreview}>
                  {item.mediaKind === "image" &&
                  item.processingStatus === "approved" ? (
                    <RecordThumbnail
                      mediaAssetId={item.mediaAssetId}
                      alt={item.altText || item.caption || item.filename}
                    />
                  ) : (
                    <div className={styles.mediaKindPlaceholder}>
                      {item.mediaKind === "video" ? (
                        <Film aria-hidden="true" />
                      ) : item.mediaKind === "document" ? (
                        <FileText aria-hidden="true" />
                      ) : (
                        <ImageIcon aria-hidden="true" />
                      )}
                      <span>
                        {isFailed
                          ? "Unavailable"
                          : item.processingStatus === "approved"
                            ? item.mediaKind
                            : "Processing"}
                      </span>
                    </div>
                  )}
                </div>
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
                </div>

                <details className={styles.mediaMetadataDisclosure}>
                  <summary>File information</summary>
                  <dl>
                    {item.description && (
                      <>
                        <dt>Description</dt>
                        <dd>{item.description}</dd>
                      </>
                    )}
                    {item.altText && item.mediaKind === "image" && (
                      <>
                        <dt>Alternative text</dt>
                        <dd>{item.altText}</dd>
                      </>
                    )}
                    <dt>Rights</dt>
                    <dd>{item.rightsStatement}</dd>
                    {item.credit && (
                      <>
                        <dt>Credit</dt>
                        <dd>{item.credit}</dd>
                      </>
                    )}
                    {item.licence && (
                      <>
                        <dt>Licence</dt>
                        <dd>{item.licence}</dd>
                      </>
                    )}
                  </dl>
                </details>

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
                  {!readOnly &&
                    item.mediaKind === "image" &&
                    !item.isPrimary && (
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
                  {!readOnly && (
                    <details className={styles.mediaManageMenu}>
                      <summary>Manage</summary>
                      <div>
                        <button
                          className={styles.buttonGhost}
                          type="button"
                          onClick={() => void moveAttachment(index, "up")}
                          disabled={index === 0 || reordering}
                          aria-label={`Move ${item.filename} up`}
                        >
                          Move earlier
                        </button>
                        <button
                          className={styles.buttonGhost}
                          type="button"
                          onClick={() => void moveAttachment(index, "down")}
                          disabled={index === items.length - 1 || reordering}
                          aria-label={`Move ${item.filename} down`}
                        >
                          Move later
                        </button>
                        <button
                          className={styles.buttonGhost}
                          type="button"
                          onClick={() => startEditing(item)}
                          disabled={isEditing}
                        >
                          Edit information
                        </button>
                        <button
                          className={styles.buttonGhost}
                          type="button"
                          onClick={() =>
                            setConfirmDetachAssetId(item.mediaAssetId)
                          }
                          disabled={isConfirmingDetach}
                        >
                          Detach
                        </button>
                      </div>
                    </details>
                  )}
                </div>

                {!readOnly && isEditing && (
                  <form
                    className={styles.inlineEditBox}
                    onSubmit={(e) => void saveEdit(e, item)}
                  >
                    <div className={styles.fieldGroup}>
                      <label
                        className={styles.fieldLabel}
                        htmlFor={`edit-desc-${item.mediaAssetId}`}
                      >
                        What does this file show or contain?{" "}
                        <span className={styles.requiredTag}>Required</span>
                      </label>
                      <textarea
                        id={`edit-desc-${item.mediaAssetId}`}
                        className={styles.textarea}
                        maxLength={2000}
                        required
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                      />
                    </div>
                    {item.mediaKind === "image" && (
                      <div className={styles.fieldGroup}>
                        <label
                          className={styles.fieldLabel}
                          htmlFor={`edit-alt-${item.mediaAssetId}`}
                        >
                          Describe the image for people who cannot see it{" "}
                          <span className={styles.requiredTag}>Required</span>
                        </label>
                        <input
                          id={`edit-alt-${item.mediaAssetId}`}
                          className={styles.input}
                          minLength={5}
                          maxLength={500}
                          required
                          value={editAltText}
                          onChange={(e) => setEditAltText(e.target.value)}
                        />
                        <small className={styles.fieldHelp}>
                          Describe the important visible details, not the filename.
                        </small>
                      </div>
                    )}
                    <div className={styles.fieldGroup}>
                      <label
                        className={styles.fieldLabel}
                        htmlFor={`edit-rights-${item.mediaAssetId}`}
                      >
                        Why may Geo-Kurdistan use this file?{" "}
                        <span className={styles.requiredTag}>Required</span>
                      </label>
                      <input
                        id={`edit-rights-${item.mediaAssetId}`}
                        className={styles.input}
                        maxLength={2000}
                        required
                        value={editRights}
                        onChange={(e) => setEditRights(e.target.value)}
                      />
                      <small className={styles.fieldHelp}>
                        State who owns it or what permission or licence allows its use.
                      </small>
                    </div>
                    <details className={styles.mediaAdvancedFields}>
                      <summary>More file information</summary>
                      <div className={styles.formGrid}>
                        <div className={styles.fieldGroup}>
                          <label
                            className={styles.fieldLabel}
                            htmlFor={`edit-credit-${item.mediaAssetId}`}
                          >
                            Credit line (optional)
                          </label>
                          <input
                            id={`edit-credit-${item.mediaAssetId}`}
                            className={styles.input}
                            maxLength={1000}
                            value={editCredit}
                            onChange={(e) => setEditCredit(e.target.value)}
                          />
                        </div>
                        <div className={styles.fieldGroup}>
                          <label
                            className={styles.fieldLabel}
                            htmlFor={`edit-licence-${item.mediaAssetId}`}
                          >
                            Licence name (optional)
                          </label>
                          <input
                            id={`edit-licence-${item.mediaAssetId}`}
                            className={styles.input}
                            maxLength={160}
                            value={editLicence}
                            onChange={(e) => setEditLicence(e.target.value)}
                          />
                        </div>
                      </div>
                    </details>
                    <div className={styles.actionGroup}>
                      <button
                        className={styles.buttonPrimary}
                        type="submit"
                        disabled={savingEdit}
                      >
                        {savingEdit ? "Saving…" : "Save file information"}
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

                {!readOnly && isConfirmingDetach && (
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

      {!readOnly && (
        <details
          className={styles.mediaUploadDisclosure}
          open={!hasPrimaryImage || uploadOpen}
          onToggle={(event) => {
            if (hasPrimaryImage) setUploadOpen(event.currentTarget.open);
          }}
        >
          <summary>
            {hasPrimaryImage ? "Optional: add another file" : "Add required main image"}
          </summary>
        <form className={styles.mediaUploadForm} onSubmit={upload}>
          <div className={styles.mediaUploadHeading}>
            <div>
              <span className={styles.stepNumber}>{hasPrimaryImage ? "Optional" : "Required"}</span>
              <h3>{hasPrimaryImage ? "Add another file" : "Add main image"}</h3>
            </div>
            <p>
              {hasPrimaryImage
                ? "Additional files remain private and are not shown on the current public record page."
                : "Choose an image. It stays private while it is checked."}
            </p>
          </div>

          <div
            className={
              isDragging ? styles.mediaDropZoneActive : styles.mediaDropZone
            }
            onDragEnter={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={(event) => {
              if (
                !event.currentTarget.contains(
                  event.relatedTarget as Node | null,
                )
              ) {
                setIsDragging(false);
              }
            }}
            onDrop={dropFile}
          >
            {selectedPreviewUrl ? (
              /* Local preview only; uploaded originals remain private. */
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={selectedPreviewUrl}
                alt="Selected upload preview"
                className={styles.mediaSelectedPreview}
              />
            ) : (
              <div className={styles.mediaDropIcon} aria-hidden="true">
                <UploadCloud />
              </div>
            )}
            <div className={styles.mediaDropCopy}>
              <strong>{file ? file.name : "Drop a file here"}</strong>
              <span>
                {file
                  ? `${file.type || "Unknown type"} · ${(file.size / 1024 / 1024).toFixed(1)} MB`
                  : "or choose one from your computer"}
              </span>
              <label
                className={styles.buttonSecondary}
                htmlFor="record-media-file"
              >
                {file ? "Choose a different file" : "Choose file"}
              </label>
            </div>
            <input
              ref={fileInputRef}
              id="record-media-file"
              className={styles.mediaFileInput}
              type="file"
              accept={
                hasPrimaryImage
                  ? "image/jpeg,image/png,image/webp,application/pdf,video/mp4,video/webm"
                  : "image/jpeg,image/png,image/webp"
              }
              required
              onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
            />
          </div>
          <small className={styles.fieldHelp}>
            {hasPrimaryImage
              ? "JPEG, PNG, or WebP up to 25 MB; PDF up to 20 MB; MP4 or WebM up to 50 MB."
              : "JPEG, PNG, or WebP image up to 25 MB."}
          </small>

          <div className={styles.fieldGroup}>
            <label
              className={styles.fieldLabel}
              htmlFor="record-media-description"
            >
              What does this file show or contain?{" "}
              <span className={styles.requiredTag}>Required</span>
            </label>
            <textarea
              id="record-media-description"
              className={styles.textarea}
              maxLength={500}
              required
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Example: Western face of the outcrop showing the limestone contact."
            />
            <small className={styles.fieldHelp}>
              This description is shown with the file and used as image
              alternative text when applicable.
            </small>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="record-media-rights">
              Why may Geo-Kurdistan use this file?{" "}
              <span className={styles.requiredTag}>Required</span>
            </label>
            <input
              id="record-media-rights"
              className={styles.input}
              maxLength={2000}
              required
              value={rights}
              onChange={(event) => setRights(event.target.value)}
              placeholder="Example: Photographed by our field team, used with permission"
            />
            <small className={styles.fieldHelp}>
              State who owns the file or what permission or licence allows its
              use.
            </small>
          </div>

          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              className={styles.checkboxInput}
              checked={isPrimary}
              disabled={!isChosenFileImage}
              onChange={(event) => setIsPrimary(event.target.checked)}
            />
            <span className={styles.checkboxText}>
              Use this as the record’s main image{" "}
              {!file || isChosenFileImage ? "" : "(images only)"}
            </span>
          </label>

          <details className={styles.mediaAdvancedFields}>
            <summary>More file information</summary>
            <div className={styles.formGrid}>
              <div className={styles.fieldGroup}>
                <label
                  className={styles.fieldLabel}
                  htmlFor="record-media-credit"
                >
                  Credit line (optional)
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
                <label
                  className={styles.fieldLabel}
                  htmlFor="record-media-licence"
                >
                  Licence name (optional)
                </label>
                <input
                  id="record-media-licence"
                  className={styles.input}
                  maxLength={160}
                  value={licence}
                  onChange={(event) => setLicence(event.target.value)}
                  placeholder="Example: CC BY 4.0"
                />
              </div>
            </div>
          </details>

          <div className={styles.actionsBar}>
            <button
              className={styles.buttonPrimary}
              type="submit"
              disabled={uploading || !file}
            >
              {uploading
                ? "Uploading…"
                : hasPrimaryImage
                  ? "Add file"
                  : "Add main image"}
            </button>
          </div>
        </form>
        </details>
      )}

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
