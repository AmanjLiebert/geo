"use client";

import Link from "@/components/safe-link";
import { usePathname } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { NeoBadge } from "./neo-badge";

export function HomePreviewNotice() {
  const pathname = usePathname();
  if (pathname !== "/") return null;

  return <Link className="brutal-announcement" href="/explore">
    <NeoBadge className="brutal-announcement-badge" variant="clay">Teacher preview</NeoBadge>
    <span className="brutal-announcement-full">Explore the visitor showcase and help shape the geological archive</span>
    <span className="brutal-announcement-short">Review the archive</span>
    <ArrowRight aria-hidden="true" />
  </Link>;
}
