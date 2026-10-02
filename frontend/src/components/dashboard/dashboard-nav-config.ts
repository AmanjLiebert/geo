import type { ApplicationRole } from "@/lib/auth-api";

// ---------------------------------------------------------------------------
// Navigation item types
// ---------------------------------------------------------------------------

export type NavItem = {
  /** Stable identifier for the item — never a translated label. */
  id: string;
  /** Display label shown in the UI. */
  label: string;
  /**
   * Path to link to.  Only set when the route exists in this release.
   * When undefined the item is rendered as "coming next" without a link.
   */
  href?: string;
  /** Short accessible description used for icon-only or tooltip rendering. */
  description: string;
};

export type NavSection = {
  /** Stable section identifier. */
  id: "scientific" | "operational";
  /** Section heading shown in the sidebar. */
  label: string;
  items: NavItem[];
};

export type DashboardNav = {
  /** Sections shown for this role.  Empty array for visitor. */
  sections: NavSection[];
};

// ---------------------------------------------------------------------------
// Navigation configuration
// ---------------------------------------------------------------------------

const SCIENTIFIC_SECTION: NavSection = {
  id: "scientific",
  label: "Scientific workspace",
  items: [
    {
      id: "records",
      label: "Records",
      href: "/dashboard/records",
      description: "Geological records: create, translate, review, and publish.",
    },
    {
      id: "research",
      label: "Research",
      href: "/dashboard/research",
      description: "Research publications, documents, and references.",
    },
  ],
};

const OPERATIONAL_SECTION: NavSection = {
  id: "operational",
  label: "Operations",
  items: [
    {
      id: "news",
      label: "News",
      href: "/dashboard/news",
      description: "Geological news articles: browse and filter editorial items.",
    },
    {
      id: "site-pages",
      label: "Site pages",
      href: "/dashboard/site-pages",
      description: "Managed pages: about, contact, privacy, and terms.",
    },
    {
      id: "users",
      label: "Users",
      href: undefined,
      description: "Invite teachers, activate or disable accounts.",
    },
  ],
};

// ---------------------------------------------------------------------------
// Public API — pure function, no side-effects
// ---------------------------------------------------------------------------

/**
 * Returns the navigation configuration for the given application role.
 *
 * - visitor  → no workspace sections
 * - teacher  → scientific workspace only (Records, Research)
 * - admin    → scientific workspace + small operational section (News, Site pages, Users)
 *
 * No role receives taxonomy, templates, audit-logs, permissions, backups,
 * AI tooling, shop configuration, or technical settings.
 */
export function getDashboardNavigation(role: ApplicationRole): DashboardNav {
  switch (role) {
    case "teacher":
      return { sections: [SCIENTIFIC_SECTION] };
    case "admin":
      return { sections: [SCIENTIFIC_SECTION, OPERATIONAL_SECTION] };
    case "visitor":
      return { sections: [] };
  }
}
