"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, CircleAlert, RotateCcw, Send, Upload } from "lucide-react";
import Link from "@/components/safe-link";
import { DashboardApiError, type ScientificRecordStatus } from "@/lib/dashboard-api";
import { buildRecordEditHref, buildRecordsSignInHref } from "@/lib/record-list-state";
import {
  getRecordReadiness,
  publishRecord,
  requestRecordChanges,
  submitRecordForReview,
  unpublishRecord,
  type RecordReadiness,
} from "@/lib/record-publication-api";
import type { RecordWorkspaceSectionId } from "./record-workspace-nav";
import styles from "./record-editor.module.css";

const issueSections: Record<string, RecordWorkspaceSectionId> = {
  translations: "details",
  classification: "scientific",
  attributes: "scientific",
  category: "scientific",
  evidence: "sources",
  location: "location",
  media: "media",
};

export function issueActionLabel(field: string, code: string): string {
  if (field === "media") {
    return [
      "primary_image_rights_required",
      "primary_image_alt_text_required",
    ].includes(code)
      ? "Fix main image"
      : "View files";
  }
  if (field === "evidence") return "View sources";
  if (field === "location") return "View location";
  return "Open section";
}

export function RecordReviewPanel({
  recordId,
  status,
  returnTo,
  onRecordChanged,
  onSelectSection,
}: {
  recordId: string;
  status: ScientificRecordStatus;
  returnTo?: string;
  onRecordChanged: () => void;
  onSelectSection?: (section: RecordWorkspaceSectionId) => void;
}) {
  const [readiness, setReadiness] = useState<RecordReadiness | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<DashboardApiError | null>(null);

  useEffect(() => {
    let current = true;
    getRecordReadiness(recordId)
      .then((result) => {
        if (current) setReadiness(result);
      })
      .catch((cause) => {
        if (current)
          setError(
            cause instanceof DashboardApiError
              ? cause
              : new DashboardApiError("Readiness could not be checked.", 0, "server"),
          );
      });
    return () => {
      current = false;
    };
  }, [recordId, status]);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      onRecordChanged();
    } catch (cause) {
      setError(
        cause instanceof DashboardApiError
          ? cause
          : new DashboardApiError("The record could not be updated.", 0, "server"),
      );
    } finally {
      setBusy(false);
    }
  }

  if (!readiness && !error) {
    return <div className={styles.reviewLoading} role="status">Checking readiness…</div>;
  }

  return (
    <section className={styles.reviewPanel} aria-labelledby="record-review-title">
      <div className={styles.reviewHeading}>
        <div>
          <span className={styles.workspaceEyebrow}>Final check</span>
          <h2 id="record-review-title">Review and publish</h2>
        </div>
        {readiness && (
          <span className={readiness.issues.length === 0 ? styles.reviewReady : styles.reviewNeedsWork}>
            {readiness.issues.length === 0 ? <CheckCircle2 aria-hidden="true" /> : <CircleAlert aria-hidden="true" />}
            {readiness.issues.length === 0 ? "Ready" : `${readiness.issues.length} to resolve`}
          </span>
        )}
      </div>

      {error && (
        <div className={styles.reviewError} role="alert">
          <p>{error.message}</p>
          {error.kind === "reauthentication" && (
            <Link
              href={buildRecordsSignInHref(
                buildRecordEditHref(recordId, returnTo),
              )}
            >
              Confirm identity and return
            </Link>
          )}
        </div>
      )}

      {readiness && readiness.issues.length > 0 && (
        <ul className={styles.reviewChecklist}>
          {readiness.issues.map((issue) => {
            const section =
              issue.field === "reviewer"
                ? undefined
                : (issueSections[issue.field] ?? "scientific");
            return (
              <li key={`${issue.field}:${issue.code}`}>
                <CircleAlert aria-hidden="true" />
                <span>{issue.message}</span>
                {section && onSelectSection && status === "draft" && (
                  <button type="button" onClick={() => onSelectSection(section)}>
                    {issueActionLabel(issue.field, issue.code)}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {readiness && status === "draft" && (
        <div className={styles.reviewActions}>
          <p>Run the final checks, then move this draft to the publication step.</p>
          <button
            type="button"
            className={styles.button}
            disabled={!readiness.readyForReview || busy}
            onClick={() => void run(() => submitRecordForReview(recordId))}
          >
            <Send aria-hidden="true" /> Submit for review
          </button>
        </div>
      )}

      {readiness && status === "in_review" && (
        <div className={styles.reviewDecisionGrid}>
          <div>
            <h3>Publish record</h3>
            <p>Make this record available after every check passes.</p>
            <button
              type="button"
              className={styles.button}
              disabled={!readiness.publishableByCurrentUser || busy || error?.kind === "reauthentication"}
              onClick={() => void run(() => publishRecord(recordId))}
            >
              <Upload aria-hidden="true" /> Publish
            </button>
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (reason.trim().length >= 2)
                void run(() => requestRecordChanges(recordId, reason.trim()));
            }}
          >
            <label htmlFor="review-change-reason">Return for changes</label>
            <textarea
              id="review-change-reason"
              value={reason}
              maxLength={500}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Explain what needs attention"
            />
            <button type="submit" className={styles.buttonSecondary} disabled={reason.trim().length < 2 || busy}>
              <RotateCcw aria-hidden="true" /> Return to draft
            </button>
          </form>
        </div>
      )}

      {readiness && status === "published" && (
        <div className={styles.reviewActions}>
          <p>
            Editing returns this record to draft and temporarily hides it from visitors. No
            content is deleted, and you can publish it again after correcting it.
          </p>
          <button
            type="button"
            className={styles.buttonSecondary}
            disabled={busy}
            onClick={() => {
              if (
                window.confirm(
                  "Edit this published record? It will be hidden from visitors until you publish it again.",
                )
              )
                void run(() => unpublishRecord(recordId));
            }}
          >
            <RotateCcw aria-hidden="true" /> Edit published record
          </button>
        </div>
      )}
    </section>
  );
}
