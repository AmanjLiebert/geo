"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Landmark, MapPinned, Microscope, Pickaxe, ShoppingBag } from "lucide-react";

const items = [
  { href: "/explore", label: "Explore", match: "/explore", icon: Pickaxe },
  { href: "/maps", label: "Map", match: "/maps", icon: MapPinned },
  { href: "/research", label: "Research", match: "/research", icon: Microscope },
  { href: "/#shop", label: "Shop", icon: ShoppingBag },
  { href: "/#about", label: "About", icon: Landmark },
];

export function PrimaryNavigation({ className, label }: { className: string; label: string }) {
  const pathname = usePathname();

  return (
    <nav className={className} aria-label={label}>
      {items.map((item) => {
        const active = item.match ? pathname.startsWith(item.match) : false;
        const Icon = item.icon;
        return <Link href={item.href} aria-current={active ? "page" : undefined} key={item.label}><i aria-hidden="true"><Icon /></i><span>{item.label}</span></Link>;
      })}
    </nav>
  );
}
