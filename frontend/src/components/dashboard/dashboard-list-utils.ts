import type { ResearchStatus, ScientificRecordStatus } from "@/lib/dashboard-api";

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
