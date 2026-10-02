"use client";

import { useEffect, useState } from "react";
import Link from "@/components/safe-link";
import {
  FileText,
  RotateCcw,
  AlertTriangle,
  Lock,
  ShieldAlert,
  Clock,
  Plus,
  Edit3,
} from "lucide-react";
import {
  listDashboardRecords,
  DashboardApiError,
  type DashboardRecordItem,
  type ScientificRecordStatus,
} from "@/lib/dashboard-api";
import {
  calculatePagination,
  formatDate,
  formatRecordStatus,
  getRecoveredOffset,
} from "@/components/dashboard/dashboard-list-utils";
import styles from "@/components/dashboard/dashboard-list.module.css";

const PAGE_SIZE = 20;

type FilterStatus = "all" | ScientificRecordStatus;

function getStatusBadgeClass(status: ScientificRecordStatus): string {
  switch (status) {
    case "published":
      return styles.statusPublished;
    case "in_review":
      return styles.statusInReview;
    case "draft":
      return styles.statusDraft;
    case "unclassified_draft":
      return styles.statusUnclassified;
    case "archived":
      return styles.statusArchived;
  }
}

export default function DashboardRecordsPage() {
  const [records, setRecords] = useState<DashboardRecordItem[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<DashboardApiError | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();

    listDashboardRecords({
      limit: PAGE_SIZE,
      offset,
      status: statusFilter === "all" ? undefined : statusFilter,
      signal: controller.signal,
    })
      .then((res) => {
        if (!ignore) {
          const recoveredOffset = getRecoveredOffset(res.total, PAGE_SIZE, offset);
          if (recoveredOffset !== null) {
            setOffset(recoveredOffset);
            return;
          }
          setRecords(res.items);
          setTotal(res.total);
          setError(null);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          if (err instanceof DashboardApiError && err.kind === "aborted") return;
          setError(
            err instanceof DashboardApiError
              ? err
              : new DashboardApiError("An unexpected error occurred.", 0, "server"),
          );
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [offset, statusFilter, retryKey]);

  function handleFilterChange(newFilter: FilterStatus) {
    setLoading(true);
    setStatusFilter(newFilter);
    setOffset(0);
  }

  function handleRetry() {
    setLoading(true);
    setError(null);
    setRetryKey((k) => k + 1);
  }

  function handlePageChange(newOffset: number) {
    setLoading(true);
    setOffset(newOffset);
  }

  const pagination = calculatePagination(total, PAGE_SIZE, offset);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerMain}>
          <div className={styles.titleRow}>
            <div className={styles.titleMark} aria-hidden="true">
              <FileText />
            </div>
            <h1 className={styles.title}>Scientific records</h1>
          </div>
          <Link href="/dashboard/records/new" className={styles.buttonPrimary}>
            <Plus size={16} aria-hidden="true" />
            <span>Add record</span>
          </Link>
        </div>
        <p className={styles.subtitle}>
          Browse, create, and edit geological draft records. Classification and scientific
          attributes determine readiness for future publication.
        </p>
      </header>

      {/* Filter and count bar */}
      <section className={styles.filterBar} aria-label="Record filtering and summary">
        <div className={styles.filterControls}>
          <div className={styles.filterGroup}>
            <label htmlFor="record-status-filter" className={styles.filterLabel}>
              Status
            </label>
            <select
              id="record-status-filter"
              className={styles.select}
              value={statusFilter}
              onChange={(e) => handleFilterChange(e.target.value as FilterStatus)}
              aria-label="Filter records by status"
            >
              <option value="all">All statuses</option>
              <option value="unclassified_draft">Unclassified draft</option>
              <option value="draft">Draft</option>
              <option value="in_review">In review</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        <div className={styles.countIndicator} aria-live="polite">
          {!loading && !error && (
            <span>
              {total} {total === 1 ? "record" : "records"} total
            </span>
          )}
        </div>
      </section>

      {/* Loading state */}
      {loading && (
        <div className={styles.loadingState} role="status" aria-live="polite">
          <div className={styles.loadingDot} aria-hidden="true" />
          <div className={styles.loadingDot} aria-hidden="true" />
          <div className={styles.loadingDot} aria-hidden="true" />
          <span>Loading scientific records…</span>
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className={styles.errorState} role="alert">
          {error.kind === "unauthorized" && (
            <>
              <div className={styles.titleRow}>
                <Lock className={styles.errorIcon} aria-hidden="true" />
                <h2 className={styles.errorTitle}>Session expired</h2>
              </div>
              <p className={styles.errorText}>{error.message}</p>
              <div className={styles.actionRow}>
                <Link href="/account" className={styles.button}>
                  Sign in
                </Link>
              </div>
            </>
          )}

          {error.kind === "forbidden" && (
            <>
              <div className={styles.titleRow}>
                <ShieldAlert className={styles.errorIcon} aria-hidden="true" />
                <h2 className={styles.errorTitle}>Access restricted</h2>
              </div>
              <p className={styles.errorText}>{error.message}</p>
              <div className={styles.actionRow}>
                <Link href="/dashboard" className={styles.button}>
                  Return to dashboard
                </Link>
              </div>
            </>
          )}

          {error.kind === "rate_limited" && (
            <>
              <div className={styles.titleRow}>
                <Clock className={styles.errorIcon} aria-hidden="true" />
                <h2 className={styles.errorTitle}>Rate limit exceeded</h2>
              </div>
              <p className={styles.errorText}>{error.message}</p>
              <div className={styles.actionRow}>
                <button type="button" onClick={handleRetry} className={styles.button}>
                  <RotateCcw aria-hidden="true" />
                  Retry request
                </button>
              </div>
            </>
          )}

          {error.kind !== "unauthorized" &&
            error.kind !== "forbidden" &&
            error.kind !== "rate_limited" && (
              <>
                <div className={styles.titleRow}>
                  <AlertTriangle className={styles.errorIcon} aria-hidden="true" />
                  <h2 className={styles.errorTitle}>Could not load records</h2>
                </div>
                <p className={styles.errorText}>{error.message}</p>
                <div className={styles.actionRow}>
                  <button type="button" onClick={handleRetry} className={styles.button}>
                    <RotateCcw aria-hidden="true" />
                    Retry request
                  </button>
                </div>
              </>
            )}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && records.length === 0 && (
        <div className={styles.emptyState}>
          <h2 className={styles.emptyStateTitle}>
            {statusFilter === "all" ? "No records yet" : "Zero records found"}
          </h2>
          <p className={styles.emptyStateText}>
            {statusFilter === "all"
              ? "No records yet. Add a record to begin documenting geological observations."
              : `No records currently match the "${formatRecordStatus(statusFilter)}" filter.`}
          </p>
          <div className={styles.actionRow}>
            {statusFilter === "all" ? (
              <Link href="/dashboard/records/new" className={styles.buttonPrimary}>
                <Plus size={16} aria-hidden="true" />
                <span>Add record</span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => handleFilterChange("all")}
                className={styles.button}
              >
                Clear status filter
              </button>
            )}
          </div>
        </div>
      )}

      {/* Record list */}
      {!loading && !error && records.length > 0 && (
        <ul className={styles.list} aria-label="Scientific records list">
          {records.map((record) => {
            const isClassified = record.isClassified;
            const statusLabel = formatRecordStatus(record.status);
            const badgeClass = getStatusBadgeClass(record.status);

            const isEditable =
              record.status === "draft" || record.status === "unclassified_draft";
            const editUrl = `/dashboard/records/edit?recordId=${encodeURIComponent(record.id)}`;

            return (
              <li key={record.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.itemTitle}>
                    {isEditable ? (
                      <Link href={editUrl} className={styles.itemLink}>
                        {record.title ? record.title : "Untitled record"}
                      </Link>
                    ) : (
                      <span>{record.title ? record.title : "Untitled record"}</span>
                    )}
                  </h2>
                  <div className={styles.badges}>
                    <span
                      className={`${styles.badge} ${badgeClass}`}
                      aria-label={`Status: ${statusLabel}`}
                    >
                      {statusLabel}
                    </span>
                    <span
                      className={styles.classificationBadge}
                      aria-label={`Classification: ${isClassified ? "Classified" : "Unclassified"}`}
                    >
                      {isClassified ? "Classified" : "Unclassified"}
                    </span>
                  </div>
                </div>

                <div className={styles.cardMeta}>
                  <span className={styles.metaItem}>
                    <span className={styles.metaLabel}>Updated:</span>
                    <time dateTime={record.updatedAt} className={styles.metaValue}>
                      {formatDate(record.updatedAt)}
                    </time>
                  </span>
                  {isEditable && (
                    <Link
                      href={editUrl}
                      className={styles.buttonGhost}
                      style={{ marginLeft: "auto", minHeight: "36px", padding: "0 12px" }}
                    >
                      <Edit3 size={14} aria-hidden="true" />
                      <span>
                        {record.status === "unclassified_draft"
                          ? "Classify draft"
                          : "Edit draft"}
                      </span>
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Pagination controls */}
      {!loading && !error && total > PAGE_SIZE && (
        <nav
          className={styles.paginationBar}
          aria-label="Scientific records pagination"
        >
          <span className={styles.paginationInfo}>
            Page {pagination.currentPage} of {pagination.totalPages} ({pagination.rangeText})
          </span>

          <div className={styles.paginationControls}>
            <button
              type="button"
              className={styles.button}
              onClick={() => handlePageChange(pagination.prevOffset)}
              disabled={!pagination.hasPrev}
              aria-label="Previous page of records"
            >
              Previous
            </button>
            <button
              type="button"
              className={styles.button}
              onClick={() => handlePageChange(pagination.nextOffset)}
              disabled={!pagination.hasNext}
              aria-label="Next page of records"
            >
              Next
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}
