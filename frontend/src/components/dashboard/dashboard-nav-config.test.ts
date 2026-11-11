import { describe, expect, it } from "vitest";
import {
  getDashboardNavigation,
  isDashboardNavItemCurrent,
} from "./dashboard-nav-config";

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

    it("receives Records and Research items with active dashboard routes", () => {
      const nav = getDashboardNavigation("teacher");
      const scientificSection = nav.sections.find((s) => s.id === "scientific");
      expect(scientificSection).toBeDefined();

      const recordsItem = scientificSection!.items.find((i) => i.id === "records");
      expect(recordsItem?.href).toBe("/dashboard/records");
      expect(recordsItem?.description).toBe("Geological records: view, create, and edit draft records.");

      const researchItem = scientificSection!.items.find((i) => i.id === "research");
      expect(researchItem?.href).toBe("/dashboard/research");
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

    it("receives Records and Research with active dashboard routes in scientific section", () => {
      const nav = getDashboardNavigation("admin");
      const scientificSection = nav.sections.find((s) => s.id === "scientific");
      expect(scientificSection).toBeDefined();

      const recordsItem = scientificSection!.items.find((i) => i.id === "records");
      expect(recordsItem?.href).toBe("/dashboard/records");

      const researchItem = scientificSection!.items.find((i) => i.id === "research");
      expect(researchItem?.href).toBe("/dashboard/research");
    });

    it("receives News and Site pages with active dashboard routes, and Users as non-interactive coming-next item", () => {
      const nav = getDashboardNavigation("admin");
      const operationalSection = nav.sections.find((s) => s.id === "operational");
      expect(operationalSection).toBeDefined();

      const newsItem = operationalSection!.items.find((i) => i.id === "news");
      expect(newsItem?.href).toBe("/dashboard/news");

      const sitePagesItem = operationalSection!.items.find((i) => i.id === "site-pages");
      expect(sitePagesItem?.href).toBe("/dashboard/site-pages");

      const usersItem = operationalSection!.items.find((i) => i.id === "users");
      expect(usersItem?.href).toBeUndefined();
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

describe("isDashboardNavItemCurrent", () => {
  it("matches the item's own route", () => {
    expect(isDashboardNavItemCurrent("/dashboard/records", "/dashboard/records")).toBe(true);
    expect(isDashboardNavItemCurrent("/dashboard/research", "/dashboard/research")).toBe(true);
  });

  it("keeps a section current on nested list, create, and editor routes", () => {
    expect(isDashboardNavItemCurrent("/dashboard/records/new", "/dashboard/records")).toBe(true);
    expect(
      isDashboardNavItemCurrent(
        "/dashboard/records/5f0b0e6e-0000-4000-8000-000000000000/edit",
        "/dashboard/records",
      ),
    ).toBe(true);
    expect(isDashboardNavItemCurrent("/dashboard/research/new", "/dashboard/research")).toBe(true);
  });

  it("does not match unrelated sibling routes", () => {
    expect(
      isDashboardNavItemCurrent("/dashboard/records-archive", "/dashboard/records"),
    ).toBe(false);
    expect(
      isDashboardNavItemCurrent("/dashboard/research-notes", "/dashboard/research"),
    ).toBe(false);
    expect(isDashboardNavItemCurrent("/dashboard", "/dashboard/records")).toBe(false);
  });

  it("gives each role's routes exactly one current item", () => {
    const routes = [
      "/dashboard/records",
      "/dashboard/records/new",
      "/dashboard/records/record-id/edit",
      "/dashboard/research",
      "/dashboard/research/research-id",
    ];

    for (const role of ["teacher", "admin"] as const) {
      const hrefs = getDashboardNavigation(role)
        .sections.flatMap((section) => section.items)
        .flatMap((item) => (item.href ? [item.href] : []));

      for (const route of routes) {
        const current = hrefs.filter((href) =>
          isDashboardNavItemCurrent(route, href),
        );
        expect(current, `${role} ${route}`).toHaveLength(1);
      }
    }
  });

  it("does not report a current item for the dashboard home route", () => {
    const hrefs = getDashboardNavigation("admin")
      .sections.flatMap((section) => section.items)
      .flatMap((item) => (item.href ? [item.href] : []));

    expect(
      hrefs.filter((href) => isDashboardNavItemCurrent("/dashboard", href)),
    ).toHaveLength(0);
  });
});
