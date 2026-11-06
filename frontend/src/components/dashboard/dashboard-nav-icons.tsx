import {
  BookOpen,
  FileText,
  Globe,
  LayoutDashboard,
  Newspaper,
  Users,
  type LucideProps,
} from "lucide-react";

type DashboardNavIconProps = LucideProps & {
  /** Stable navigation item id from dashboard-nav-config. */
  id: string;
};

/**
 * Renders the icon for a configured dashboard destination. Keeping this as a
 * stable module-scope component avoids creating a component during render.
 */
export function DashboardNavIcon({ id, ...props }: DashboardNavIconProps) {
  switch (id) {
    case "records":
      return <FileText {...props} />;
    case "research":
      return <BookOpen {...props} />;
    case "news":
      return <Newspaper {...props} />;
    case "site-pages":
      return <Globe {...props} />;
    case "users":
      return <Users {...props} />;
    default:
      return <LayoutDashboard {...props} />;
  }
}
