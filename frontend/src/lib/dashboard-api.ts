/**
 * dashboard-api.ts
 *
 * Typed frontend API module for the protected Geo-Kurdistan dashboard.
 *
 * Requirements:
 * - Uses NEXT_PUBLIC_API_BASE_URL.
 * - credentials: "include" on every request.
 * - cache: "no-store" on every request.
 * - Supports request cancellation with AbortSignal.
 * - Safely categorizes 401, 403, 429, and other error statuses.
 * - Never leaks tokens, cookies, SQL, database internals, Firebase details, or stack traces.
 * - Does not use localStorage or sessionStorage.
 */

export type ScientificRecordStatus =
  | "unclassified_draft"
  | "draft"
  | "in_review"
  | "published"
  | "archived";

export type DashboardRecordItem = {
  id: string;
  stableId: string;
  slug: string | null;
  status: ScientificRecordStatus;
  categoryId: string | null;
  recordTypeId: string | null;
  templateVersionId: string | null;
  title: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DashboardRecordListResponse = {
  items: DashboardRecordItem[];
  total: number;
  limit: number;
  offset: number;
};

export type ResearchStatus = "draft" | "in_review" | "published" | "archived";

export type DashboardResearchItem = {
  id: string;
  stableId: string;
  slug: string | null;
  status: ResearchStatus;
  publicationYear: number | null;
  doi: string | null;
  rightsStatement: string | null;
  ownerUserId: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  title: string | null;
};

export type DashboardResearchListResponse = {
  items: DashboardResearchItem[];
  total: number;
  limit: number;
  offset: number;
};

export type DashboardApiErrorKind =
  | "unauthorized"
  | "forbidden"
  | "rate_limited"
  | "aborted"
  | "network"
  | "server";

export class DashboardApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly kind: DashboardApiErrorKind,
  ) {
    super(message);
    this.name = "DashboardApiError";
  }
}

export type ListRecordsOptions = {
  limit?: number;
  offset?: number;
  status?: ScientificRecordStatus;
  signal?: AbortSignal;
};

export type ListResearchOptions = {
  limit?: number;
  offset?: number;
  status?: ResearchStatus;
  signal?: AbortSignal;
};

const apiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "");

export function buildDashboardUrl(
  path: string,
  params: Record<string, string | number | undefined>,
): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      query.set(key, String(value));
    }
  }
  const queryString = query.toString();
  const fullPath = `${apiBaseUrl}${path}`;
  return queryString ? `${fullPath}?${queryString}` : fullPath;
}

function classifyError(status: number): { kind: DashboardApiErrorKind; message: string } {
  if (status === 401) {
    return {
      kind: "unauthorized",
      message: "Your session has expired or you are not signed in. Please sign in to continue.",
    };
  }
  if (status === 403) {
    return {
      kind: "forbidden",
      message: "You do not have permission to access this scientific resource.",
    };
  }
  if (status === 429) {
    return {
      kind: "rate_limited",
      message: "Too many requests were sent in a short time. Please wait a moment and try again.",
    };
  }
  if (status >= 500) {
    return {
      kind: "server",
      message: "The scientific server could not complete this request. Please try again.",
    };
  }
  return {
    kind: "server",
    message: "The scientific request could not be completed. Please try again.",
  };
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const { kind, message } = classifyError(response.status);
    throw new DashboardApiError(message, response.status, kind);
  }
  try {
    return (await response.json()) as T;
  } catch {
    throw new DashboardApiError(
      "The scientific server returned an unparseable response.",
      response.status,
      "server",
    );
  }
}

/**
 * Lists scientific records with pagination and optional status filter.
 */
export async function listDashboardRecords(
  options: ListRecordsOptions = {},
): Promise<DashboardRecordListResponse> {
  const url = buildDashboardUrl("/api/v1/records", {
    limit: options.limit,
    offset: options.offset,
    status: options.status,
  });

  try {
    const response = await fetch(url, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      signal: options.signal,
      headers: {
        Accept: "application/json",
      },
    });
    return await handleResponse<DashboardRecordListResponse>(response);
  } catch (error) {
    if (error instanceof DashboardApiError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new DashboardApiError("Request was cancelled.", 0, "aborted");
    }
    throw new DashboardApiError(
      "Unable to connect to the scientific service. Please check your network connection.",
      0,
      "network",
    );
  }
}

/**
 * Lists managed research publications with pagination and optional status filter.
 */
export async function listDashboardResearch(
  options: ListResearchOptions = {},
): Promise<DashboardResearchListResponse> {
  const url = buildDashboardUrl("/api/v1/research", {
    limit: options.limit,
    offset: options.offset,
    status: options.status,
  });

  try {
    const response = await fetch(url, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      signal: options.signal,
      headers: {
        Accept: "application/json",
      },
    });
    return await handleResponse<DashboardResearchListResponse>(response);
  } catch (error) {
    if (error instanceof DashboardApiError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new DashboardApiError("Request was cancelled.", 0, "aborted");
    }
    throw new DashboardApiError(
      "Unable to connect to the scientific service. Please check your network connection.",
      0,
      "network",
    );
  }
}
