"use client";

import { UserRound } from "lucide-react";
import Link from "@/components/safe-link";
import { useAuth } from "./auth-provider";

export function AccountNav() {
  const { user, loading } = useAuth();
  const label = loading ? "Account" : user ? `${user.displayName ?? "Account"} — ${user.role}` : "Sign in";

  return (
    <Link className="brutal-account" href="/account" aria-label={label} title={label}>
      <UserRound aria-hidden="true" />
      {user && <span className="brutal-account-status" aria-hidden="true" />}
    </Link>
  );
}
