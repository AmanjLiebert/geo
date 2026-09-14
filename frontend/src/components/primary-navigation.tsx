"use client";

import Link from "@/components/safe-link";
import { usePathname } from "next/navigation";
import {
  GeoArchiveIcon,
  GeoHomeIcon,
  GeoMapIcon,
  GeoNotebookIcon,
  GeoResearchIcon,
  GeoRockIcon,
  GeoTagIcon,
} from "@/components/geo-icons";

export const navigationItems = [
  { href: "/", label: "Home", match: "/", icon: GeoHomeIcon },
  { href: "/explore", label: "Explore", match: "/explore", icon: GeoArchiveIcon },
  { href: "/maps", label: "Map", match: "/maps", icon: GeoMapIcon },
  { href: "/research", label: "Research", match: "/research", icon: GeoResearchIcon },
  { href: "/field", label: "Field", match: "/field", icon: GeoNotebookIcon },
  { href: "/shop", label: "Shop", match: "/shop", icon: GeoTagIcon },
  { href: "/about", label: "About", match: "/about", icon: GeoRockIcon },
] as const;

export function PrimaryNavigation({ className, label, onNavigate }: { className: string; label: string; onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className={className} aria-label={label}>
      {navigationItems.map((item) => {
        const active = item.href === "/" ? pathname === "/" : item.match ? pathname.startsWith(item.match) : false;
        const Icon = item.icon;
        return <Link href={item.href} aria-current={active ? "page" : undefined} key={item.label} onClick={onNavigate}>
          <i aria-hidden="true"><Icon /></i>
          <span>{item.label}</span>
          <em className="navigation-bearing" aria-hidden="true"><span /></em>
        </Link>;
      })}
    </nav>
  );
}
