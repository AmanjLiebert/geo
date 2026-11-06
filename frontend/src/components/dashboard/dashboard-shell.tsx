"use client";

import { useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "@/components/safe-link";
import { LogIn, Home, Lock } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { DashboardHeader } from "./dashboard-header";
import { DashboardSidebar } from "./dashboard-sidebar";
import { DashboardMobileNav } from "./dashboard-mobile-nav";
import styles from "./dashboard.module.css";

// ---------------------------------------------------------------------------
// Loading state
// ---------------------------------------------------------------------------

function DashboardLoading() {
  return (
    <div className={styles.loadingState} role="status" aria-live="polite" aria-label="Loading dashboard">
      <div className={styles.loadingSpinner}>
        <div className={styles.loadingDots} aria-hidden="true">
          <span className={styles.loadingDot} />
          <span className={styles.loadingDot} />
          <span className={styles.loadingDot} />
        </div>
        <span>Loading</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Signed-out state
// ---------------------------------------------------------------------------

function DashboardSignedOut() {
  return (
    <div className={styles.statusPage}>
      <div className={styles.statusCard}>
        <div className={`${styles.statusMark} ${styles.statusMarkShale}`} aria-hidden="true">
          <Lock />
        </div>
        <h1 className={styles.statusTitle}>Sign in required</h1>
        <p className={styles.statusBody}>
          The Geo-Kurdistan scientific workspace is only available to signed-in teachers and
          administrators. Please sign in to continue.
        </p>
        <div className={styles.statusActions}>
          <Link href="/account" className={styles.statusLink}>
            <LogIn aria-hidden="true" />
            Sign in
          </Link>
          <Link href="/" className={styles.statusLinkGhost}>
            <Home aria-hidden="true" />
            Public website
          </Link>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Visitor access state (signed in but not teacher/admin)
// ---------------------------------------------------------------------------

function DashboardVisitorAccess() {
  return (
    <div className={styles.statusPage}>
      <div className={styles.statusCard}>
        <div className={`${styles.statusMark} ${styles.statusMarkIron}`} aria-hidden="true">
          <Lock />
        </div>
        <h1 className={styles.statusTitle}>Scientific workspace</h1>
        <p className={styles.statusBody}>
          The dashboard is the scientific workspace for Geo-Kurdistan teachers and administrators.
          Visitor accounts are used to browse published geological content and save records to
          a private watch list.
        </p>
        <p className={styles.statusBody}>
          If you believe you should have teacher access, please contact a Geo-Kurdistan
          administrator.
        </p>
        <div className={styles.statusActions}>
          <Link href="/" className={styles.statusLink}>
            <Home aria-hidden="true" />
            Public website
          </Link>
          <Link href="/account" className={styles.statusLinkGhost}>
            My account
          </Link>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Authorized dashboard layout (teacher / admin)
// ---------------------------------------------------------------------------

function DashboardLayout({ role, children }: { role: "teacher" | "admin"; children: ReactNode }) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const isFocusedWorkspace = pathname.startsWith("/dashboard/records");

  return (
    <div className={styles.dashboardRoot}>
      <DashboardHeader
        menuOpen={mobileNavOpen}
        onMenuOpen={() => setMobileNavOpen((prev) => !prev)}
        triggerRef={triggerRef}
        persistentMenuTrigger={isFocusedWorkspace}
      />

      <div
        className={
          isFocusedWorkspace
            ? `${styles.dashboardBody} ${styles.dashboardBodyFocused}`
            : styles.dashboardBody
        }
      >
        {!isFocusedWorkspace && <DashboardSidebar role={role} />}

        <main className={styles.main} id="main-content">
          <div
            className={
              isFocusedWorkspace
                ? `${styles.mainInner} ${styles.mainInnerFocused}`
                : styles.mainInner
            }
          >
            {children}
          </div>
        </main>
      </div>

      <DashboardMobileNav
        role={role}
        isOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        triggerRef={triggerRef}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Public export — auth gate
// ---------------------------------------------------------------------------

/**
 * DashboardShell is the authentication and authorization gate for the
 * /dashboard route tree.
 *
 * Security notes:
 * - Roles are read exclusively from the authenticated user object returned
 *   by AuthProvider (which calls the backend /api/v1/auth/me).
 * - Role checks here are for navigation UX only.  The NestJS backend is
 *   the authoritative authorization boundary for all data operations.
 * - Tokens, cookies, Firebase internals, stack traces, and private
 *   identifiers are never exposed to the rendered output.
 * - Session expiry causes getCurrentAccount() to return null, which routes
 *   to the signed-out state safely.
 */
export function DashboardShell({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <DashboardLoading />;
  }

  if (!user) {
    return <DashboardSignedOut />;
  }

  if (user.role === "visitor") {
    return <DashboardVisitorAccess />;
  }

  // At this point role is "teacher" | "admin"
  return (
    <DashboardLayout role={user.role}>
      {children}
    </DashboardLayout>
  );
}
