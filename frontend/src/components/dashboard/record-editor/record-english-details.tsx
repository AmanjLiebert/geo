"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  DashboardApiError,
  type ScientificRecordDetail,
} from "@/lib/dashboard-api";
import { saveEnglishRecordDetails } from "@/lib/record-extras-api";
import styles from "./record-editor.module.css";

type EnglishDetails = { title: string; summary: string; description: string };

export function RecordEnglishDetails({
  record,
  onSaved,
  onDirtyChange,
}: {
  record: ScientificRecordDetail;
  onSaved: (record: ScientificRecordDetail) => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const existing = record.translations.find((item) => item.locale === "en");
  const [saved, setSaved] = useState<EnglishDetails>({
    title: existing?.title ?? "",
    summary: existing?.summary ?? "",
    description: existing?.description ?? "",
  });
  const [details, setDetails] = useState<EnglishDetails>(saved);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dirty =
    details.title !== saved.title ||
    details.summary !== saved.summary ||
    details.description !== saved.description;

  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    if (!details.title.trim()) {
      setError("Enter a title for this record.");
      return;
    }
    setSaving(true);
    try {
      const normalized = {
        title: details.title.trim(),
        summary: details.summary.trim(),
        description: details.description.trim(),
      };
      const updated = await saveEnglishRecordDetails(record.id, normalized);
      setSaved(normalized);
      setDetails(normalized);
      onSaved(updated);
      setMessage("Record details saved.");
    } catch (cause) {
      setError(
        cause instanceof DashboardApiError
          ? cause.message
          : "Record details could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={styles.stepCard} aria-labelledby="record-details-title">
      <div className={styles.stepHeader}>
        <h2 id="record-details-title" className={styles.stepTitle}>
          Record details
        </h2>
        <p className={styles.stepDescription}>
          Add the English title and explanation for this record.
        </p>
        <p className={styles.fieldHelp}>
          Details status: {existing?.status === "reviewed" ? "Reviewed" : existing?.status === "published" ? "Published" : existing ? "Draft" : "Not added"}
        </p>
      </div>
      <form className={styles.formSection} onSubmit={save}>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} htmlFor="record-title">
            Title <span className={styles.requiredTag}>Required</span>
          </label>
          <input
            id="record-title"
            className={styles.input}
            maxLength={240}
            required
            value={details.title}
            onChange={(e) => setDetails({ ...details, title: e.target.value })}
          />
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} htmlFor="record-summary">
            Short summary
          </label>
          <textarea
            id="record-summary"
            className={styles.textarea}
            maxLength={2000}
            value={details.summary}
            onChange={(e) =>
              setDetails({ ...details, summary: e.target.value })
            }
          />
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} htmlFor="record-description">
            Description
          </label>
          <textarea
            id="record-description"
            className={styles.textarea}
            maxLength={100000}
            value={details.description}
            onChange={(e) =>
              setDetails({ ...details, description: e.target.value })
            }
          />
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
            disabled={saving || !dirty}
          >
            {saving ? "Saving…" : "Save details"}
          </button>
        </div>
      </form>
    </section>
  );
}
