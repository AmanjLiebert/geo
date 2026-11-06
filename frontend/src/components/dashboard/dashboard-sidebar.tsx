"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "@/components/safe-link";
import { LayoutDashboard, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import type { ApplicationRole } from "@/lib/auth-api";
import { DashboardNavIcon } from "./dashboard-nav-icons";
import {
  getDashboardNavigation,
  isDashboardNavItemCurrent,
  type NavItem,
} from "./dashboard-nav-config";
import {
  getSidebarToggleLabel,
  shouldCollapseTemporarySidebarOnEscape,
} from "./dashboard-sidebar-state";
import styles from "./dashboard.module.css";

const SIDEBAR_PANEL_ID = "dashboard-sidebar-panel";
const HOVER_OPEN_DELAY_MS = 220;
const HOVER_CLOSE_DELAY_MS = 180;

function clearTimer(ref: { current: number | null }) {
  if (ref.current === null) return;
  window.clearTimeout(ref.current);
  ref.current = null;
}

function SidebarNavItem({
  item,
  pathname,
  expanded,
}: {
  item: NavItem;
  pathname: string;
  expanded: boolean;
}) {
  const isCurrent = item.href
    ? isDashboardNavItemCurrent(pathname, item.href)
    : false;
  const tooltip = item.href ? item.label : `${item.label} — coming next`;

  if (!item.href) {
    return (
      <li>
        <span
          className={`${styles.sidebarItem} ${styles.sidebarItemComingSoon}`}
          aria-label={tooltip}
          aria-disabled="true"
          role="link"
          tabIndex={0}
          title={item.description}
        >
          <span className={styles.sidebarItemIcon} aria-hidden="true">
            <DashboardNavIcon id={item.id} aria-hidden="true" />
          </span>
          <span className={styles.sidebarItemLabel} aria-hidden={!expanded}>
            {item.label}
          </span>
          <span className={styles.comingSoonTag} aria-hidden="true">
            Soon
          </span>
          <span className={styles.sidebarTooltip} aria-hidden="true">
            {tooltip}
          </span>
        </span>
      </li>
    );
  }

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
          <DashboardNavIcon id={item.id} aria-hidden="true" />
        </span>
        <span className={styles.sidebarItemLabel} aria-hidden={!expanded}>
          {item.label}
        </span>
        <span className={styles.sidebarTooltip} aria-hidden="true">
          {tooltip}
        </span>
      </Link>
    </li>
  );
}

type DashboardSidebarProps = {
  role: ApplicationRole;
  pinnedExpanded: boolean;
  onTogglePin: () => void;
};

export function DashboardSidebar({
  role,
  pinnedExpanded,
  onTogglePin,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const nav = getDashboardNavigation(role);
  // Temporary expansion belongs to the route it was opened on, so a route
  // change collapses it without synchronously resetting state in an effect.
  const [temporaryPathname, setTemporaryPathname] = useState<string | null>(
    null,
  );
  const temporaryExpanded =
    !pinnedExpanded && temporaryPathname === pathname;
  const expanded = pinnedExpanded || temporaryExpanded;
  const pinnedRef = useRef(pinnedExpanded);
  const openTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const pointerInsideRef = useRef(false);
  const focusInsideRef = useRef(false);
  const suppressTemporaryOpenRef = useRef(false);
  const isDashboardHome = pathname === "/dashboard";

  useEffect(() => {
    pinnedRef.current = pinnedExpanded;
    if (!pinnedExpanded) return;
    suppressTemporaryOpenRef.current = false;
    clearTimer(openTimerRef);
    clearTimer(closeTimerRef);
  }, [pinnedExpanded]);

  useEffect(() => {
    // Escape suppresses reopening until the pointer leaves. A new route is a
    // fresh navigation context, so allow temporary expansion again.
    suppressTemporaryOpenRef.current = false;
    clearTimer(openTimerRef);
    clearTimer(closeTimerRef);
  }, [pathname]);

  useEffect(
    () => () => {
      clearTimer(openTimerRef);
      clearTimer(closeTimerRef);
    },
    [],
  );

  function openTemporarily() {
    if (pinnedRef.current || suppressTemporaryOpenRef.current) return;
    clearTimer(closeTimerRef);
    if (openTimerRef.current !== null) return;
    openTimerRef.current = window.setTimeout(() => {
      openTimerRef.current = null;
      if (
        !pinnedRef.current &&
        !suppressTemporaryOpenRef.current &&
        (pointerInsideRef.current || focusInsideRef.current)
      ) {
        setTemporaryPathname(pathname);
      }
    }, HOVER_OPEN_DELAY_MS);
  }

  function closeTemporarily(immediate = false) {
    clearTimer(openTimerRef);
    clearTimer(closeTimerRef);
    if (pinnedRef.current) return;
    if (pointerInsideRef.current || focusInsideRef.current) return;
    if (immediate) {
      setTemporaryPathname(null);
      return;
    }
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      if (
        !pinnedRef.current &&
        !pointerInsideRef.current &&
        !focusInsideRef.current
      ) {
        setTemporaryPathname(null);
      }
    }, HOVER_CLOSE_DELAY_MS);
  }

  function handlePointerEnter() {
    pointerInsideRef.current = true;
    openTemporarily();
  }

  function handlePointerLeave() {
    pointerInsideRef.current = false;
    suppressTemporaryOpenRef.current = false;
    closeTemporarily();
  }

  function handleFocusCapture() {
    focusInsideRef.current = true;
    openTemporarily();
  }

  function handleBlurCapture(event: React.FocusEvent<HTMLElement>) {
    const nextTarget = event.relatedTarget;
    if (
      nextTarget instanceof Node &&
      event.currentTarget.contains(nextTarget)
    ) {
      return;
    }
    focusInsideRef.current = false;
    closeTemporarily();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    if (
      !shouldCollapseTemporarySidebarOnEscape(
        event.key,
        pinnedExpanded,
        temporaryExpanded,
      )
    ) {
      return;
    }
    event.preventDefault();
    suppressTemporaryOpenRef.current = true;
    clearTimer(openTimerRef);
    clearTimer(closeTimerRef);
    setTemporaryPathname(null);
  }

  function handleTogglePin() {
    clearTimer(openTimerRef);
    clearTimer(closeTimerRef);
    setTemporaryPathname(null);
    suppressTemporaryOpenRef.current = pinnedExpanded;
    pinnedRef.current = !pinnedExpanded;
    onTogglePin();
  }

  return (
    <nav
      className={styles.sidebar}
      data-expanded={expanded ? "true" : "false"}
      data-pinned={pinnedExpanded ? "true" : "false"}
      data-temporary={temporaryExpanded ? "true" : "false"}
      aria-label="Dashboard navigation"
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onFocusCapture={handleFocusCapture}
      onBlurCapture={handleBlurCapture}
      onKeyDown={handleKeyDown}
    >
      <div className={styles.sidebarTop}>
        <span className={styles.sidebarBrand} aria-hidden="true">
          <span className={styles.sidebarBrandMark}>
            <LayoutDashboard />
          </span>
          <span className={styles.sidebarBrandText}>Dashboard</span>
        </span>
        <button
          type="button"
          className={styles.sidebarToggle}
          onClick={handleTogglePin}
          aria-expanded={expanded}
          aria-controls={SIDEBAR_PANEL_ID}
          aria-label={getSidebarToggleLabel(
            pinnedExpanded,
            temporaryExpanded,
          )}
          title={getSidebarToggleLabel(pinnedExpanded, temporaryExpanded)}
        >
          {pinnedExpanded ? (
            <PanelLeftClose aria-hidden="true" />
          ) : (
            <PanelLeftOpen aria-hidden="true" />
          )}
        </button>
      </div>

      <div className={styles.sidebarInner} id={SIDEBAR_PANEL_ID}>
        <Link
          href="/dashboard"
          className={styles.sidebarItem}
          aria-current={isDashboardHome ? "page" : undefined}
          aria-label="Dashboard home"
          title="Dashboard home"
        >
          <span className={styles.sidebarItemIcon} aria-hidden="true">
            <LayoutDashboard aria-hidden="true" />
          </span>
          <span className={styles.sidebarItemLabel} aria-hidden={!expanded}>
            Home
          </span>
          <span className={styles.sidebarTooltip} aria-hidden="true">
            Dashboard home
          </span>
        </Link>

        {nav.sections.map((section) => (
          <div key={section.id} className={styles.sidebarSection}>
            <p
              className={styles.sidebarSectionLabel}
              id={`sidebar-section-${section.id}`}
            >
              {section.label}
            </p>
            <ul
              className={styles.sidebarSectionList}
              aria-labelledby={`sidebar-section-${section.id}`}
            >
              {section.items.map((item) => (
                <SidebarNavItem
                  key={item.id}
                  item={item}
                  pathname={pathname}
                  expanded={expanded}
                />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}
