"use client";

import { UserRound, LayoutDashboard } from "lucide-react";
import Link from "@/components/safe-link";
import { useAuth } from "./auth-provider";

export function AccountNav() {
  const { user, loading } = useAuth();
  const label = loading ? "Account" : user ? `${user.displayName ?? "Account"} — ${user.role}` : "Sign in";
  const showDashboard = !loading && user && (user.role === "teacher" || user.role === "admin");

  return (
    <>
      {showDashboard && (
        <Link
          className="brutal-account"
          href="/dashboard"
          aria-label="Scientific workspace dashboard"
          title="Dashboard"
        >
          <LayoutDashboard aria-hidden="true" />
        </Link>
      )}
      <Link className="brutal-account" href="/account" aria-label={label} title={label}>
        <UserRound aria-hidden="true" />
        {user && <span className="brutal-account-status" aria-hidden="true" />}
      </Link>
    </>
  );
}
