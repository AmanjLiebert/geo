import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Protected scientific workspace for Geo-Kurdistan teachers and administrators.",
  robots: { index: false, follow: false },
};

/**
 * Dashboard nested layout.
 *
 * This layout intentionally renders no additional wrapper elements — the
 * DashboardShell client component (used inside each dashboard page) provides
 * the full-viewport layout including its own header, sidebar, and main area.
 *
 * The public SiteHeader and SiteFooter are hidden by the
 * `body:has([data-dashboard-page])` CSS rule added to globals.css,
 * following the same pattern as `[data-development-page]`.
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
