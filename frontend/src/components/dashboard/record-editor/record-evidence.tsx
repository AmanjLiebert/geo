"use client";

import { useEffect, useState, type FormEvent } from "react";
import { BookOpen, Plus, Search } from "lucide-react";
import { DashboardApiError, type TemplateField } from "@/lib/dashboard-api";
import {
  addRecordEvidence,
  createReference,
  listRecordEvidence,
  searchReferences,
  type RecordEvidenceItem,
  type ReferenceChoice,
} from "@/lib/record-trust-api";
import {
  SOURCE_TYPES,
  formatSourceType,
  getSourceTypeConfig,
  inferEvidenceKind,
  normalizeHttpsUrl,
  parseOptionalPublicationYear,
  type SourceType,
} from "./record-evidence-utils";
import styles from "./record-editor.module.css";

type SourceMode = "new" | "saved";

export function RecordEvidence({
  recordId,
  fields,
}: {
  recordId: string;
  fields: TemplateField[];
}) {
  const [evidence, setEvidence] = useState<RecordEvidenceItem[]>([]);
  const [references, setReferences] = useState<ReferenceChoice[]>([]);
  const [mode, setMode] = useState<SourceMode>("new");
  const [query, setQuery] = useState("");
  const [referenceId, setReferenceId] = useState("");
  const [fieldKey, setFieldKey] = useState("");
  const [notes, setNotes] = useState("");
  const [sourceType, setSourceType] = useState<SourceType>("journal");
  const [sourceTitle, setSourceTitle] = useState("");
  const [sourceAuthor, setSourceAuthor] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceIdentifier, setSourceIdentifier] = useState("");
  const [sourcePublication, setSourcePublication] = useState("");
  const [sourceYear, setSourceYear] = useState("");
  const [sourcePages, setSourcePages] = useState("");
  const [sourceRights, setSourceRights] = useState("");
  const [busy, setBusy] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const sourceConfig = getSourceTypeConfig(sourceType);
  const selectedReference = references.find((item) => item.id === referenceId);
  const activeFields = fields.filter((field) => field.status === "active");

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

  function clearFeedback() {
    setError(null);
    setMessage(null);
  }

  function resetTarget() {
    setFieldKey("");
    setNotes("");
  }

  function resetNewSource() {
    setSourceTitle("");
    setSourceAuthor("");
    setSourceUrl("");
    setSourceIdentifier("");
    setSourcePublication("");
    setSourceYear("");
    setSourcePages("");
    setSourceRights("");
  }

  async function refreshEvidence() {
    setEvidence(await listRecordEvidence(recordId));
  }

  async function searchSavedSources() {
    clearFeedback();
    setSearching(true);
    try {
      setReferences(await searchReferences(query));
      setReferenceId("");
    } catch {
      setError("Sources could not be found.");
    } finally {
      setSearching(false);
    }
  }

  async function attachSaved(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearFeedback();
    if (!selectedReference) {
      setError("Choose a saved source first.");
      return;
    }
    setBusy(true);
    try {
      await addRecordEvidence(recordId, {
        referenceId: selectedReference.id,
        evidenceKind: inferEvidenceKind(selectedReference.sourceType),
        fieldKey: fieldKey || undefined,
        notes: notes.trim() || undefined,
      });
      await refreshEvidence();
      setReferenceId("");
      resetTarget();
      setMessage("Source connected to this record.");
    } catch (cause) {
      setError(
        cause instanceof DashboardApiError
          ? cause.message
          : "The source could not be connected.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function createAndAttach(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearFeedback();
    if (!sourceTitle.trim() || !sourceAuthor.trim()) {
      setError(
        `Add the ${sourceConfig.titleLabel.toLowerCase()} and ${sourceConfig.contributorLabel.toLowerCase()}.`,
      );
      return;
    }

    const normalizedUrl = normalizeHttpsUrl(sourceUrl);
    if (sourceUrl.trim() && !normalizedUrl) {
      setError("Enter a secure web address, such as example.org/source.");
      return;
    }
    if (sourceConfig.linkRequired && !normalizedUrl) {
      setError("Add the web address for this online source.");
      return;
    }
    if (
      !normalizedUrl &&
      !sourceIdentifier.trim() &&
      !sourcePublication.trim()
    ) {
      setError(
        `Add a web address, ${sourceConfig.identifierLabel.toLowerCase()}, or ${sourceConfig.publicationLabel.toLowerCase()}.`,
      );
      return;
    }
    const parsedYear = parseOptionalPublicationYear(sourceYear);
    if ("error" in parsedYear) {
      setError(parsedYear.error);
      return;
    }

    setBusy(true);
    let createdReferenceId: string | null = null;
    try {
      createdReferenceId = await createReference({
        sourceType,
        title: sourceTitle.trim(),
        authors: [{ name: sourceAuthor.trim() }],
        sourceUrl: normalizedUrl,
        identifier: sourceIdentifier.trim() || undefined,
        publication: sourcePublication.trim() || undefined,
        publicationYear: parsedYear.value,
        pagesOrFigure: sourcePages.trim() || undefined,
        rightsStatement: sourceRights.trim() || undefined,
      });
      const savedReference: ReferenceChoice = {
        id: createdReferenceId,
        title: sourceTitle.trim(),
        sourceType,
        identifier: sourceIdentifier.trim() || null,
        verificationStatus: "unverified",
      };
      setReferences((current) => [
        savedReference,
        ...current.filter((item) => item.id !== createdReferenceId),
      ]);
      setReferenceId(createdReferenceId);

      await addRecordEvidence(recordId, {
        referenceId: createdReferenceId,
        evidenceKind: inferEvidenceKind(sourceType),
        fieldKey: fieldKey || undefined,
        notes: notes.trim() || undefined,
      });
      await refreshEvidence();
      setReferenceId("");
      resetNewSource();
      resetTarget();
      setMessage("Source saved and connected to this record.");
    } catch (cause) {
      if (createdReferenceId) {
        setMode("saved");
        setError(
          "The source was saved, but it could not be connected. It is selected below so you can try again.",
        );
      } else {
        setError(
          cause instanceof DashboardApiError
            ? cause.message
            : "The source could not be saved.",
        );
      }
    } finally {
      setBusy(false);
    }
  }

  const targetFields = (
    <div className={styles.sourceTargetPanel}>
      <div>
        <h3>What does this source support?</h3>
        <p>
          Usually the whole record. Choose a field only for a specific claim.
        </p>
      </div>
      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel} htmlFor="evidence-field">
          Applies to
        </label>
        <select
          id="evidence-field"
          className={styles.select}
          value={fieldKey}
          onChange={(event) => setFieldKey(event.target.value)}
        >
          <option value="">The whole record</option>
          {activeFields.map((field) => (
            <option key={field.stableKey} value={field.stableKey}>
              Only the field: {field.label}
            </option>
          ))}
        </select>
      </div>
      <details className={styles.sourceNotesDisclosure}>
        <summary>Add a note about how this source supports the record</summary>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} htmlFor="evidence-notes">
            Supporting note (optional)
          </label>
          <textarea
            id="evidence-notes"
            className={styles.textarea}
            maxLength={2000}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Example: Figure 4 supports the mapped contact shown in this record."
          />
        </div>
      </details>
    </div>
  );

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
          Cite where the scientific information came from and what it supports.
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

      <div className={styles.sourceCollectionHeader}>
        <div>
          <h3>Sources connected to this record</h3>
          <p>
            {evidence.length === 0
              ? "No sources have been connected."
              : `${evidence.length} ${evidence.length === 1 ? "source" : "sources"}`}
          </p>
        </div>
      </div>

      {evidence.length > 0 ? (
        <ul className={styles.sourceCitationList}>
          {evidence.map((item) => {
            const fieldLabel = item.fieldKey
              ? activeFields.find((field) => field.stableKey === item.fieldKey)
                  ?.label || "Scientific field"
              : null;
            return (
              <li key={item.id} className={styles.sourceCitationCard}>
                <div className={styles.sourceCitationIcon} aria-hidden="true">
                  <BookOpen />
                </div>
                <div className={styles.sourceCitationBody}>
                  <div className={styles.sourceCitationHeading}>
                    <strong>{item.referenceTitle}</strong>
                    <span className={styles.kindBadge}>
                      {formatSourceType(item.sourceType)}
                    </span>
                    <span
                      className={
                        item.verificationStatus === "verified"
                          ? styles.statusBadgeReady
                          : styles.statusBadgeProcessing
                      }
                    >
                      {item.verificationStatus === "verified"
                        ? "Verified"
                        : "Awaiting verification"}
                    </span>
                  </div>
                  <p>
                    Supports:{" "}
                    {fieldLabel ? `Only ${fieldLabel}` : "Whole record"}
                  </p>
                  {item.notes && <small>{item.notes}</small>}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className={styles.sourceEmptyState}>
          <BookOpen aria-hidden="true" />
          <div>
            <strong>Add the first source</strong>
            <p>
              Use a journal, book, report, map, dataset, or trusted web page.
            </p>
          </div>
        </div>
      )}

      <div
        className={styles.sourceModeSwitch}
        aria-label="Choose source method"
      >
        <button
          type="button"
          className={
            mode === "new"
              ? styles.sourceModeButtonActive
              : styles.sourceModeButton
          }
          aria-pressed={mode === "new"}
          onClick={() => {
            clearFeedback();
            setMode("new");
          }}
        >
          <Plus aria-hidden="true" />
          <span>
            <strong>Add a new source</strong>
            <small>Enter a citation for the first time</small>
          </span>
        </button>
        <button
          type="button"
          className={
            mode === "saved"
              ? styles.sourceModeButtonActive
              : styles.sourceModeButton
          }
          aria-pressed={mode === "saved"}
          onClick={() => {
            clearFeedback();
            setMode("saved");
          }}
        >
          <Search aria-hidden="true" />
          <span>
            <strong>Use a saved source</strong>
            <small>Reuse a citation already in Geo-Kurdistan</small>
          </span>
        </button>
      </div>

      {mode === "new" ? (
        <form className={styles.sourceForm} onSubmit={createAndAttach}>
          <div className={styles.sourceFormHeader}>
            <span className={styles.stepNumber}>New citation</span>
            <h3>Describe the source</h3>
            <p>Choose the source type first. The labels below will adapt.</p>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="source-type">
              What kind of source is it?
            </label>
            <select
              id="source-type"
              className={styles.select}
              value={sourceType}
              onChange={(event) =>
                setSourceType(event.target.value as SourceType)
              }
            >
              {SOURCE_TYPES.map((value) => (
                <option key={value} value={value}>
                  {formatSourceType(value)}
                </option>
              ))}
            </select>
            <small className={styles.fieldHelp}>
              {sourceConfig.description}
            </small>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="source-title">
              {sourceConfig.titleLabel}{" "}
              <span className={styles.requiredTag}>Required</span>
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

          <div className={styles.formGrid}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="source-author">
                {sourceConfig.contributorLabel}{" "}
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
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="source-publication">
                {sourceConfig.publicationLabel}
              </label>
              <input
                id="source-publication"
                className={styles.input}
                maxLength={300}
                value={sourcePublication}
                onChange={(event) => setSourcePublication(event.target.value)}
              />
            </div>
          </div>

          <div className={styles.formGrid}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="source-url">
                Web address
                {sourceConfig.linkRequired ? " (required)" : " (optional)"}
              </label>
              <input
                id="source-url"
                className={styles.input}
                type="text"
                inputMode="url"
                maxLength={2000}
                required={sourceConfig.linkRequired}
                value={sourceUrl}
                onChange={(event) => setSourceUrl(event.target.value)}
                placeholder="example.org/source"
              />
              <small className={styles.fieldHelp}>
                You may paste a secure link with or without https://.
              </small>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="source-identifier">
                {sourceConfig.identifierLabel} (optional)
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

          <details className={styles.sourceDetailsDisclosure}>
            <summary>
              Add year, pages, rights, or other citation details
            </summary>
            <div className={styles.formGrid}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="source-year">
                  Publication year (optional)
                </label>
                <input
                  id="source-year"
                  className={styles.input}
                  inputMode="numeric"
                  maxLength={4}
                  value={sourceYear}
                  onChange={(event) => setSourceYear(event.target.value)}
                  placeholder="2026"
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="source-pages">
                  {sourceConfig.pagesLabel} (optional)
                </label>
                <input
                  id="source-pages"
                  className={styles.input}
                  maxLength={160}
                  value={sourcePages}
                  onChange={(event) => setSourcePages(event.target.value)}
                />
              </div>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="source-rights">
                Rights or reuse statement (optional)
              </label>
              <textarea
                id="source-rights"
                className={styles.textarea}
                maxLength={2000}
                value={sourceRights}
                onChange={(event) => setSourceRights(event.target.value)}
                placeholder="Especially useful for maps, datasets, and online images."
              />
            </div>
          </details>

          {targetFields}

          <p className={styles.sourceMediaHint}>
            To upload a photograph, PDF, or video to the record, use Images and
            files. This section records the citation and provenance.
          </p>

          <div className={styles.actionsBar}>
            <button
              className={styles.buttonPrimary}
              type="submit"
              disabled={busy}
            >
              {busy ? "Saving…" : "Save and connect source"}
            </button>
          </div>
        </form>
      ) : (
        <form className={styles.sourceForm} onSubmit={attachSaved}>
          <div className={styles.sourceFormHeader}>
            <span className={styles.stepNumber}>Saved citations</span>
            <h3>Find a source</h3>
            <p>Search by title, DOI, ISBN, or catalogue identifier.</p>
          </div>

          <div className={styles.sourceSearchRow}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="reference-search">
                Search saved sources
              </label>
              <input
                id="reference-search"
                className={styles.input}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                maxLength={120}
                placeholder="Title, DOI, ISBN, or catalogue number"
              />
            </div>
            <button
              className={styles.buttonSecondary}
              type="button"
              disabled={searching}
              onClick={() => void searchSavedSources()}
            >
              <Search size={16} aria-hidden="true" />
              {searching ? "Searching…" : "Search"}
            </button>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="reference-choice">
              Choose a source
            </label>
            <select
              id="reference-choice"
              className={styles.select}
              required
              value={referenceId}
              onChange={(event) => setReferenceId(event.target.value)}
            >
              <option value="">Choose a saved source</option>
              {references.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title} · {formatSourceType(item.sourceType)}
                  {item.identifier ? ` · ${item.identifier}` : ""}
                </option>
              ))}
            </select>
          </div>

          {selectedReference && (
            <div className={styles.sourceSelectedSummary}>
              <BookOpen aria-hidden="true" />
              <div>
                <strong>{selectedReference.title}</strong>
                <span>
                  {formatSourceType(selectedReference.sourceType)} ·{" "}
                  {selectedReference.verificationStatus === "verified"
                    ? "Verified"
                    : "Awaiting verification"}
                </span>
              </div>
            </div>
          )}

          {targetFields}

          <div className={styles.actionsBar}>
            <button
              className={styles.buttonPrimary}
              type="submit"
              disabled={busy || !selectedReference}
            >
              {busy ? "Connecting…" : "Connect selected source"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
