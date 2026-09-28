"use client";

import { useEffect, useState } from "react";
import Link from "@/components/safe-link";
import { BookOpen, RotateCcw, AlertTriangle, Lock, ShieldAlert, Clock } from "lucide-react";
import {
  listDashboardResearch,
  DashboardApiError,
  type DashboardResearchItem,
  type ResearchStatus,
} from "@/lib/dashboard-api";
import {
  calculatePagination,
  formatDate,
  formatResearchStatus,
} from "@/components/dashboard/dashboard-list-utils";
import styles from "@/components/dashboard/dashboard-list.module.css";

const PAGE_SIZE = 20;

type FilterStatus = "all" | ResearchStatus;

function getStatusBadgeClass(status: ResearchStatus): string {
  switch (status) {
    case "published":
      return styles.statusPublished;
    case "in_review":
      return styles.statusInReview;
    case "draft":
      return styles.statusDraft;
    case "archived":
      return styles.statusArchived;
  }
}

export default function DashboardResearchPage() {
  const [research, setResearch] = useState<DashboardResearchItem[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<DashboardApiError | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();

    listDashboardResearch({
      limit: PAGE_SIZE,
      offset,
      status: statusFilter === "all" ? undefined : statusFilter,
      signal: controller.signal,
    })
      .then((res) => {
        if (!ignore) {
          setResearch(res.items);
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
        <div className={styles.titleRow}>
          <div className={styles.titleMark} aria-hidden="true">
            <BookOpen />
          </div>
          <h1 className={styles.title}>Research publications</h1>
        </div>
        <p className={styles.subtitle}>
          Browse and manage referenced academic papers, reports, and geological literature.
          Publications provide scientific provenance for records in the archive.
        </p>
      </header>

      {/* Filter and count bar */}
      <section className={styles.filterBar} aria-label="Research filtering and summary">
        <div className={styles.filterControls}>
          <div className={styles.filterGroup}>
            <label htmlFor="research-status-filter" className={styles.filterLabel}>
              Status
            </label>
            <select
              id="research-status-filter"
              className={styles.select}
              value={statusFilter}
              onChange={(e) => handleFilterChange(e.target.value as FilterStatus)}
              aria-label="Filter publications by status"
            >
              <option value="all">All statuses</option>
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
              {total} {total === 1 ? "publication" : "publications"} total
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
          <span>Loading research publications…</span>
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
                  <h2 className={styles.errorTitle}>Could not load publications</h2>
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
      {!loading && !error && research.length === 0 && (
        <div className={styles.emptyState}>
          <h2 className={styles.emptyStateTitle}>Zero publications found</h2>
          <p className={styles.emptyStateText}>
            {statusFilter === "all"
              ? "The research library contains zero managed publications. Teachers will catalogue scientific literature as references are introduced."
              : `No research publications currently match the "${formatResearchStatus(statusFilter)}" filter.`}
          </p>
          {statusFilter !== "all" && (
            <div className={styles.actionRow}>
              <button
                type="button"
                onClick={() => handleFilterChange("all")}
                className={styles.button}
              >
                Clear status filter
              </button>
            </div>
          )}
        </div>
      )}

      {/* Research list */}
      {!loading && !error && research.length > 0 && (
        <ul className={styles.list} aria-label="Research publications list">
          {research.map((item) => {
            const statusLabel = formatResearchStatus(item.status);
            const badgeClass = getStatusBadgeClass(item.status);

            return (
              <li key={item.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.itemTitle}>
                    {item.title ? item.title : "Untitled research publication"}
                  </h2>
                  <div className={styles.badges}>
                    <span
                      className={`${styles.badge} ${badgeClass}`}
                      aria-label={`Status: ${statusLabel}`}
                    >
                      {statusLabel}
                    </span>
                  </div>
                </div>

                <div className={styles.cardMeta}>
                  {item.publicationYear !== null && (
                    <span className={styles.metaItem}>
                      <span className={styles.metaLabel}>Year:</span>
                      <span>{item.publicationYear}</span>
                    </span>
                  )}
                  {item.doi && (
                    <span className={styles.metaItem}>
                      <span className={styles.metaLabel}>DOI:</span>
                      <span>{item.doi}</span>
                    </span>
                  )}
                  <span className={styles.metaItem}>
                    <span className={styles.metaLabel}>Updated:</span>
                    <time dateTime={item.updatedAt}>{formatDate(item.updatedAt)}</time>
                  </span>
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
          aria-label="Research publications pagination"
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
              aria-label="Previous page of publications"
            >
              Previous
            </button>
            <button
              type="button"
              className={styles.button}
              onClick={() => handlePageChange(pagination.nextOffset)}
              disabled={!pagination.hasNext}
              aria-label="Next page of publications"
            >
              Next
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}
