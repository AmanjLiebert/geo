import type { AnchorHTMLAttributes } from "react";

type SafeLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
};

/**
 * Uses native document navigation so Cloudflare does not invoke vinext's
 * unstable client-router bridge. In-page Explore and Research navigation
 * remains client-side through their dedicated view-state controllers.
 */
export default function SafeLink({ href, ...props }: SafeLinkProps) {
  return <a href={href} {...props} />;
}
