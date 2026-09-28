import { describe, expect, it } from "vitest";
import {
  calculatePagination,
  formatDate,
  formatRecordStatus,
  formatResearchStatus,
  getRecoveredOffset,
} from "./dashboard-list-utils";

describe("dashboard-list-utils", () => {
  describe("formatRecordStatus", () => {
    it("formats all record statuses in plain language", () => {
      expect(formatRecordStatus("unclassified_draft")).toBe("Unclassified draft");
      expect(formatRecordStatus("draft")).toBe("Draft");
      expect(formatRecordStatus("in_review")).toBe("In review");
      expect(formatRecordStatus("published")).toBe("Published");
      expect(formatRecordStatus("archived")).toBe("Archived");
    });
  });

  describe("formatResearchStatus", () => {
    it("formats all research statuses in plain language", () => {
      expect(formatResearchStatus("draft")).toBe("Draft");
      expect(formatResearchStatus("in_review")).toBe("In review");
      expect(formatResearchStatus("published")).toBe("Published");
      expect(formatResearchStatus("archived")).toBe("Archived");
    });
  });

  describe("formatDate", () => {
    it("formats ISO strings to human-readable dates", () => {
      expect(formatDate("2026-09-28T12:00:00.000Z")).toContain("2026");
      expect(formatDate("2026-09-28T12:00:00.000Z")).toContain("Sep");
    });

    it("handles null or undefined gracefully", () => {
      expect(formatDate(null)).toBe("—");
      expect(formatDate(undefined)).toBe("—");
      expect(formatDate("invalid-date")).toBe("—");
    });
  });

  describe("calculatePagination", () => {
    it("calculates first page correctly", () => {
      const page = calculatePagination(45, 20, 0);
      expect(page.currentPage).toBe(1);
      expect(page.totalPages).toBe(3);
      expect(page.hasPrev).toBe(false);
      expect(page.hasNext).toBe(true);
      expect(page.nextOffset).toBe(20);
      expect(page.rangeText).toBe("1–20 of 45");
    });

    it("calculates middle page correctly", () => {
      const page = calculatePagination(45, 20, 20);
      expect(page.currentPage).toBe(2);
      expect(page.totalPages).toBe(3);
      expect(page.hasPrev).toBe(true);
      expect(page.hasNext).toBe(true);
      expect(page.prevOffset).toBe(0);
      expect(page.nextOffset).toBe(40);
      expect(page.rangeText).toBe("21–40 of 45");
    });

    it("calculates last page correctly", () => {
      const page = calculatePagination(45, 20, 40);
      expect(page.currentPage).toBe(3);
      expect(page.totalPages).toBe(3);
      expect(page.hasPrev).toBe(true);
      expect(page.hasNext).toBe(false);
      expect(page.prevOffset).toBe(20);
      expect(page.rangeText).toBe("41–45 of 45");
    });

    it("handles zero total count correctly", () => {
      const page = calculatePagination(0, 20, 0);
      expect(page.currentPage).toBe(1);
      expect(page.totalPages).toBe(1);
      expect(page.hasPrev).toBe(false);
      expect(page.hasNext).toBe(false);
      expect(page.rangeText).toBe("0 of 0");
    });
  });

  describe("getRecoveredOffset", () => {
    it("returns null when current offset is valid for total count", () => {
      expect(getRecoveredOffset(45, 20, 0)).toBeNull();
      expect(getRecoveredOffset(45, 20, 20)).toBeNull();
      expect(getRecoveredOffset(45, 20, 40)).toBeNull();
      expect(getRecoveredOffset(0, 20, 0)).toBeNull();
    });

    it("resets offset to 0 when total is 0 and current offset is non-zero", () => {
      expect(getRecoveredOffset(0, 20, 20)).toBe(0);
      expect(getRecoveredOffset(0, 20, 40)).toBe(0);
    });

    it("recovers to last valid page when total > 0 and current offset is beyond total", () => {
      // 45 items with limit 20: valid pages are 0..19 (offset 0), 20..39 (offset 20), 40..44 (offset 40)
      expect(getRecoveredOffset(45, 20, 60)).toBe(40);
      expect(getRecoveredOffset(45, 20, 100)).toBe(40);

      // Exactly 20 items: only page is 0..19 (offset 0)
      expect(getRecoveredOffset(20, 20, 20)).toBe(0);
      expect(getRecoveredOffset(20, 20, 40)).toBe(0);

      // 21 items: pages are offset 0 and offset 20
      expect(getRecoveredOffset(21, 20, 40)).toBe(20);
    });

    it("resets negative offsets to 0", () => {
      expect(getRecoveredOffset(10, 20, -5)).toBe(0);
      expect(getRecoveredOffset(0, 20, -1)).toBe(0);
    });
  });
});
