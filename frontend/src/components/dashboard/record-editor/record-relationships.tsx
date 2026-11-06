"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  DashboardApiError,
  listDashboardRecords,
  listDashboardResearch,
} from "@/lib/dashboard-api";
import {
  addRecordRelationship,
  listRecordRelationships,
  type RecordRelationship,
} from "@/lib/record-extras-api";
import styles from "./record-editor.module.css";

type Target = { id: string; title: string };
const PAGE_SIZE = 50;

export function RecordRelationships({
  recordId,
  readOnly = false,
  loadCandidates = true,
  onCountChange,
}: {
  recordId: string;
  readOnly?: boolean;
  loadCandidates?: boolean;
  onCountChange?: (count: number) => void;
}) {
  const [items, setItems] = useState<RecordRelationship[]>([]);
  const [targets, setTargets] = useState<Target[]>([]);
  const [targetType, setTargetType] = useState<"record" | "research">("record");
  const [targetId, setTargetId] = useState("");
  const [notes, setNotes] = useState("");
  const [totalTargets, setTotalTargets] = useState(0);
  const [loadedTargetCount, setLoadedTargetCount] = useState(0);
  const [loadingTargets, setLoadingTargets] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    listRecordRelationships(recordId)
      .then((loaded) => {
        if (active) setItems(loaded);
      })
      .catch(() => {
        if (active) setError("Related items could not be loaded.");
      });
    return () => {
      active = false;
    };
  }, [recordId]);

  useEffect(() => onCountChange?.(items.length), [items.length, onCountChange]);

  useEffect(() => {
    if (readOnly || !loadCandidates) {
      return;
    }
    let active = true;
    const query =
      targetType === "record"
        ? listDashboardRecords({ limit: PAGE_SIZE, offset: 0 })
        : listDashboardResearch({ limit: PAGE_SIZE, offset: 0 });
    query
      .then((result) => {
        if (!active) return;
        setTargets(
          result.items
            .filter((item) => item.id !== recordId)
            .map((item) => ({
              id: item.id,
              title: item.title?.trim() || "Untitled item",
            })),
        );
        setTotalTargets(result.total);
        setLoadedTargetCount(result.items.length);
      })
      .catch(() => {
        if (active) setError("Available items could not be loaded.");
      })
      .finally(() => {
        if (active) setLoadingTargets(false);
      });
    return () => {
      active = false;
    };
  }, [targetType, recordId, readOnly, loadCandidates]);

  async function loadMore() {
    setLoadingTargets(true);
    setError(null);
    try {
      const result =
        targetType === "record"
          ? await listDashboardRecords({
              limit: PAGE_SIZE,
              offset: loadedTargetCount,
            })
          : await listDashboardResearch({
              limit: PAGE_SIZE,
              offset: loadedTargetCount,
            });
      setTargets((current) => [
        ...current,
        ...result.items
          .filter((item) => item.id !== recordId)
          .map((item) => ({
            id: item.id,
            title: item.title?.trim() || "Untitled item",
          })),
      ]);
      setTotalTargets(result.total);
      setLoadedTargetCount((count) => count + result.items.length);
    } catch {
      setError("More items could not be loaded.");
    } finally {
      setLoadingTargets(false);
    }
  }

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    if (!targetId || targetId === recordId) return;
    setSaving(true);
    try {
      await addRecordRelationship(recordId, {
        targetType,
        targetId,
        relationshipType: targetType === "record" ? "related_to" : "cites",
        notes: notes.trim() || undefined,
      });
      setItems(await listRecordRelationships(recordId));
      setTargetId("");
      setNotes("");
      setMessage("Related item added.");
    } catch (cause) {
      setError(
        cause instanceof DashboardApiError
          ? cause.message
          : "The related item could not be added.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={styles.stepCard} aria-labelledby="record-related-title">
      <div className={styles.stepHeader}>
        <h2 id="record-related-title" className={styles.stepTitle}>
          Related items
        </h2>
        <p className={styles.stepDescription}>
          Optional. Connect another record or research publication for internal
          organization. These connections are not shown on the current public
          record page.
        </p>
      </div>
      {items.length > 0 && (
        <ul className={styles.detailList}>
          {items.map((item) => (
            <li key={item.id} className={styles.detailListItem}>
              <span>
                {item.targetType === "record"
                  ? "Related record"
                  : "Cited research"}
                :{" "}
                {item.targetTitle ||
                  targets.find((target) => target.id === item.targetId)
                    ?.title ||
                  "Untitled item"}
              </span>
              {item.notes && <small>{item.notes}</small>}
            </li>
          ))}
        </ul>
      )}
      {items.length === 0 && (
        <p className={styles.stepDescription}>No related items yet.</p>
      )}
      {!readOnly && (
        <form className={styles.formSection} onSubmit={add}>
          <div className={styles.formGrid}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="related-kind">
                Connect to
              </label>
              <select
                className={styles.select}
                id="related-kind"
                value={targetType}
                disabled={loadingTargets}
                onChange={(event) => {
                  setTargets([]);
                  setLoadedTargetCount(0);
                  setTargetId("");
                  setLoadingTargets(true);
                  setTargetType(event.target.value as "record" | "research");
                }}
              >
                <option value="record">Scientific record</option>
                <option value="research">Research publication</option>
              </select>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="related-target">
                Item
              </label>
              <select
                className={styles.select}
                id="related-target"
                required
                value={targetId}
                onChange={(event) => setTargetId(event.target.value)}
                disabled={loadingTargets || targets.length === 0}
              >
                <option value="">
                  {loadingTargets
                    ? "Loading items…"
                    : targets.length === 0
                      ? "No items available"
                      : "Choose an item"}
                </option>
                {targets.map((target) => (
                  <option key={target.id} value={target.id}>
                    {target.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {loadedTargetCount < totalTargets && (
            <button
              className={styles.buttonSecondary}
              type="button"
              onClick={loadMore}
              disabled={loadingTargets}
            >
              Load more items
            </button>
          )}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="relationship-notes">
              Why are they related? (optional)
            </label>
            <textarea
              id="relationship-notes"
              className={styles.textarea}
              maxLength={2000}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
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
              disabled={saving || !targetId}
            >
              {saving ? "Adding…" : "Add related item"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
