"use client";

import { usePathname } from "next/navigation";
import Link from "@/components/safe-link";
import { LayoutDashboard, FileText, BookOpen, Newspaper, Globe, Users } from "lucide-react";
import type { ApplicationRole } from "@/lib/auth-api";
import { getDashboardNavigation, type NavItem } from "./dashboard-nav-config";
import styles from "./dashboard.module.css";

const ITEM_ICONS: Record<string, typeof LayoutDashboard> = {
  records: FileText,
  research: BookOpen,
  news: Newspaper,
  "site-pages": Globe,
  users: Users,
};

function SidebarNavItem({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const Icon = ITEM_ICONS[item.id] ?? FileText;

  // Items without an href are "coming next" — rendered as non-interactive li.
  if (!item.href) {
    return (
      <li>
        <span
          className={`${styles.sidebarItem} ${styles.sidebarItemComingSoon}`}
          aria-label={`${item.label} — coming next`}
          title={item.description}
          aria-disabled="true"
        >
          <span className={styles.sidebarItemIcon} aria-hidden="true">
            <Icon aria-hidden="true" />
          </span>
          <span className={styles.sidebarItemLabel}>{item.label}</span>
          <span className={styles.comingSoonTag} aria-hidden="true">Soon</span>
        </span>
      </li>
    );
  }

  const isCurrent = pathname === item.href || pathname.startsWith(`${item.href}/`);
  return (
    <li>
      <Link
        href={item.href}
        className={styles.sidebarItem}
        aria-current={isCurrent ? "page" : undefined}
        aria-label={item.label}
        title={item.description}
      >
        <span className={styles.sidebarItemIcon} aria-hidden="true">
          <Icon aria-hidden="true" />
        </span>
        <span className={styles.sidebarItemLabel}>{item.label}</span>
      </Link>
    </li>
  );
}

type DashboardSidebarProps = {
  role: ApplicationRole;
};

export function DashboardSidebar({ role }: DashboardSidebarProps) {
  const pathname = usePathname();
  const nav = getDashboardNavigation(role);
  const isDashboardHome = pathname === "/dashboard";

  return (
    <nav
      className={styles.sidebar}
      aria-label="Dashboard navigation"
    >
      <div className={styles.sidebarInner}>
        {/* Dashboard home link — standalone, not part of a section list */}
        <Link
          href="/dashboard"
          className={styles.sidebarHomeLink}
          aria-current={isDashboardHome ? "page" : undefined}
          aria-label="Dashboard home"
        >
          <span className={styles.sidebarHomeLinkIcon} aria-hidden="true">
            <LayoutDashboard aria-hidden="true" />
          </span>
          <span>Home</span>
        </Link>

        {nav.sections.map((section) => (
          <div key={section.id} className={styles.sidebarSection}>
            <p className={styles.sidebarSectionLabel} id={`sidebar-section-${section.id}`}>
              {section.label}
            </p>
            <ul
              className={styles.sidebarSectionList}
              aria-labelledby={`sidebar-section-${section.id}`}
            >
              {section.items.map((item) => (
                <SidebarNavItem key={item.id} item={item} />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}
