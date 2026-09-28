"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "@/components/safe-link";
import { LayoutDashboard, FileText, BookOpen, Newspaper, Globe, Users, X } from "lucide-react";
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

function MobileNavItem({ item, onClose }: { item: NavItem; onClose: () => void }) {
  const Icon = ITEM_ICONS[item.id] ?? FileText;
  const pathname = usePathname();

  if (!item.href) {
    return (
      <span
        className={`${styles.mobileNavItem} ${styles.mobileNavItemComingSoon}`}
        aria-label={`${item.label} — coming next`}
        aria-disabled="true"
      >
        <span className={styles.mobileNavItemIcon} aria-hidden="true">
          <Icon aria-hidden="true" />
        </span>
        <span>{item.label}</span>
      </span>
    );
  }

  const isCurrent = pathname === item.href || pathname.startsWith(`${item.href}/`);
  return (
    <Link
      href={item.href}
      className={styles.mobileNavItem}
      aria-current={isCurrent ? "page" : undefined}
      onClick={onClose}
    >
      <span className={styles.mobileNavItemIcon} aria-hidden="true">
        <Icon aria-hidden="true" />
      </span>
      <span>{item.label}</span>
    </Link>
  );
}

type DashboardMobileNavProps = {
  role: ApplicationRole;
  isOpen: boolean;
  onClose: () => void;
};

export function DashboardMobileNav({ role, isOpen, onClose }: DashboardMobileNavProps) {
  const nav = getDashboardNavigation(role);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Close on route change
  useEffect(() => {
    onClose();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Focus close button when drawer opens
  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
    }
  }, [isOpen]);

  // Escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Trap focus inside panel
  useEffect(() => {
    if (!isOpen || !panelRef.current) return;
    const panel = panelRef.current;
    const focusable = panel.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    panel.addEventListener("keydown", handleTab);
    return () => panel.removeEventListener("keydown", handleTab);
  }, [isOpen]);

  if (!isOpen) return null;

  const isDashboardHome = pathname === "/dashboard";

  return (
    <div
      className={styles.mobileOverlay}
      role="dialog"
      aria-modal="true"
      aria-label="Dashboard navigation"
      onClick={(e) => {
        // Close when clicking the backdrop (outside the panel)
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.mobilePanel} ref={panelRef}>
        <div className={styles.mobilePanelHeader}>
          <span>Navigation</span>
          <button
            ref={closeButtonRef}
            type="button"
            className={styles.mobileCloseButton}
            aria-label="Close navigation menu"
            onClick={onClose}
          >
            <X aria-hidden="true" />
          </button>
        </div>

        <div className={styles.mobileNavBody}>
          {/* Home link */}
          <Link
            href="/dashboard"
            className={styles.mobileNavItem}
            aria-current={isDashboardHome ? "page" : undefined}
            onClick={onClose}
          >
            <span className={styles.mobileNavItemIcon} aria-hidden="true">
              <LayoutDashboard aria-hidden="true" />
            </span>
            <span>Home</span>
          </Link>

          {nav.sections.map((section) => (
            <div key={section.id} role="list">
              <p className={styles.mobileSectionLabel}>{section.label}</p>
              {section.items.map((item) => (
                <MobileNavItem key={item.id} item={item} onClose={onClose} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
