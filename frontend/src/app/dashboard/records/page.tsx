"use client";

import {
  AlertTriangle,
  Clock,
  FileText,
  Lock,
  Plus,
  RotateCcw,
  Search,
  ShieldAlert,
} from "lucide-react";
import {
  FormEvent,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "@/components/safe-link";
import {
  calculatePagination,
  formatDate,
  formatRecordStatus,
  getRecordPrimaryActionLabel,
  getRecoveredOffset,
} from "@/components/dashboard/dashboard-list-utils";
import { RecordCategoryNav } from "@/components/dashboard/record-list/record-category-nav";
import { RecordThumbnail } from "@/components/dashboard/record-list/record-thumbnail";
import {
  DashboardApiError,
  listDashboardRecords,
  listStructureCategories,
  type DashboardRecordItem,
  type ScientificRecordStatus,
  type StructureCategory,
} from "@/lib/dashboard-api";
import {
  applyRecordListFilter,
  buildNewRecordHref,
  buildRecordEditHref,
  buildRecordListHref,
  buildRecordListSummary,
  buildRecordsSignInHref,
  defaultRecordListState,
  parseRecordListState,
  RECORD_LIST_PAGE_SIZE,
  withRecordListPage,
  type RecordListState,
  type RecordListStatus,
} from "@/lib/record-list-state";
import styles from "./page.module.css";

const STATUS_OPTIONS: ReadonlyArray<{
  value: RecordListStatus;
  label: string;
}> = [
  { value: "all", label: "All" },
  { value: "unclassified_draft", label: "Needs classification" },
  { value: "draft", label: "Draft" },
  { value: "in_review", label: "In review" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
];

function getStatusClass(status: ScientificRecordStatus): string {
  return styles[`status_${status}`];
}

function RecordsLoading({ label }: { label: string }) {
  return (
    <div className={styles.loadingState} role="status" aria-live="polite">
      <span className={styles.loadingDot} />
      <span className={styles.loadingDot} />
      <span className={styles.loadingDot} />
      <span>{label}</span>
    </div>
  );
}

function RecordsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const state = useMemo(
    () => parseRecordListState(searchParams),
    [searchParams],
  );
  const { category, status, query, page, view } = state;
  const listHref = useMemo(() => buildRecordListHref(state), [state]);
  const offset = (state.page - 1) * RECORD_LIST_PAGE_SIZE;
  const showRecords =
    view === "all_records" ||
    category !== null ||
    status !== "all" ||
    query.length > 0;

  const [records, setRecords] = useState<DashboardRecordItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<DashboardApiError | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchLength, setSearchLength] = useState(state.query.trim().length);

  const [categories, setCategories] = useState<StructureCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState(false);
  const [categoryRetryKey, setCategoryRetryKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();
    listStructureCategories("en", controller.signal)
      .then((response) => {
        if (ignore) return;
        setCategories(response.items);
        setCategoriesLoading(false);
      })
      .catch((cause) => {
        if (
          ignore ||
          (cause instanceof DashboardApiError && cause.kind === "aborted")
        ) {
          return;
        }
        setCategoriesError(true);
        setCategoriesLoading(false);
      });
    return () => {
      ignore = true;
      controller.abort();
    };
  }, [categoryRetryKey]);

  useEffect(() => {
    if (!showRecords) {
      return;
    }
    let ignore = false;
    const controller = new AbortController();
    const requestOffset = (page - 1) * RECORD_LIST_PAGE_SIZE;
    listDashboardRecords({
      limit: RECORD_LIST_PAGE_SIZE,
      offset: requestOffset,
      status: status === "all" ? undefined : status,
      query: query || undefined,
      category: category ?? undefined,
      signal: controller.signal,
    })
      .then((response) => {
        if (ignore) return;
        const recoveredOffset = getRecoveredOffset(
          response.total,
          RECORD_LIST_PAGE_SIZE,
          requestOffset,
        );
        if (recoveredOffset !== null) {
          const recoveredPage =
            Math.floor(recoveredOffset / RECORD_LIST_PAGE_SIZE) + 1;
          router.replace(
            buildRecordListHref(
              withRecordListPage(
                { category, status, query, page, view },
                recoveredPage,
              ),
            ),
          );
          return;
        }
        setRecords(response.items);
        setTotal(response.total);
        setError(null);
        setLoading(false);
      })
      .catch((cause) => {
        if (
          ignore ||
          (cause instanceof DashboardApiError && cause.kind === "aborted")
        ) {
          return;
        }
        setError(
          cause instanceof DashboardApiError
            ? cause
            : new DashboardApiError(
                "An unexpected error occurred.",
                0,
                "server",
              ),
        );
        setLoading(false);
      });
    return () => {
      ignore = true;
      controller.abort();
    };
  }, [router, category, status, query, page, view, showRecords, retryKey]);

  function navigate(nextState: RecordListState) {
    const href = buildRecordListHref(nextState);
    if (href === listHref) return;
    setLoading(true);
    setError(null);
    router.push(href);
  }

  function changeCategory(slug: string | null) {
    navigate(
      applyRecordListFilter(state, {
        category: slug,
        view: "categories",
      }),
    );
  }

  function showAllRecords() {
    navigate(
      applyRecordListFilter(state, {
        category: null,
        view: "all_records",
      }),
    );
  }

  function changeStatus(status: RecordListStatus) {
    navigate(applyRecordListFilter(state, { status }));
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextQuery = (searchInputRef.current?.value ?? "").trim();
    if (nextQuery.length === 1) return;
    navigate(applyRecordListFilter(state, { query: nextQuery }));
  }

  function clearSearch() {
    if (searchInputRef.current) searchInputRef.current.value = "";
    setSearchLength(0);
    navigate(applyRecordListFilter(state, { query: "" }));
  }

  function clearFilters() {
    if (searchInputRef.current) searchInputRef.current.value = "";
    setSearchLength(0);
    navigate(defaultRecordListState);
  }

  function retryCategories() {
    setCategoriesLoading(true);
    setCategoriesError(false);
    setCategoryRetryKey((current) => current + 1);
  }

  function retry() {
    setLoading(true);
    setError(null);
    setRetryKey((current) => current + 1);
  }

  const pagination = calculatePagination(total, RECORD_LIST_PAGE_SIZE, offset);
  const hasContentFilters =
    state.category !== null ||
    state.status !== "all" ||
    state.query.length > 0;
  const hasFilters = state.view === "all_records" || hasContentFilters;
  const selectedCategoryName = state.category
    ? (categories.find((category) => category.slug === state.category)?.name ??
      null)
    : null;
  const statusLabel =
    STATUS_OPTIONS.find((option) => option.value === state.status)?.label ??
    "All";
  const summary = buildRecordListSummary(
    total,
    state,
    selectedCategoryName,
    statusLabel,
  );

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.heading}>
          <div className={styles.titleMark} aria-hidden="true">
            <FileText />
          </div>
          <div>
            <h1>Scientific records</h1>
            <p>Browse by category, then find the record you need.</p>
          </div>
        </div>
        <Link href={buildNewRecordHref(listHref)} className={styles.addButton}>
          <Plus size={18} aria-hidden="true" /> Add record
        </Link>
      </header>

      <div className={styles.layout}>
        <section className={styles.categoryStage}>
          <RecordCategoryNav
            items={categories}
            selectedSlug={state.category}
            onSelect={changeCategory}
            onShowAll={showAllRecords}
            loading={categoriesLoading}
            error={categoriesError}
            onRetry={retryCategories}
          />
        </section>

        <div className={styles.results}>
          <section
            className={styles.toolbar}
            aria-label="Search and filter records"
          >
            <form className={styles.searchForm} onSubmit={submitSearch}>
              <label htmlFor="record-search">Search records</label>
              <div className={styles.searchRow}>
                <span className={styles.searchControl}>
                  <Search size={18} aria-hidden="true" />
                  <input
                    key={state.query}
                    id="record-search"
                    ref={searchInputRef}
                    defaultValue={state.query}
                    onChange={(event) =>
                      setSearchLength(event.target.value.trim().length)
                    }
                    placeholder="Title or category"
                  />
                </span>
                <button type="submit" disabled={searchLength === 1}>
                  Search
                </button>
                {state.query && (
                  <button
                    type="button"
                    className={styles.clearButton}
                    onClick={clearSearch}
                  >
                    Clear search
                  </button>
                )}
              </div>
              {searchLength === 1 && (
                <span className={styles.searchHint}>
                  Enter at least two characters.
                </span>
              )}
            </form>

            <div className={styles.statusFilter}>
              <span id="record-status-label" className={styles.filterLabel}>
                Status
              </span>
              <div
                className={styles.statusChips}
                role="group"
                aria-labelledby="record-status-label"
              >
                {STATUS_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={
                      state.status === option.value
                        ? `${styles.statusChip} ${styles.statusChipActive}`
                        : styles.statusChip
                    }
                    aria-pressed={state.status === option.value}
                    onClick={() => changeStatus(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.resultBar}>
              <p
                className={styles.resultCount}
                role="status"
                aria-live="polite"
              >
                {!showRecords
                  ? "Choose a category, search, or select a status to see records."
                  : loading
                    ? "Loading records…"
                    : error
                      ? ""
                      : summary}
              </p>
              {hasFilters && (
                <button
                  type="button"
                  className={styles.clearFilters}
                  onClick={clearFilters}
                >
                  {state.view === "all_records" &&
                  state.category === null &&
                  state.status === "all" &&
                  state.query.length === 0
                    ? "Back to categories"
                    : "Clear filters"}
                </button>
              )}
            </div>
          </section>

          {showRecords && loading && (
            <RecordsLoading label="Loading records…" />
          )}

          {showRecords && !loading && error && (
            <section className={styles.errorState} role="alert">
              {error.kind === "unauthorized" ? (
                <Lock aria-hidden="true" />
              ) : error.kind === "forbidden" ? (
                <ShieldAlert aria-hidden="true" />
              ) : error.kind === "rate_limited" ? (
                <Clock aria-hidden="true" />
              ) : (
                <AlertTriangle aria-hidden="true" />
              )}
              <div>
                <h2>
                  {error.kind === "unauthorized"
                    ? "Session expired"
                    : error.kind === "forbidden"
                      ? "Access restricted"
                      : "Could not load records"}
                </h2>
                <p>{error.message}</p>
              </div>
              {error.kind === "unauthorized" ? (
                <Link
                  href={buildRecordsSignInHref(listHref)}
                  className={styles.secondaryButton}
                >
                  Sign in
                </Link>
              ) : error.kind === "forbidden" ? (
                <Link href="/dashboard" className={styles.secondaryButton}>
                  Return to dashboard
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={retry}
                  className={styles.secondaryButton}
                >
                  <RotateCcw size={16} aria-hidden="true" /> Retry
                </button>
              )}
            </section>
          )}

          {showRecords && !loading && !error && records.length === 0 && (
            <section className={styles.emptyState}>
              <h2>
                {hasContentFilters ? "No matching records" : "No records yet"}
              </h2>
              <p>
                {hasContentFilters
                  ? "Try another category, status, or search."
                  : "Add the first geological record when you are ready."}
              </p>
              {hasContentFilters ? (
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={clearFilters}
                >
                  Clear filters
                </button>
              ) : (
                <Link
                  href={buildNewRecordHref(listHref)}
                  className={styles.addButton}
                >
                  <Plus size={18} aria-hidden="true" /> Add record
                </Link>
              )}
            </section>
          )}

          {showRecords && !loading && !error && records.length > 0 && (
            <ul className={styles.recordList} aria-label="Scientific records">
              {records.map((record) => {
                const editUrl = buildRecordEditHref(record.id, listHref);
                return (
                  <li key={record.id} className={styles.recordRow}>
                    <div className={styles.thumbnail}>
                      <RecordThumbnail
                        mediaAssetId={record.primaryImageMediaAssetId}
                        alt={
                          record.title
                            ? `${record.title} preview`
                            : "Record preview"
                        }
                      />
                    </div>
                    <div className={styles.identity}>
                      <h2>
                        <Link href={editUrl}>
                          {record.title || "Untitled record"}
                        </Link>
                      </h2>
                      <p>{record.categoryName || "Not classified"}</p>
                    </div>
                    <div className={styles.state}>
                      <span
                        className={`${styles.badge} ${getStatusClass(record.status)}`}
                      >
                        {formatRecordStatus(record.status)}
                      </span>
                      {!record.isClassified && (
                        <span className={styles.needsClassification}>
                          Needs category
                        </span>
                      )}
                    </div>
                    <time
                      className={styles.updated}
                      dateTime={record.updatedAt}
                    >
                      <span>Updated</span>
                      {formatDate(record.updatedAt)}
                    </time>
                    <div className={styles.actions}>
                      <Link href={editUrl} className={styles.editButton}>
                        {getRecordPrimaryActionLabel(record.status)}
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {showRecords &&
            !loading &&
            !error &&
            total > RECORD_LIST_PAGE_SIZE && (
              <nav
                className={styles.pagination}
                aria-label="Records pagination"
              >
                <span>
                  Page {pagination.currentPage} of {pagination.totalPages} ·{" "}
                  {pagination.rangeText}
                </span>
                <div>
                  <button
                    type="button"
                    onClick={() =>
                      navigate(withRecordListPage(state, state.page - 1))
                    }
                    disabled={!pagination.hasPrev}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      navigate(withRecordListPage(state, state.page + 1))
                    }
                    disabled={!pagination.hasNext}
                  >
                    Next
                  </button>
                </div>
              </nav>
            )}
        </div>
      </div>
    </main>
  );
}

export default function DashboardRecordsPage() {
  return (
    <Suspense
      fallback={
        <main className={styles.page}>
          <RecordsLoading label="Loading records…" />
        </main>
      }
    >
      <RecordsContent />
    </Suspense>
  );
}
