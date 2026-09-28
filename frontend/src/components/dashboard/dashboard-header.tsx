"use client";

import Link from "@/components/safe-link";
import { LogOut, Settings, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import type { ApplicationRole } from "@/lib/auth-api";
import styles from "./dashboard.module.css";

function roleLabelText(role: ApplicationRole): string {
  switch (role) {
    case "admin":
      return "Admin";
    case "teacher":
      return "Teacher";
    case "visitor":
      return "Visitor";
  }
}

function roleBadgeClass(role: ApplicationRole): string {
  switch (role) {
    case "admin":
      return styles.roleBadgeAdmin;
    case "teacher":
      return styles.roleBadgeTeacher;
    case "visitor":
      return styles.roleBadgeVisitor;
  }
}

type DashboardHeaderProps = {
  /** Called when the mobile navigation trigger is pressed. */
  onMenuOpen: () => void;
};

export function DashboardHeader({ onMenuOpen }: DashboardHeaderProps) {
  const { user, signOut } = useAuth();

  const displayName = user?.displayName ?? "Dashboard";
  const role = user?.role;

  return (
    <header className={styles.header} role="banner">
      {/* Mobile nav trigger — visible on ≤760px */}
      <button
        type="button"
        className={styles.mobileNavTrigger}
        aria-label="Open navigation menu"
        aria-expanded={false}
        onClick={onMenuOpen}
      >
        {/* Menu icon — three lines */}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Brand link */}
      <Link href="/dashboard" className={styles.headerBrand} aria-label="Geo-Kurdistan dashboard home">
        <span className={styles.headerBrandMark} aria-hidden="true">
          <LayoutDashboard />
        </span>
        <span>Dashboard</span>
      </Link>

      <span className={styles.headerSep} aria-hidden="true" />

      {/* User info */}
      {user && (
        <div className={styles.headerUser}>
          <span className={styles.headerUserName} title={displayName}>
            {displayName}
          </span>
          {role && (
            <span
              className={`${styles.roleBadge} ${roleBadgeClass(role)}`}
              aria-label={`Role: ${roleLabelText(role)}`}
            >
              {roleLabelText(role)}
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className={styles.headerActions}>
        <Link href="/account" className={styles.headerLink} aria-label="My account">
          <Settings aria-hidden="true" />
          <span>Account</span>
        </Link>

        <button
          type="button"
          className={styles.signOutButton}
          onClick={() => { void signOut(); }}
          aria-label="Sign out of Geo-Kurdistan"
        >
          <LogOut aria-hidden="true" />
          <span>Sign out</span>
        </button>
      </div>
    </header>
  );
}
