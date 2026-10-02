"use client";

import { useEffect, useState } from "react";
import Link from "@/components/safe-link";
import { Newspaper, RotateCcw, AlertTriangle, Lock, ShieldAlert, Clock } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import {
  listDashboardNews,
  DashboardApiError,
  type DashboardNewsItem,
  type EditorialStatus,
} from "@/lib/dashboard-api";
import {
  calculatePagination,
  formatDate,
  formatEditorialStatus,
  getRecoveredOffset,
} from "@/components/dashboard/dashboard-list-utils";
import styles from "@/components/dashboard/dashboard-list.module.css";

const PAGE_SIZE = 20;

type FilterStatus = "all" | EditorialStatus;

function getStatusBadgeClass(status: EditorialStatus): string {
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

export default function DashboardNewsPage() {
  const { user, loading: authLoading } = useAuth();
  const role = user?.role ?? "visitor";
  const [news, setNews] = useState<DashboardNewsItem[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<DashboardApiError | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (authLoading || role !== "admin") return;

    let ignore = false;
    const controller = new AbortController();

    listDashboardNews({
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
          setNews(res.items);
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
  }, [offset, statusFilter, retryKey, role, authLoading]);

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

  if (authLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState} role="status" aria-live="polite">
          <div className={styles.loadingDot} aria-hidden="true" />
          <div className={styles.loadingDot} aria-hidden="true" />
          <div className={styles.loadingDot} aria-hidden="true" />
          <span>Loading…</span>
        </div>
      </div>
    );
  }

  if (role !== "admin") {
    return (
      <div className={styles.container}>
        <div className={styles.errorState} role="alert">
          <div className={styles.titleRow}>
            <ShieldAlert className={styles.errorIcon} aria-hidden="true" />
            <h2 className={styles.errorTitle}>Access restricted</h2>
          </div>
          <p className={styles.errorText}>You do not have access to this area.</p>
          <div className={styles.actionRow}>
            <Link href="/dashboard" className={styles.button}>
              Return to dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const pagination = calculatePagination(total, PAGE_SIZE, offset);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <div className={styles.titleMark} aria-hidden="true">
            <Newspaper />
          </div>
          <h1 className={styles.title}>News articles</h1>
        </div>
        <p className={styles.subtitle}>
          Browse and filter geological news articles, field discoveries, and institutional announcements.
        </p>
      </header>

      {/* Filter and count bar */}
      <section className={styles.filterBar} aria-label="News filtering and summary">
        <div className={styles.filterControls}>
          <div className={styles.filterGroup}>
            <label htmlFor="news-status-filter" className={styles.filterLabel}>
              Status
            </label>
            <select
              id="news-status-filter"
              className={styles.select}
              value={statusFilter}
              onChange={(e) => handleFilterChange(e.target.value as FilterStatus)}
              aria-label="Filter news by status"
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
              {total} {total === 1 ? "article" : "articles"} total
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
          <span>Loading news articles…</span>
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
                  <h2 className={styles.errorTitle}>Could not load news articles</h2>
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
      {!loading && !error && news.length === 0 && (
        <div className={styles.emptyState}>
          <h2 className={styles.emptyStateTitle}>
            {statusFilter === "all" ? "No news articles yet" : "Zero news articles found"}
          </h2>
          <p className={styles.emptyStateText}>
            {statusFilter === "all"
              ? "No news articles yet. Articles will appear here once they are added."
              : `No articles currently match the "${formatEditorialStatus(statusFilter)}" filter.`}
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

      {/* News list */}
      {!loading && !error && news.length > 0 && (
        <ul className={styles.list} aria-label="News articles list">
          {news.map((item) => {
            const statusLabel = formatEditorialStatus(item.status);
            const badgeClass = getStatusBadgeClass(item.status);

            return (
              <li key={item.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.itemTitle}>
                    {item.title ? item.title : "Untitled article"}
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
                  {item.slug && (
                    <span className={styles.metaItem}>
                      <span className={styles.metaLabel}>Slug:</span>
                      <span className={styles.metaValue}>{item.slug}</span>
                    </span>
                  )}
                  {item.publishedAt && (
                    <span className={styles.metaItem}>
                      <span className={styles.metaLabel}>Published:</span>
                      <time dateTime={item.publishedAt} className={styles.metaValue}>
                        {formatDate(item.publishedAt)}
                      </time>
                    </span>
                  )}
                  <span className={styles.metaItem}>
                    <span className={styles.metaLabel}>Updated:</span>
                    <time dateTime={item.updatedAt} className={styles.metaValue}>
                      {formatDate(item.updatedAt)}
                    </time>
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Pagination controls */}
      {!loading && !error && total > PAGE_SIZE && (
        <nav className={styles.paginationBar} aria-label="News articles pagination">
          <span className={styles.paginationInfo}>
            Page {pagination.currentPage} of {pagination.totalPages} ({pagination.rangeText})
          </span>

          <div className={styles.paginationControls}>
            <button
              type="button"
              className={styles.button}
              onClick={() => handlePageChange(pagination.prevOffset)}
              disabled={!pagination.hasPrev}
              aria-label="Previous page of news articles"
            >
              Previous
            </button>
            <button
              type="button"
              className={styles.button}
              onClick={() => handlePageChange(pagination.nextOffset)}
              disabled={!pagination.hasNext}
              aria-label="Next page of news articles"
            >
              Next
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}
