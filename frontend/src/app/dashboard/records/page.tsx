"use client";

import { AlertTriangle, Clock, FileText, Lock, Plus, RotateCcw, Search, ShieldAlert } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import Link from "@/components/safe-link";
import { calculatePagination, formatDate, formatRecordStatus, getRecoveredOffset } from "@/components/dashboard/dashboard-list-utils";
import { RecordThumbnail } from "@/components/dashboard/record-list/record-thumbnail";
import { DashboardApiError, listDashboardRecords, type DashboardRecordItem, type ScientificRecordStatus } from "@/lib/dashboard-api";
import styles from "./page.module.css";

const PAGE_SIZE = 30;
type FilterStatus = "all" | ScientificRecordStatus;

function getStatusClass(status: ScientificRecordStatus): string {
  return styles[`status_${status}`];
}

export default function DashboardRecordsPage() {
  const [records, setRecords] = useState<DashboardRecordItem[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
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
      query: searchQuery || undefined,
      signal: controller.signal,
    })
      .then((response) => {
        if (ignore) return;
        const recoveredOffset = getRecoveredOffset(response.total, PAGE_SIZE, offset);
        if (recoveredOffset !== null) {
          setOffset(recoveredOffset);
          return;
        }
        setRecords(response.items);
        setTotal(response.total);
        setError(null);
        setLoading(false);
      })
      .catch((cause) => {
        if (ignore || (cause instanceof DashboardApiError && cause.kind === "aborted")) return;
        setError(cause instanceof DashboardApiError ? cause : new DashboardApiError("An unexpected error occurred.", 0, "server"));
        setLoading(false);
      });
    return () => {
      ignore = true;
      controller.abort();
    };
  }, [offset, statusFilter, searchQuery, retryKey]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextQuery = searchInput.trim();
    if (nextQuery.length === 1) return;
    setLoading(true);
    setOffset(0);
    setSearchQuery(nextQuery);
  }

  function clearSearch() {
    setSearchInput("");
    setSearchQuery("");
    setOffset(0);
    setLoading(true);
  }

  function changeStatus(nextStatus: FilterStatus) {
    setLoading(true);
    setStatusFilter(nextStatus);
    setOffset(0);
  }

  function retry() {
    setLoading(true);
    setError(null);
    setRetryKey((current) => current + 1);
  }

  const pagination = calculatePagination(total, PAGE_SIZE, offset);
  const hasFilters = statusFilter !== "all" || searchQuery.length > 0;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.heading}>
          <div className={styles.titleMark} aria-hidden="true"><FileText /></div>
          <div><h1>Scientific records</h1><p>Find a record and continue its work.</p></div>
        </div>
        <Link href="/dashboard/records/new" className={styles.addButton}><Plus size={18} aria-hidden="true" /> Add record</Link>
      </header>

      <section className={styles.toolbar} aria-label="Find and filter records">
        <form className={styles.searchForm} onSubmit={submitSearch}>
          <label htmlFor="record-search">Find a record</label>
          <div className={styles.searchRow}>
            <span className={styles.searchControl}><Search size={18} aria-hidden="true" /><input id="record-search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Title or category" /></span>
            <button type="submit" disabled={searchInput.trim().length === 1}>Search</button>
            {searchQuery && <button type="button" className={styles.clearButton} onClick={clearSearch}>Clear</button>}
          </div>
          {searchInput.trim().length === 1 && <span className={styles.searchHint}>Enter at least two characters.</span>}
        </form>
        <label className={styles.filterField} htmlFor="record-status-filter"><span>Show</span><select id="record-status-filter" value={statusFilter} onChange={(event) => changeStatus(event.target.value as FilterStatus)}><option value="all">All records</option><option value="unclassified_draft">Needs classification</option><option value="draft">Draft</option><option value="in_review">In review</option><option value="published">Published</option><option value="archived">Archived</option></select></label>
        <p className={styles.resultCount} aria-live="polite">{!loading && !error ? `${total} ${total === 1 ? "record" : "records"}` : ""}</p>
      </section>

      {loading && <div className={styles.loadingState} role="status"><span className={styles.loadingDot} /><span className={styles.loadingDot} /><span className={styles.loadingDot} /> Loading records…</div>}

      {!loading && error && (
        <section className={styles.errorState} role="alert">
          {error.kind === "unauthorized" ? <Lock aria-hidden="true" /> : error.kind === "forbidden" ? <ShieldAlert aria-hidden="true" /> : error.kind === "rate_limited" ? <Clock aria-hidden="true" /> : <AlertTriangle aria-hidden="true" />}
          <div><h2>{error.kind === "unauthorized" ? "Session expired" : error.kind === "forbidden" ? "Access restricted" : "Could not load records"}</h2><p>{error.message}</p></div>
          {error.kind === "unauthorized" ? <Link href="/account" className={styles.secondaryButton}>Sign in</Link> : error.kind === "forbidden" ? <Link href="/dashboard" className={styles.secondaryButton}>Return to dashboard</Link> : <button type="button" onClick={retry} className={styles.secondaryButton}><RotateCcw size={16} aria-hidden="true" /> Retry</button>}
        </section>
      )}

      {!loading && !error && records.length === 0 && (
        <section className={styles.emptyState}>
          <h2>{hasFilters ? "No matching records" : "No records yet"}</h2>
          <p>{hasFilters ? "Change the search or status filter." : "Add the first geological record when you are ready."}</p>
          {hasFilters ? <button type="button" className={styles.secondaryButton} onClick={() => { clearSearch(); changeStatus("all"); }}>Clear filters</button> : <Link href="/dashboard/records/new" className={styles.addButton}><Plus size={18} aria-hidden="true" /> Add record</Link>}
        </section>
      )}

      {!loading && !error && records.length > 0 && (
        <ul className={styles.recordList} aria-label="Scientific records">
          {records.map((record) => {
            const editable = record.status === "draft" || record.status === "unclassified_draft";
            const manageable = record.status === "in_review" || record.status === "published";
            const editUrl = `/dashboard/records/edit?recordId=${encodeURIComponent(record.id)}`;
            return (
              <li key={record.id} className={styles.recordRow}>
                <div className={styles.thumbnail}><RecordThumbnail mediaAssetId={record.primaryImageMediaAssetId} alt={record.title ? `${record.title} preview` : "Record preview"} /></div>
                <div className={styles.identity}>
                  <h2>{editable || manageable ? <Link href={editUrl}>{record.title || "Untitled record"}</Link> : record.title || "Untitled record"}</h2>
                  <p>{record.categoryName || "Not classified"}</p>
                </div>
                <div className={styles.state}><span className={`${styles.badge} ${getStatusClass(record.status)}`}>{formatRecordStatus(record.status)}</span>{!record.isClassified && <span className={styles.needsClassification}>Needs category</span>}</div>
                <time className={styles.updated} dateTime={record.updatedAt}><span>Updated</span>{formatDate(record.updatedAt)}</time>
                <div className={styles.actions}>{(editable || manageable) && <Link href={editUrl} className={styles.editButton}>{record.status === "unclassified_draft" ? "Classify" : record.status === "in_review" ? "Review" : record.status === "published" ? "Manage" : "Edit"}</Link>}</div>
              </li>
            );
          })}
        </ul>
      )}

      {!loading && !error && total > PAGE_SIZE && (
        <nav className={styles.pagination} aria-label="Records pagination"><span>Page {pagination.currentPage} of {pagination.totalPages} · {pagination.rangeText}</span><div><button type="button" onClick={() => { setLoading(true); setOffset(pagination.prevOffset); }} disabled={!pagination.hasPrev}>Previous</button><button type="button" onClick={() => { setLoading(true); setOffset(pagination.nextOffset); }} disabled={!pagination.hasNext}>Next</button></div></nav>
      )}
    </main>
  );
}
