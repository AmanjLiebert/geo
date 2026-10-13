"use client";

import { useEffect, useState, type FormEvent } from "react";
import { DashboardApiError } from "@/lib/dashboard-api";
import {
  getOnlineMediaPages,
  listRecordMedia,
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
];

export function RecordMedia({ recordId }: { recordId: string }) {
  const [items, setItems] = useState<RecordMediaAttachment[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [rights, setRights] = useState("");
  const [credit, setCredit] = useState("");
  const [licence, setLicence] = useState("");
  const [purpose, setPurpose] = useState("");
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [view, setView] = useState<{
    filename: string;
    pages: OnlineMediaPage[];
  } | null>(null);

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
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") setView(null);
    }
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [view]);

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    if (!file || !ACCEPTED_TYPES.includes(file.type)) {
      setError("Choose a JPEG, PNG, WebP, or PDF file.");
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
      });
      setItems(await listRecordMedia(recordId));
      setFile(null);
      setRights("");
      setCredit("");
      setLicence("");
      setPurpose("");
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
      setView({
        filename: item.filename,
        pages: await getOnlineMediaPages(item.mediaAssetId),
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

  return (
    <section className={styles.stepCard} aria-labelledby="record-media-title">
      <div className={styles.stepHeader}>
        <h2 id="record-media-title" className={styles.stepTitle}>
          Images and documents
        </h2>
        <p className={styles.stepDescription}>
          Add field images or supporting PDFs. Files are checked before they can
          be viewed.
        </p>
      </div>
      <button
        className={styles.buttonSecondary}
        type="button"
        onClick={() => void refreshFiles()}
        disabled={refreshing}
      >
        {refreshing ? "Refreshing…" : "Refresh files"}
      </button>
      {items.length > 0 ? (
        <ul className={styles.detailList}>
          {items.map((item) => (
            <li key={item.mediaAssetId} className={styles.detailListItem}>
              <span>{item.filename}</span>
              <small>
                {item.purpose} ·{" "}
                {item.processingStatus === "approved"
                  ? "Ready"
                  : item.processingStatus === "rejected" ||
                      item.processingStatus === "failed"
                    ? "Could not be processed"
                    : "Processing"}
              </small>
              {item.processingStatus === "approved" && (
                <button
                  className={styles.buttonSecondary}
                  type="button"
                  onClick={() => void openViewer(item)}
                >
                  View online
                </button>
              )}
            </li>
          ))}
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
            accept="image/jpeg,image/png,image/webp,application/pdf"
            required
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
          <small className={styles.fieldHelp}>
            Images up to 25 MB; PDFs up to 20 MB.
          </small>
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} htmlFor="record-media-purpose">
            Purpose or caption{" "}
            <span className={styles.requiredTag}>Required</span>
          </label>
          <input
            id="record-media-purpose"
            className={styles.input}
            maxLength={40}
            required
            value={purpose}
            onChange={(event) => setPurpose(event.target.value)}
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
                  {/* Approved derivative only; the original file is never linked from this screen. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
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
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
