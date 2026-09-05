import Link from "@/components/safe-link";
import type { ReactNode } from "react";
import styles from "./neo-action.module.css";

type ActionVariant = "default" | "dark" | "clay" | "light";

export function NeoAction({ href, children, variant = "default", className = "", ariaLabel }: { href: string; children: ReactNode; variant?: ActionVariant; className?: string; ariaLabel?: string }) {
  return <Link className={`${styles.action} ${styles[variant]} ${className}`.trim()} href={href} aria-label={ariaLabel}>{children}</Link>;
}
