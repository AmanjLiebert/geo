import Image from "next/image";
import Link from "next/link";
import { Archive, ArrowRight, BookOpenText, Compass, Languages, Mail, MapPinned, Menu, Search, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { NeoBadge } from "./neo-badge";
import { PrimaryNavigation } from "./primary-navigation";

function BrutalBrand({ light = false }: { light?: boolean }) {
  return (
    <Link className={`brutal-brand${light ? " brutal-brand-light" : " brutal-header-brand"}`} href="/" aria-label="Geo-Kurdistan home">
      <Image className="brutal-brand-image" src="/brand/geo-kurdistan-mark-v2.png" alt="" width={190} height={109} priority={!light} />
      <span className="brutal-brand-copy"><strong>Geo—Kurdistan</strong><small>Geological archive</small></span>
    </Link>
  );
}

export function SiteHeader() {
  return (
    <header className="brutal-header">
      <Link className="brutal-announcement" href="/explore">
        <NeoBadge variant="clay">Teacher preview</NeoBadge>
        <span>Explore the visitor showcase and help shape the geological archive</span>
        <ArrowRight aria-hidden="true" />
      </Link>
      <div className="brutal-nav-wrap">
        <div className="brutal-nav">
          <BrutalBrand />
          <PrimaryNavigation className="brutal-links" label="Primary navigation" />
          <div className="brutal-tools">
            <Link className="brutal-search" href="/search" aria-label="Search the archive"><Search aria-hidden="true" /><span>Search</span><kbd>/</kbd></Link>
            <span className="brutal-language" aria-label="Current language: English"><Languages aria-hidden="true" /><b>EN</b></span>
            <Link className="brutal-map-action" href="/maps" aria-label="Open geological map"><MapPinned aria-hidden="true" /></Link>
          </div>
          <div className="brutal-mobile">
            <details className="mobile-menu">
              <summary aria-label="Open navigation"><Menu aria-hidden="true" /><span>Menu</span></summary>
              <PrimaryNavigation className="mobile-navigation" label="Mobile navigation" />
            </details>
          </div>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer id="about" className="brutal-footer">
      <div className="brutal-footer-rail" aria-hidden="true" />
      <div className="brutal-footer-shell">
        <div className="brutal-footer-grid">
          <section className="brutal-footer-brand-panel" aria-label="About Geo-Kurdistan">
            <BrutalBrand light />
            <p>A public place to explore the geology and geological heritage of the Kurdistan Region. Scientific descriptions remain subject to teacher review.</p>
            <NeoBadge className="brutal-footer-badge" variant="clay">Visitor showcase</NeoBadge>
            <div className="brutal-footer-shortcuts" aria-label="Archive shortcuts">
              <Link href="/explore" aria-label="Browse all geological collections"><Archive aria-hidden="true" /></Link>
              <Link href="/maps" aria-label="Open the geological map"><MapPinned aria-hidden="true" /></Link>
              <Link href="/research" aria-label="Open the research library"><BookOpenText aria-hidden="true" /></Link>
              <a href="mailto:hello@geo-kurdistan.example" aria-label="Email Geo-Kurdistan"><Mail aria-hidden="true" /></a>
            </div>
          </section>

          <nav className="brutal-footer-directory" aria-label="Footer navigation">
            <section>
              <h3>Collections</h3>
              <Link href="/explore/geological-items">Geological items</Link>
              <Link href="/explore/formations">Formations</Link>
              <Link href="/explore/rocks">Rocks</Link>
              <Link href="/explore/minerals">Minerals</Link>
              <Link href="/explore/fossils">Fossils</Link>
            </section>
            <section>
              <h3>Explore</h3>
              <Link href="/explore">All collections</Link>
              <Link href="/maps">Interactive map</Link>
              <Link href="/field">Field notes</Link>
              <Link href="/search">Search archive</Link>
            </section>
            <section>
              <h3>Resources</h3>
              <Link href="/research">Research library</Link>
              <Link href="/shop">Study objects</Link>
              <Link href="/explore/formations">Regional formations</Link>
              <Link href="/explore/geological-items">Archive records</Link>
            </section>
            <section>
              <h3>Project</h3>
              <Link href="/about">About the project</Link>
              <a href="mailto:hello@geo-kurdistan.example">Email the project</a>
              <span>English interface</span>
              <span>Kurdish / planned</span>
              <span>Teacher review in progress</span>
            </section>
          </nav>
        </div>
      </div>
      <div className="brutal-footer-end">
        <span><i aria-hidden="true" />© 2026 Geo-Kurdistan</span>
        <div><span>Visitor showcase</span><span>Scientific copy pending teacher review</span></div>
      </div>
    </footer>
  );
}

type PageIntroProps = {
  eyebrow: string;
  title: string;
  description: string;
  icon?: LucideIcon;
  code?: string;
  tone?: "map" | "research" | "field" | "shop" | "about";
  steps?: readonly [string, string];
  children?: ReactNode;
};

export function PageIntro({
  eyebrow,
  title,
  description,
  icon: Icon = Compass,
  code = "GK",
  tone,
  steps,
  children,
}: PageIntroProps) {
  return (
    <section className={`page-intro${tone ? ` page-intro-${tone}` : ""}`}>
      <div className="shell">
        <div className="page-intro-mark" aria-hidden="true">
          <Icon />
          <span>{code}</span>
        </div>
        <div className="page-intro-copy">
          <p className="page-intro-path"><span>Geo—Kurdistan</span><ArrowRight aria-hidden="true" />{eyebrow}</p>
          <h1>{title}</h1>
        </div>
        <div className="page-intro-summary">
          <span className="page-intro-summary-label">This page</span>
          <p className="page-lead">{description}</p>
        </div>
        {steps && <ol className="page-intro-steps" aria-label="Suggested path through this page">
          {steps.map((step, index) => <li key={step}><span>{String(index + 1).padStart(2, "0")}</span>{step}</li>)}
        </ol>}
        {children}
      </div>
    </section>
  );
}

export function SectionHeading({ eyebrow, title, text, link }: { eyebrow: string; title: string; text?: string; link?: { href: string; label: string } }) {
  return <div className="section-heading"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2>{text && <p>{text}</p>}</div>{link && <Link className="text-link" href={link.href}>{link.label}<span aria-hidden="true">↗</span></Link>}</div>;
}
