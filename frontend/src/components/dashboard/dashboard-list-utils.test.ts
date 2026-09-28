import { describe, expect, it } from "vitest";
import {
  calculatePagination,
  formatDate,
  formatRecordStatus,
  formatResearchStatus,
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
});
