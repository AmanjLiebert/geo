import type { ScientificRecordStatus } from "./dashboard-api";

export const RECORD_LIST_PATH = "/dashboard/records";
export const RECORD_LIST_PAGE_SIZE = 30;
export const RECORD_LIST_MAX_PAGE =
  Math.floor(100_000 / RECORD_LIST_PAGE_SIZE) + 1;
export const RECORD_CATEGORY_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const MAX_CATEGORY_SLUG_LENGTH = 120;
const MAX_QUERY_LENGTH = 120;
const MAX_RETURN_TO_LENGTH = 2048;

export const RECORD_LIST_STATUSES: readonly ScientificRecordStatus[] = [
  "unclassified_draft",
  "draft",
  "in_review",
  "published",
  "archived",
];

export type RecordListStatus = "all" | ScientificRecordStatus;
export type RecordListView = "categories" | "all_records";

export type RecordListState = {
  category: string | null;
  status: RecordListStatus;
  query: string;
  page: number;
  view: RecordListView;
};

export type RecordListFilterPatch = Partial<
  Pick<RecordListState, "category" | "status" | "query" | "view">
>;

export const defaultRecordListState: RecordListState = {
  category: null,
  status: "all",
  query: "",
  page: 1,
  view: "categories",
};

function parseCategory(value: string | null): string | null {
  if (value === null) return null;
  const trimmed = value.trim();
  if (
    trimmed.length === 0 ||
    trimmed.length > MAX_CATEGORY_SLUG_LENGTH ||
    !RECORD_CATEGORY_SLUG_PATTERN.test(trimmed)
  ) {
    return null;
  }
  return trimmed;
}

function parseStatus(value: string | null): RecordListStatus {
  return value !== null &&
    (RECORD_LIST_STATUSES as readonly string[]).includes(value)
    ? (value as ScientificRecordStatus)
    : "all";
}

function parseQuery(value: string | null): string {
  if (value === null) return "";
  const trimmed = value.trim();
  if (trimmed.length < 2 || trimmed.length > MAX_QUERY_LENGTH) return "";
  return trimmed;
}

function parsePage(value: string | null): number {
  if (value === null || !/^\d+$/.test(value.trim())) return 1;
  const parsed = Number(value.trim());
  if (!Number.isSafeInteger(parsed) || parsed < 1) return 1;
  return Math.min(parsed, RECORD_LIST_MAX_PAGE);
}

function parseView(value: string | null): RecordListView {
  return value === "all" ? "all_records" : "categories";
}

export function parseRecordListState(params: URLSearchParams): RecordListState {
  return {
    category: parseCategory(params.get("category")),
    status: parseStatus(params.get("status")),
    query: parseQuery(params.get("query")),
    page: parsePage(params.get("page")),
    view: parseView(params.get("view")),
  };
}

export function buildRecordListHref(state: RecordListState): string {
  const params = new URLSearchParams();
  if (state.category) params.set("category", state.category);
  if (state.status !== "all") params.set("status", state.status);
  const query = state.query.trim();
  if (query) params.set("query", query);
  if (state.page > 1) params.set("page", String(state.page));
  if (state.view === "all_records") params.set("view", "all");
  const queryString = params.toString();
  return queryString ? `${RECORD_LIST_PATH}?${queryString}` : RECORD_LIST_PATH;
}

/**
 * Applies a filter change and always resets pagination to the first page.
 * `undefined` leaves a value unchanged; `null` clears the category.
 */
export function applyRecordListFilter(
  state: RecordListState,
  patch: RecordListFilterPatch,
): RecordListState {
  return {
    category: patch.category !== undefined ? patch.category : state.category,
    status: patch.status ?? state.status,
    query: patch.query !== undefined ? patch.query : state.query,
    page: 1,
    view: patch.view ?? state.view,
  };
}

export function withRecordListPage(
  state: RecordListState,
  page: number,
): RecordListState {
  const safePage = Number.isSafeInteger(page) ? page : 1;
  return {
    ...state,
    page: Math.min(Math.max(safePage, 1), RECORD_LIST_MAX_PAGE),
  };
}

/**
 * Accepts only a known internal `/dashboard/records` destination and rebuilds
 * it from the five supported parameters. External URLs, other paths,
 * fragment-bearing values, and unknown parameters are rejected or dropped.
 */
export function sanitizeRecordsReturnTo(
  value: string | null | undefined,
): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_RETURN_TO_LENGTH)
    return null;
  if (trimmed.includes("#") || trimmed.includes("\\")) return null;
  if (!trimmed.startsWith(RECORD_LIST_PATH)) return null;

  const questionIndex = trimmed.indexOf("?");
  const path = questionIndex === -1 ? trimmed : trimmed.slice(0, questionIndex);
  if (path !== RECORD_LIST_PATH) return null;

  const queryString =
    questionIndex === -1 ? "" : trimmed.slice(questionIndex + 1);
  return buildRecordListHref(
    parseRecordListState(new URLSearchParams(queryString)),
  );
}

export function buildRecordEditHref(
  recordId: string,
  returnTo?: string | null,
): string {
  const params = new URLSearchParams({ recordId });
  if (returnTo) params.set("returnTo", returnTo);
  return `${RECORD_LIST_PATH}/edit?${params.toString()}`;
}

export function buildNewRecordHref(returnTo?: string | null): string {
  const params = new URLSearchParams();
  if (returnTo) params.set("returnTo", returnTo);
  const queryString = params.toString();
  return queryString
    ? `${RECORD_LIST_PATH}/new?${queryString}`
    : `${RECORD_LIST_PATH}/new`;
}

export function buildRecordsSignInHref(returnTo?: string | null): string {
  const params = new URLSearchParams();
  if (returnTo) params.set("returnTo", returnTo);
  const queryString = params.toString();
  return queryString ? `/account?${queryString}` : "/account";
}

export function buildRecordListSummary(
  total: number,
  state: Pick<RecordListState, "category" | "status" | "query">,
  categoryName: string | null,
  statusLabel: string,
): string {
  const recordsLabel = `${total} ${total === 1 ? "record" : "records"}`;
  const context = state.category
    ? ` in ${categoryName ?? "the selected category"}`
    : "";
  const filters: string[] = [];
  if (state.status !== "all") filters.push(statusLabel);
  if (state.query) filters.push(`matching “${state.query}”`);
  return `${recordsLabel}${context}${
    filters.length > 0 ? ` · ${filters.join(" · ")}` : ""
  }`;
}
