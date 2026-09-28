import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Protected scientific workspace for Geo-Kurdistan teachers and administrators.",
  robots: { index: false, follow: false },
};

/**
 * Dashboard nested layout.
 *
 * Wraps every nested dashboard route in DashboardShell so that authentication gating,
 * visitor denial, teacher/admin layout, header, sidebar, and mobile drawer are
 * shared consistently without per-page duplication.
 *
 * The public SiteHeader and SiteFooter are hidden by the
 * `body:has([data-dashboard-page])` CSS rule in globals.css.
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div data-dashboard-page>
      <DashboardShell>{children}</DashboardShell>
    </div>
  );
}
