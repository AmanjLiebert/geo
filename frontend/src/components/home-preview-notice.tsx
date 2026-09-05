"use client";

import Link from "@/components/safe-link";
import { usePathname } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { NeoBadge } from "./neo-badge";

export function HomePreviewNotice() {
  const pathname = usePathname();
  if (pathname !== "/") return null;

  return <Link className="brutal-announcement" href="/explore">
    <NeoBadge variant="clay">Teacher preview</NeoBadge>
    <span>Explore the visitor showcase and help shape the geological archive</span>
    <ArrowRight aria-hidden="true" />
  </Link>;
}
