import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { DashboardHome } from "@/components/dashboard/dashboard-home";

/**
 * /dashboard — protected scientific workspace home.
 *
 * `data-dashboard-page` on the outer wrapper activates the CSS rule in
 * globals.css that hides the public SiteHeader and SiteFooter, matching
 * the existing `data-development-page` pattern.
 */
export default function DashboardPage() {
  return (
    <div data-dashboard-page>
      <DashboardShell>
        <DashboardHome />
      </DashboardShell>
    </div>
  );
}
