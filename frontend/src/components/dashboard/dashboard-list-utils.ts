import type {
  EditorialStatus,
  ResearchStatus,
  ScientificRecordStatus,
} from "@/lib/dashboard-api";

export function formatRecordStatus(status: ScientificRecordStatus): string {
  switch (status) {
    case "unclassified_draft":
      return "Unclassified draft";
    case "draft":
      return "Draft";
    case "in_review":
      return "In review";
    case "published":
      return "Published";
    case "archived":
      return "Archived";
  }
}

export function getRecordPrimaryActionLabel(status: ScientificRecordStatus): string {
  switch (status) {
    case "unclassified_draft":
      return "Classify";
    case "draft":
      return "Edit";
    case "in_review":
      return "Review";
    case "published":
      return "Manage";
    case "archived":
      return "View";
  }
}

export function formatResearchStatus(status: ResearchStatus): string {
  switch (status) {
    case "draft":
      return "Draft";
    case "in_review":
      return "In review";
    case "published":
      return "Published";
    case "archived":
      return "Archived";
  }
}

export function formatEditorialStatus(status: EditorialStatus): string {
  switch (status) {
    case "draft":
      return "Draft";
    case "in_review":
      return "In review";
    case "published":
      return "Published";
    case "archived":
      return "Archived";
  }
}

export function formatPageType(pageType: string): string {
  const map: Record<string, string> = {
    about: "About",
    mission: "Mission",
    ownership: "Ownership",
    contact: "Contact",
    privacy: "Privacy",
    terms: "Terms",
  };
  const key = pageType.trim().toLowerCase();
  if (map[key]) return map[key];
  if (!pageType.trim()) return "Page";
  return pageType
    .trim()
    .split(/[_-]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function formatDate(isoString: string | null | undefined): string {
  if (!isoString) return "—";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export type PaginationInfo = {
  currentPage: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
  prevOffset: number;
  nextOffset: number;
  rangeText: string;
};

export function calculatePagination(total: number, limit: number, offset: number): PaginationInfo {
  const safeLimit = Math.max(1, limit);
  const safeOffset = Math.max(0, offset);
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));
  const currentPage = Math.min(Math.floor(safeOffset / safeLimit) + 1, totalPages);
  const hasPrev = safeOffset > 0;
  const hasNext = safeOffset + safeLimit < total;
  const prevOffset = Math.max(0, safeOffset - safeLimit);
  const nextOffset = safeOffset + safeLimit;

  let rangeText = "0 of 0";
  if (total > 0) {
    const start = safeOffset + 1;
    const end = Math.min(safeOffset + safeLimit, total);
    rangeText = `${start}–${end} of ${total}`;
  }

  return {
    currentPage,
    totalPages,
    hasPrev,
    hasNext,
    prevOffset,
    nextOffset,
    rangeText,
  };
}

/**
 * Calculates a recovered offset if the current offset is invalid for the returned total.
 * - If currentOffset < 0: returns 0.
 * - If total === 0 and currentOffset > 0: returns 0.
 * - If total > 0 and currentOffset >= total: returns the offset of the last valid page.
 * - Otherwise (offset is valid): returns null.
 */
export function getRecoveredOffset(
  total: number,
  limit: number,
  currentOffset: number,
): number | null {
  const safeLimit = Math.max(1, limit);

  if (currentOffset < 0) {
    return 0;
  }

  if (total <= 0) {
    return currentOffset > 0 ? 0 : null;
  }

  if (currentOffset >= total) {
    return Math.floor((total - 1) / safeLimit) * safeLimit;
  }

  return null;
}
