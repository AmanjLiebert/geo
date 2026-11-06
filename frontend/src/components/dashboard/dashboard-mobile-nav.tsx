"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "@/components/safe-link";
import { LayoutDashboard, X } from "lucide-react";
import type { ApplicationRole } from "@/lib/auth-api";
import { DashboardNavIcon } from "./dashboard-nav-icons";
import {
  getDashboardNavigation,
  isDashboardNavItemCurrent,
  type NavItem,
} from "./dashboard-nav-config";
import { MOBILE_DRAWER_ID } from "./dashboard-header";
import styles from "./dashboard.module.css";

function MobileNavItem({ item, onClose }: { item: NavItem; onClose: () => void }) {
  const pathname = usePathname();

  // Coming-next: render as <li> containing a non-interactive span.
  if (!item.href) {
    return (
      <li>
        <span
          className={`${styles.mobileNavItem} ${styles.mobileNavItemComingSoon}`}
          aria-label={`${item.label} — coming next`}
          aria-disabled="true"
        >
          <span className={styles.mobileNavItemIcon} aria-hidden="true">
            <DashboardNavIcon id={item.id} aria-hidden="true" />
          </span>
          <span>{item.label}</span>
        </span>
      </li>
    );
  }

  const isCurrent = isDashboardNavItemCurrent(pathname, item.href);
  return (
    <li>
      <Link
        href={item.href}
        className={styles.mobileNavItem}
        aria-current={isCurrent ? "page" : undefined}
        onClick={onClose}
      >
        <span className={styles.mobileNavItemIcon} aria-hidden="true">
          <DashboardNavIcon id={item.id} aria-hidden="true" />
        </span>
        <span>{item.label}</span>
      </Link>
    </li>
  );
}

type DashboardMobileNavProps = {
  role: ApplicationRole;
  isOpen: boolean;
  onClose: () => void;
  /** Ref to the header trigger button — focus restored here when drawer closes. */
  triggerRef: React.RefObject<HTMLButtonElement | null>;
};

export function DashboardMobileNav({ role, isOpen, onClose, triggerRef }: DashboardMobileNavProps) {
  const nav = getDashboardNavigation(role);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const wasOpen = useRef(false);

  // Close on route change (restores focus via the effect below).
  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Restore focus to the trigger whenever the drawer closes.
  useEffect(() => {
    if (wasOpen.current && !isOpen) {
      if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
        window.requestAnimationFrame(() => {
          triggerRef.current?.focus();
        });
      } else {
        triggerRef.current?.focus();
      }
    }
    wasOpen.current = isOpen;
  }, [isOpen, triggerRef]);

  // Focus the close button when the drawer opens.
  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
    }
  }, [isOpen]);

  // Escape key closes and restores focus (restoration handled by the effect above).
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Focus trap inside the panel.
  useEffect(() => {
    if (!isOpen || !panelRef.current) return;
    const panel = panelRef.current;
    const getFocusable = () =>
      Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const focusable = getFocusable();
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first || !panel.contains(document.activeElement)) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last || !panel.contains(document.activeElement)) {
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
      id={MOBILE_DRAWER_ID}
      className={styles.mobileOverlay}
      role="dialog"
      aria-modal="true"
      aria-label="Dashboard navigation"
      onClick={(e) => {
        // Close when clicking the backdrop (outside the panel).
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

        <nav aria-label="Dashboard mobile navigation">
          {/* Home item rendered outside the section lists */}
          <ul className={styles.mobileNavBody}>
            <li>
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
            </li>
          </ul>

          {nav.sections.map((section) => (
            <div key={section.id}>
              <p className={styles.mobileSectionLabel} id={`mobile-section-${section.id}`}>{section.label}</p>
              <ul className={styles.mobileNavBody} aria-labelledby={`mobile-section-${section.id}`}>
                {section.items.map((item) => (
                  <MobileNavItem key={item.id} item={item} onClose={onClose} />
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
    </div>
  );
}
