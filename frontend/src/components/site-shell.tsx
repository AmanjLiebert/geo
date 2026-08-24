import Link from "next/link";
import type { ReactNode } from "react";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="shell nav-shell">
        <Link className="brand" href="/" aria-label="Geo-Kurdistan home">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <span>Geo—Kurdistan</span>
        </Link>
        <nav className="desktop-nav" aria-label="Primary navigation">
          <Link href="/explore/formations">Explore</Link>
          <Link href="/maps">Maps</Link>
          <Link href="/research">Research</Link>
          <Link href="/field">Field</Link>
          <Link href="/#learning">Learning</Link>
        </nav>
        <div className="nav-tools">
          <Link className="search-link" href="/#search" aria-label="Open geological search">Search <span aria-hidden="true">⌕</span></Link>
          <span className="language">EN</span>
          <details className="mobile-menu">
            <summary aria-label="Open navigation menu"><span /><span /></summary>
            <nav aria-label="Mobile navigation">
              <Link href="/explore/formations">Explore formations</Link>
              <Link href="/maps">Geological map</Link>
              <Link href="/research">Research</Link>
              <Link href="/field">Field gallery</Link>
              <Link href="/#learning">Learning</Link>
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell footer-grid">
        <div className="footer-intro">
          <Link className="brand brand-light" href="/"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>Geo—Kurdistan</Link>
          <p>A public field atlas for exploring the geology and geological heritage of the Kurdistan Region.</p>
          <span className="review-note">Scientific descriptions remain subject to teacher review.</span>
        </div>
        <div><h2>Explore</h2><Link href="/explore/formations">Formations</Link><Link href="/maps">Places & map</Link><Link href="/field">Field records</Link></div>
        <div><h2>Knowledge</h2><Link href="/research">Research</Link><Link href="/#geologic-time">Geological time</Link><Link href="/#learning">Learning material</Link></div>
        <div><h2>Project</h2><Link href="/#about">About the atlas</Link><Link href="/#sources">Sources</Link><a href="mailto:hello@geo-kurdistan.example">Contact</a></div>
      </div>
      <div className="shell footer-bottom"><span>© 2026 Geo-Kurdistan</span><span>Visitor showcase · English</span></div>
    </footer>
  );
}

export function PageIntro({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children?: ReactNode }) {
  return <section className="page-intro"><div className="shell"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="page-lead">{description}</p>{children}</div></section>;
}

export function SectionHeading({ eyebrow, title, text, link }: { eyebrow: string; title: string; text?: string; link?: { href: string; label: string } }) {
  return <div className="section-heading"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2>{text && <p>{text}</p>}</div>{link && <Link className="text-link" href={link.href}>{link.label}<span aria-hidden="true">↗</span></Link>}</div>;
}
