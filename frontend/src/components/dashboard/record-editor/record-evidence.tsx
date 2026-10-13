"use client";

import { useEffect, useState, type FormEvent } from "react";
import { DashboardApiError, type TemplateField } from "@/lib/dashboard-api";
import {
  addRecordEvidence,
  createReference,
  listRecordEvidence,
  searchReferences,
  type RecordEvidenceItem,
  type ReferenceChoice,
} from "@/lib/record-trust-api";
import styles from "./record-editor.module.css";

export function RecordEvidence({
  recordId,
  fields,
}: {
  recordId: string;
  fields: TemplateField[];
}) {
  const [evidence, setEvidence] = useState<RecordEvidenceItem[]>([]);
  const [references, setReferences] = useState<ReferenceChoice[]>([]);
  const [query, setQuery] = useState("");
  const [referenceId, setReferenceId] = useState("");
  const [fieldKey, setFieldKey] = useState("");
  const [evidenceKind, setEvidenceKind] = useState("published_source");
  const [notes, setNotes] = useState("");
  const [sourceType, setSourceType] = useState("journal");
  const [sourceTitle, setSourceTitle] = useState("");
  const [sourceAuthor, setSourceAuthor] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceIdentifier, setSourceIdentifier] = useState("");
  const [sourcePublication, setSourcePublication] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([listRecordEvidence(recordId), searchReferences("")])
      .then(([loadedEvidence, loadedReferences]) => {
        if (active) {
          setEvidence(loadedEvidence);
          setReferences(loadedReferences);
        }
      })
      .catch(() => {
        if (active) setError("Source information could not be loaded.");
      });
    return () => {
      active = false;
    };
  }, [recordId]);

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      setReferences(await searchReferences(query));
    } catch {
      setError("Sources could not be found.");
    }
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    if (
      !sourceTitle.trim() ||
      !sourceAuthor.trim() ||
      !(sourceUrl.trim() || sourceIdentifier.trim() || sourcePublication.trim())
    ) {
      setError(
        "Add a title, author, and source link, identifier, or publication.",
      );
      return;
    }
    if (sourceUrl.trim() && !sourceUrl.trim().startsWith("https://")) {
      setError("Source links must begin with https://.");
      return;
    }
    setBusy(true);
    try {
      const id = await createReference({
        sourceType,
        title: sourceTitle.trim(),
        authors: [{ name: sourceAuthor.trim() }],
        sourceUrl: sourceUrl.trim() || undefined,
        identifier: sourceIdentifier.trim() || undefined,
        publication: sourcePublication.trim() || undefined,
      });
      setReferences((current) => [
        {
          id,
          title: sourceTitle.trim(),
          sourceType,
          identifier: sourceIdentifier.trim() || null,
          verificationStatus: "unverified",
        },
        ...current.filter((item) => item.id !== id),
      ]);
      setReferenceId(id);
      setSourceTitle("");
      setSourceAuthor("");
      setSourceUrl("");
      setSourceIdentifier("");
      setSourcePublication("");
      setMessage("Source saved. Choose what it supports below.");
    } catch (cause) {
      setError(
        cause instanceof DashboardApiError
          ? cause.message
          : "The source could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function attach(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    if (!referenceId) return;
    setBusy(true);
    try {
      await addRecordEvidence(recordId, {
        referenceId,
        evidenceKind,
        fieldKey: fieldKey || undefined,
        notes: notes.trim() || undefined,
      });
      setEvidence(await listRecordEvidence(recordId));
      setReferenceId("");
      setFieldKey("");
      setNotes("");
      setMessage("Source attached to this record.");
    } catch (cause) {
      setError(
        cause instanceof DashboardApiError
          ? cause.message
          : "The source could not be attached.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className={styles.stepCard}
      aria-labelledby="record-evidence-title"
    >
      <div className={styles.stepHeader}>
        <h2 id="record-evidence-title" className={styles.stepTitle}>
          Sources and evidence
        </h2>
        <p className={styles.stepDescription}>
          Connect a source to the whole record or to one scientific field.
        </p>
      </div>
      {evidence.length ? (
        <ul className={styles.detailList}>
          {evidence.map((item) => (
            <li key={item.id} className={styles.detailListItem}>
              <span>
                {item.referenceTitle}
                {item.fieldKey
                  ? ` · ${fields.find((field) => field.stableKey === item.fieldKey)?.label || "Scientific field"}`
                  : " · Whole record"}
              </span>
              <small>
                {item.verificationStatus === "verified"
                  ? "Verified source"
                  : "Source awaiting verification"}
              </small>
              {item.notes && <small>{item.notes}</small>}
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.stepDescription}>No sources attached yet.</p>
      )}
      <form className={styles.formSection} onSubmit={search}>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} htmlFor="reference-search">
            Find an existing source
          </label>
          <input
            id="reference-search"
            className={styles.input}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            maxLength={120}
          />
        </div>
        <button className={styles.buttonSecondary} type="submit">
          Search sources
        </button>
      </form>
      <form className={styles.formSection} onSubmit={attach}>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} htmlFor="reference-choice">
            Source
          </label>
          <select
            id="reference-choice"
            className={styles.select}
            required
            value={referenceId}
            onChange={(event) => setReferenceId(event.target.value)}
          >
            <option value="">Choose a source</option>
            {references.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
                {item.identifier ? ` (${item.identifier})` : ""}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.formGrid}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="evidence-kind">
              Evidence type
            </label>
            <select
              id="evidence-kind"
              className={styles.select}
              value={evidenceKind}
              onChange={(event) => setEvidenceKind(event.target.value)}
            >
              <option value="published_source">Published source</option>
              <option value="field_observation">Field observation</option>
              <option value="map">Geological map</option>
              <option value="dataset">Dataset</option>
            </select>
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="evidence-field">
              Supports
            </label>
            <select
              id="evidence-field"
              className={styles.select}
              value={fieldKey}
              onChange={(event) => setFieldKey(event.target.value)}
            >
              <option value="">The whole record</option>
              {fields
                .filter((field) => field.status === "active")
                .map((field) => (
                  <option key={field.stableKey} value={field.stableKey}>
                    {field.label}
                  </option>
                ))}
            </select>
          </div>
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} htmlFor="evidence-notes">
            Evidence notes (optional)
          </label>
          <textarea
            id="evidence-notes"
            className={styles.textarea}
            maxLength={2000}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </div>
        <div className={styles.actionsBar}>
          <button
            className={styles.buttonPrimary}
            type="submit"
            disabled={busy || !referenceId}
          >
            {busy ? "Saving…" : "Attach source"}
          </button>
        </div>
      </form>
      <details className={styles.detailDisclosure}>
        <summary>Add a new source</summary>
        <form className={styles.formSection} onSubmit={create}>
          <div className={styles.formGrid}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="source-type">
                Source type
              </label>
              <select
                id="source-type"
                className={styles.select}
                value={sourceType}
                onChange={(event) => setSourceType(event.target.value)}
              >
                <option value="journal">Journal</option>
                <option value="book">Book</option>
                <option value="map">Map</option>
                <option value="institution">Institution</option>
                <option value="catalogue">Catalogue</option>
                <option value="dataset">Dataset</option>
                <option value="website">Website</option>
                <option value="research">Research</option>
              </select>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="source-title">
                Title <span className={styles.requiredTag}>Required</span>
              </label>
              <input
                id="source-title"
                className={styles.input}
                maxLength={500}
                required
                value={sourceTitle}
                onChange={(event) => setSourceTitle(event.target.value)}
              />
            </div>
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="source-author">
              Author or institution{" "}
              <span className={styles.requiredTag}>Required</span>
            </label>
            <input
              id="source-author"
              className={styles.input}
              maxLength={240}
              required
              value={sourceAuthor}
              onChange={(event) => setSourceAuthor(event.target.value)}
            />
          </div>
          <div className={styles.formGrid}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="source-url">
                HTTPS link
              </label>
              <input
                id="source-url"
                className={styles.input}
                type="url"
                maxLength={2000}
                value={sourceUrl}
                onChange={(event) => setSourceUrl(event.target.value)}
              />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="source-identifier">
                DOI or identifier
              </label>
              <input
                id="source-identifier"
                className={styles.input}
                maxLength={240}
                value={sourceIdentifier}
                onChange={(event) => setSourceIdentifier(event.target.value)}
              />
            </div>
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="source-publication">
              Publication or publisher
            </label>
            <input
              id="source-publication"
              className={styles.input}
              maxLength={300}
              value={sourcePublication}
              onChange={(event) => setSourcePublication(event.target.value)}
            />
          </div>
          <p className={styles.fieldHelp}>
            Provide at least one of: HTTPS link, identifier, or publication.
          </p>
          <div className={styles.actionsBar}>
            <button
              className={styles.buttonPrimary}
              type="submit"
              disabled={busy}
            >
              {busy ? "Saving…" : "Save source"}
            </button>
          </div>
        </form>
      </details>
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
    </section>
  );
}
