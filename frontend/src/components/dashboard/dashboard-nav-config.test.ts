import { describe, expect, it } from "vitest";
import { getDashboardNavigation } from "./dashboard-nav-config";

// Identifiers that must never appear in any role's navigation.
const FORBIDDEN_IDS = [
  "taxonomy",
  "templates",
  "schema-versions",
  "audit-log",
  "audit-logs",
  "permissions",
  "roles",
  "backups",
  "ai",
  "shop",
  "technical-settings",
  "system-config",
  "system-configuration",
  "settings",
];

function allItemIds(role: "visitor" | "teacher" | "admin"): string[] {
  const nav = getDashboardNavigation(role);
  return nav.sections.flatMap((section) => section.items.map((item) => item.id));
}

function allSectionIds(role: "visitor" | "teacher" | "admin"): string[] {
  const nav = getDashboardNavigation(role);
  return nav.sections.map((s) => s.id);
}

describe("getDashboardNavigation", () => {
  // ----- visitor -----
  describe("visitor", () => {
    it("receives no workspace sections", () => {
      const nav = getDashboardNavigation("visitor");
      expect(nav.sections).toHaveLength(0);
    });

    it("receives no nav items", () => {
      expect(allItemIds("visitor")).toHaveLength(0);
    });
  });

  // ----- teacher -----
  describe("teacher", () => {
    it("receives the scientific section only", () => {
      const sections = allSectionIds("teacher");
      expect(sections).toContain("scientific");
      expect(sections).not.toContain("operational");
    });

    it("receives Records and Research items", () => {
      const ids = allItemIds("teacher");
      expect(ids).toContain("records");
      expect(ids).toContain("research");
    });

    it("does not receive operational items (News, Site pages, Users)", () => {
      const ids = allItemIds("teacher");
      expect(ids).not.toContain("news");
      expect(ids).not.toContain("site-pages");
      expect(ids).not.toContain("users");
    });

    it("does not receive forbidden system-admin items", () => {
      const ids = allItemIds("teacher");
      for (const forbidden of FORBIDDEN_IDS) {
        expect(ids).not.toContain(forbidden);
      }
    });
  });

  // ----- admin -----
  describe("admin", () => {
    it("receives both the scientific and operational sections", () => {
      const sections = allSectionIds("admin");
      expect(sections).toContain("scientific");
      expect(sections).toContain("operational");
    });

    it("receives Records and Research in the scientific section", () => {
      const nav = getDashboardNavigation("admin");
      const scientificSection = nav.sections.find((s) => s.id === "scientific");
      expect(scientificSection).toBeDefined();
      const itemIds = scientificSection!.items.map((i) => i.id);
      expect(itemIds).toContain("records");
      expect(itemIds).toContain("research");
    });

    it("receives News, Site pages, and Users in the operational section", () => {
      const nav = getDashboardNavigation("admin");
      const operationalSection = nav.sections.find((s) => s.id === "operational");
      expect(operationalSection).toBeDefined();
      const itemIds = operationalSection!.items.map((i) => i.id);
      expect(itemIds).toContain("news");
      expect(itemIds).toContain("site-pages");
      expect(itemIds).toContain("users");
    });

    it("shares the exact same scientific section as teacher (no extra record items for admin)", () => {
      const teacherNav = getDashboardNavigation("teacher");
      const adminNav = getDashboardNavigation("admin");
      const teacherScientific = teacherNav.sections.find((s) => s.id === "scientific");
      const adminScientific = adminNav.sections.find((s) => s.id === "scientific");
      expect(adminScientific).toEqual(teacherScientific);
    });

    it("does not receive forbidden system-admin items", () => {
      const ids = allItemIds("admin");
      for (const forbidden of FORBIDDEN_IDS) {
        expect(ids).not.toContain(forbidden);
      }
    });
  });

  // ----- return type integrity -----
  describe("return type integrity", () => {
    it("every item has a stable id, a label, and a description", () => {
      for (const role of ["visitor", "teacher", "admin"] as const) {
        const nav = getDashboardNavigation(role);
        for (const section of nav.sections) {
          for (const item of section.items) {
            expect(typeof item.id).toBe("string");
            expect(item.id.length).toBeGreaterThan(0);
            expect(typeof item.label).toBe("string");
            expect(item.label.length).toBeGreaterThan(0);
            expect(typeof item.description).toBe("string");
            expect(item.description.length).toBeGreaterThan(0);
          }
        }
      }
    });
  });
});
