import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DashboardLayout } from "./dashboard-shell";

const navigationState = vi.hoisted(() => ({ pathname: "/dashboard" }));

vi.mock("next/navigation", () => ({
  usePathname: () => navigationState.pathname,
}));

vi.mock("@/components/auth-provider", () => ({
  useAuth: () => ({
    user: { displayName: "Test Teacher", role: "teacher" },
    signOut: vi.fn(),
  }),
}));

function LayoutHarness({ role }: { role: "teacher" | "admin" }) {
  return (
    <DashboardLayout role={role}>
      <p>Dashboard content</p>
    </DashboardLayout>
  );
}

function renderLayout(pathname: string, role: "teacher" | "admin" = "teacher") {
  navigationState.pathname = pathname;
  return renderToStaticMarkup(createElement(LayoutHarness, { role }));
}

describe("DashboardLayout sidebar consistency", () => {
  const routes = [
    "/dashboard",
    "/dashboard/records",
    "/dashboard/records/new",
    "/dashboard/records/record-id/edit",
    "/dashboard/research",
  ];

  it.each(routes)("renders the shared sidebar on %s", (pathname) => {
    const html = renderLayout(pathname);

    expect(html).toContain('aria-label="Dashboard navigation"');
    expect(html).toContain("Dashboard content");
    // The mobile drawer is closed, so its trigger must not be the only navigation.
    expect(html).not.toContain('aria-label="Dashboard mobile navigation"');
  });

  it("keeps Records active on the list, creation, and editor routes", () => {
    for (const pathname of [
      "/dashboard/records",
      "/dashboard/records/new",
      "/dashboard/records/record-id/edit",
    ]) {
      const html = renderLayout(pathname);
      expect(html, pathname).toMatch(
        /aria-current="page"[^>]*aria-label="Records"|aria-label="Records"[^>]*aria-current="page"/,
      );
    }
  });

  it("does not render the sidebar twice", () => {
    const html = renderLayout("/dashboard/records/new");
    expect(html.match(/aria-label="Dashboard navigation"/g)).toHaveLength(1);
  });

  it("keeps administrator destinations visible on every dashboard route", () => {
    for (const pathname of ["/dashboard", "/dashboard/records", "/dashboard/news"]) {
      const html = renderLayout(pathname, "admin");
      expect(html, pathname).toContain('href="/dashboard/records"');
      expect(html, pathname).toContain('href="/dashboard/news"');
      expect(html, pathname).toContain('href="/dashboard/site-pages"');
    }
  });
});
