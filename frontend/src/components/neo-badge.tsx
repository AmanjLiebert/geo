import type { ReactNode } from "react";
import styles from "./neo-badge.module.css";

type BadgeVariant = "default" | "dark" | "clay" | "outline";

export function NeoBadge({ children, variant = "default", className = "" }: { children: ReactNode; variant?: BadgeVariant; className?: string }) {
  return <span className={`${styles.badge} ${styles[variant]} ${className}`.trim()}>{children}</span>;
}

