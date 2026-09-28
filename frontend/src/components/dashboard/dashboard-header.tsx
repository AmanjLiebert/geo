"use client";

import { useState } from "react";
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

/** Stable id linking the trigger button to the mobile drawer via aria-controls. */
export const MOBILE_DRAWER_ID = "dashboard-mobile-drawer";

type DashboardHeaderProps = {
  /** Whether the mobile navigation drawer is currently open. */
  menuOpen: boolean;
  /** Called when the mobile navigation trigger is pressed. */
  onMenuOpen: () => void;
  /** Ref forwarded to the mobile trigger button so focus can be restored. */
  triggerRef: React.RefObject<HTMLButtonElement | null>;
};

export function DashboardHeader({ menuOpen, onMenuOpen, triggerRef }: DashboardHeaderProps) {
  const { user, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  const displayName = user?.displayName ?? "Dashboard";
  const role = user?.role;

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    setSignOutError(null);
    try {
      await signOut();
    } catch {
      // Never expose tokens, provider errors, stack traces, or internal detail.
      setSignOutError("Sign-out could not be completed. Please try again.");
      setSigningOut(false);
    }
  }

  return (
    <header className={styles.header} role="banner">
      {/* Mobile nav trigger — visible on ≤760px */}
      <button
        ref={triggerRef}
        type="button"
        className={styles.mobileNavTrigger}
        aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={menuOpen}
        aria-controls={MOBILE_DRAWER_ID}
        onClick={onMenuOpen}
      >
        {/* Hamburger icon */}
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
        {/* Hidden below 760px via CSS; aria-label on the link carries the name */}
        <span className={styles.headerBrandText} aria-hidden="true">Dashboard</span>
      </Link>

      <span className={styles.headerSep} aria-hidden="true" />

      {/* User info — hidden at phone width to prevent overflow */}
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
        <Link
          href="/account"
          className={styles.headerLink}
          aria-label="My account"
          title="My account"
        >
          <Settings aria-hidden="true" />
          {/* Text hidden at phone width; accessible name comes from aria-label */}
          <span className={styles.headerLinkText} aria-hidden="true">Account</span>
        </Link>

        <button
          type="button"
          className={styles.signOutButton}
          onClick={() => { void handleSignOut(); }}
          aria-label={signingOut ? "Signing out…" : "Sign out of Geo-Kurdistan"}
          title={signingOut ? "Signing out…" : "Sign out"}
          aria-busy={signingOut}
          disabled={signingOut}
        >
          <LogOut aria-hidden="true" />
          <span className={styles.headerLinkText} aria-hidden="true">
            {signingOut ? "Signing out…" : "Sign out"}
          </span>
        </button>
      </div>

      {/* Sign-out error banner — announced to screen readers and cleanly overlaying below header */}
      {signOutError && (
        <div
          className={styles.signOutError}
          role="alert"
          aria-live="assertive"
        >
          {signOutError}
        </div>
      )}
    </header>
  );
}
