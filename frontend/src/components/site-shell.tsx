import Image from "next/image";
import Link from "next/link";
import { Menu, Search } from "lucide-react";
import type { ReactNode } from "react";
import { PrimaryNavigation } from "./primary-navigation";

function BrutalBrand({ light = false }: { light?: boolean }) {
  return (
    <Link className={`brutal-brand${light ? " brutal-brand-light" : ""}`} href="/" aria-label="Geo-Kurdistan home">
      <Image className="brutal-brand-image" src="/brand/geo-kurdistan-mark-v2.png" alt="" width={190} height={109} priority={!light} />
    </Link>
  );
}

export function SiteHeader() {
  return (
    <header className="brutal-header">
      <div className="brutal-nav">
        <BrutalBrand />
        <PrimaryNavigation className="brutal-links" label="Primary navigation" />
        <div className="brutal-tools"><Link href="/#search" aria-label="Search"><Search aria-hidden="true" /></Link><span>EN</span></div>
        <div className="brutal-mobile">
          <details className="mobile-menu">
            <summary aria-label="Open navigation"><Menu aria-hidden="true" /></summary>
            <PrimaryNavigation className="mobile-navigation" label="Mobile navigation" />
          </details>
        </div>
      </div>
      <div className="brutal-strata-rail" aria-hidden="true"><i /><i /><i /><i /><i /></div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer id="about" className="brutal-footer">
      <div className="brutal-footer-statement">
        <span>About the archive</span>
        <h2>The ground holds the story. This website makes it visible.</h2>
        <p>A public website for exploring the geology and geological heritage of the Kurdistan Region. Scientific descriptions remain subject to teacher review.</p>
      </div>
      <div className="brutal-footer-links">
        <BrutalBrand light />
        <div><h3>Collections</h3><Link href="/explore/geological-items">Geological items</Link><Link href="/explore/rocks">Rocks</Link><Link href="/explore/minerals">Minerals</Link><Link href="/explore/fossils">Fossils</Link><Link href="/explore/formations">Formations</Link></div>
        <div><h3>Explore</h3><Link href="/maps">Map</Link><Link href="/research">Research</Link><Link href="/#shop">Shop</Link><Link href="/#search">Search</Link></div>
        <div><h3>Contact</h3><a href="mailto:hello@geo-kurdistan.example">Email us</a><span>English</span><span>Kurdish / planned</span></div>
      </div>
      <div className="brutal-footer-end"><Image src="/brand/geo-kurdistan-mark-v2.png" alt="" width={260} height={149} /><span>© 2026 Geo-Kurdistan</span></div>
    </footer>
  );
}

export function PageIntro({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children?: ReactNode }) {
  return <section className="page-intro"><div className="shell"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="page-lead">{description}</p>{children}</div></section>;
}

export function SectionHeading({ eyebrow, title, text, link }: { eyebrow: string; title: string; text?: string; link?: { href: string; label: string } }) {
  return <div className="section-heading"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2>{text && <p>{text}</p>}</div>{link && <Link className="text-link" href={link.href}>{link.label}<span aria-hidden="true">↗</span></Link>}</div>;
}
