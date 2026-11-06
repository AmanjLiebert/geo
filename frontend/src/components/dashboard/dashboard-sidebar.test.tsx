import { readFileSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DashboardSidebar } from "./dashboard-sidebar";

const navigationState = vi.hoisted(() => ({ pathname: "/dashboard" }));

vi.mock("next/navigation", () => ({
  usePathname: () => navigationState.pathname,
}));

const css = readFileSync(
  path.join(import.meta.dirname, "dashboard.module.css"),
  "utf8",
);
const cssWithoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");

function cssDeclarations(selector: string): string {
  for (const rule of cssWithoutComments.split("}")) {
    const [selectors, body] = rule.split("{");
    if (!body) continue;
    if (selectors.split(",").some((entry) => entry.trim() === selector)) {
      return body;
    }
  }
  throw new Error(`No CSS rule declares ${selector}`);
}

function renderSidebar(
  role: "teacher" | "admin",
  options: { pathname?: string; pinnedExpanded?: boolean } = {},
) {
  navigationState.pathname = options.pathname ?? "/dashboard";
  return renderToStaticMarkup(
    createElement(DashboardSidebar, {
      role,
      pinnedExpanded: options.pinnedExpanded ?? false,
      onTogglePin: vi.fn(),
    }),
  );
}

describe("DashboardSidebar", () => {
  it("renders one labelled dashboard navigation with a real pin button", () => {
    const html = renderSidebar("teacher");

    expect(html).toContain('<nav');
    expect(html).toContain('aria-label="Dashboard navigation"');
    expect(html).toContain('data-expanded="false"');
    expect(html).toContain('data-pinned="false"');
    expect(html).toContain('data-temporary="false"');
    expect(html).toContain('<button');
    expect(html).toContain('type="button"');
    expect(html).toContain('aria-controls="dashboard-sidebar-panel"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-label="Expand dashboard sidebar"');
    expect(html).toContain('id="dashboard-sidebar-panel"');
  });

  it("keeps every configured destination in the collapsed rail", () => {
    const html = renderSidebar("teacher");

    expect(html).toContain('href="/dashboard"');
    expect(html).toContain('href="/dashboard/records"');
    expect(html).toContain('href="/dashboard/categories"');
    expect(html).toContain('href="/dashboard/research"');
    expect(html).toContain('aria-label="Dashboard home"');
    expect(html).toContain('aria-label="Records"');
    expect(html).toContain('aria-label="Categories"');
    expect(html).toContain('aria-label="Research"');
    expect(html).not.toContain('aria-label="News"');
    expect(html).not.toContain('aria-label="Users"');
  });

  it("keeps tooltip text available for every item while collapsed", () => {
    const html = renderSidebar("teacher");

    expect(html).toContain("Dashboard home");
    expect(html).toContain("Records");
    expect(html).toContain("Research");
    expect(html).toContain("Dashboard navigation");
  });

  it("marks the current section from nested Records routes", () => {
    for (const pathname of [
      "/dashboard/records",
      "/dashboard/records/new",
      "/dashboard/records/record-id/edit",
    ]) {
      const html = renderSidebar("teacher", { pathname });
      expect(html, pathname).toContain('href="/dashboard/records"');
      expect(html, pathname).toContain('aria-current="page"');
    }
  });

  it("does not mark Records current on an unrelated prefix route", () => {
    const html = renderSidebar("teacher", {
      pathname: "/dashboard/records-archive",
    });

    expect(html).not.toContain('aria-current="page"');
  });

  it("marks the dashboard home link only on the dashboard root", () => {
    expect(renderSidebar("teacher", { pathname: "/dashboard" })).toContain(
      'aria-label="Dashboard home"',
    );
    const nested = renderSidebar("teacher", {
      pathname: "/dashboard/records",
    });
    expect(nested).not.toMatch(/aria-current="page" aria-label="Dashboard home"/);
  });

  it("pins expanded and exposes matching expanded semantics", () => {
    const html = renderSidebar("teacher", { pinnedExpanded: true });

    expect(html).toContain('data-expanded="true"');
    expect(html).toContain('data-pinned="true"');
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('aria-label="Collapse dashboard sidebar"');
    expect(html).toContain('aria-hidden="false"');
  });

  it("shows section labels, availability state, and active state when expanded", () => {
    const html = renderSidebar("admin", { pinnedExpanded: true });

    expect(html).toContain("Scientific workspace");
    expect(html).toContain("Operations");
    expect(html).toContain('href="/dashboard/news"');
    expect(html).toContain('href="/dashboard/site-pages"');
    expect(html).toContain("Soon");
  });

  it("keeps coming-next destinations non-interactive but keyboard discoverable", () => {
    const html = renderSidebar("admin");

    expect(html).toContain('aria-label="Users — coming next"');
    expect(html).toContain('aria-disabled="true"');
    expect(html).toContain('role="link"');
    expect(html).toContain('tabindex="0"');
    expect(html).not.toContain('href="/dashboard/users"');
  });

  it("keeps the active destination obvious without relying on a tooltip", () => {
    const html = renderSidebar("teacher", {
      pathname: "/dashboard/research",
    });

    expect(html).toMatch(
      /aria-current="page"[^>]*aria-label="Research"|aria-label="Research"[^>]*aria-current="page"/,
    );
  });
});

describe("dashboard sidebar CSS contract", () => {
  it("keeps a 72px collapsed rail and a 260px pinned expanded sidebar", () => {
    expect(cssDeclarations(".dashboardBody")).toContain(
      "grid-template-columns: 72px minmax(0, 1fr)",
    );
    expect(cssDeclarations(".dashboardBodySidebarExpanded")).toContain(
      "grid-template-columns: 260px minmax(0, 1fr)",
    );
  });

  it("overlays temporary expansion instead of shifting the page grid", () => {
    expect(cssDeclarations('.sidebar[data-temporary="true"]')).toContain(
      "width: 264px",
    );
  });

  it("uses a subtle 160–220ms expand animation", () => {
    expect(cssDeclarations(".sidebar")).toContain("transition: width 180ms ease");
    expect(cssDeclarations(".dashboardBody")).toContain(
      "transition: grid-template-columns 180ms ease",
    );
  });

  it("respects prefers-reduced-motion for the sidebar", () => {
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.sidebar,[\s\S]*?transition: none;/,
    );
  });

  it("keeps interactive targets at least 44px tall", () => {
    expect(cssDeclarations(".sidebarItem")).toContain(
      "min-height: var(--touch-target)",
    );
    expect(cssDeclarations(".sidebarToggle")).toContain(
      "min-height: var(--touch-target)",
    );
  });

  it("truncates long labels without widening the page", () => {
    const label = cssDeclarations(".sidebarItemLabel");
    expect(label).toContain("max-width: 160px");
    expect(label).toContain("overflow: hidden");
    expect(label).toContain("text-overflow: ellipsis");
    expect(cssDeclarations(".main")).toContain("min-width: 0");
    expect(cssDeclarations(".mainInner")).toContain("max-width: 960px");
  });

  it("uses logical direction properties for RTL", () => {
    expect(cssDeclarations(".sidebar")).toContain(
      "border-inline-end: 2px solid var(--carbon)",
    );
    expect(cssDeclarations(".sidebarTooltip")).toContain("inset-inline-start:");
  });

  it("keeps the rail between 761px and 1179px and swaps to the drawer on mobile", () => {
    expect(css).toMatch(
      /@media \(max-width: 1179px\)[\s\S]*?grid-template-columns: 72px minmax\(0, 1fr\)/,
    );
    expect(css).toMatch(
      /@media \(max-width: 1179px\)[\s\S]*?grid-template-columns: 240px minmax\(0, 1fr\)/,
    );
    expect(css).toMatch(
      /@media \(max-width: 760px\)[\s\S]*?\.sidebar \{\s*display: none;/,
    );
    expect(cssDeclarations(".mobileNavTrigger")).toContain("display: none");
    expect(css).toMatch(
      /@media \(max-width: 760px\)[\s\S]*?\.mobileNavTrigger \{\s*display: inline-flex;/,
    );
  });
});
