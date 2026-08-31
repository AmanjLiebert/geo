import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Archive, ArrowUpRight } from "lucide-react";
import { categories, records } from "@/content/mock-data";

export const metadata: Metadata = {
  title: "Explore collections",
  description: "Browse every geological collection and record in the Geo-Kurdistan showcase.",
};

export default function ExplorePage() {
  return (
    <main className="catalogue-page">
      <header className="catalogue-header">
        <div className="shell">
          <div className="catalogue-title"><span><Archive aria-hidden="true" /></span><div><p>Geological catalogue</p><h1>Collections</h1></div></div>
          <div className="catalogue-summary"><strong>{categories.length}<small>subjects</small></strong><strong>{records.length}<small>records</small></strong><p>Select a subject to browse its specimens, places and evidence.</p></div>
        </div>
      </header>

      <section className="catalogue-section" aria-label="Geological collections">
        <div className="shell">
          <div className="catalogue-toolbar"><span>Browse by subject</span><span>All collections visible</span></div>
          <div className="catalogue-grid">
            {categories.map((category, index) => {
              const count = records.filter((record) => record.category === category.slug).length;
              return (
                <Link className="catalogue-card" href={`/explore/${category.slug}`} key={category.slug}>
                  <div className="catalogue-card-image">
                    <Image src={category.image.src} alt={category.image.alt} fill sizes="(max-width: 720px) 100vw, 33vw" />
                    <span className="catalogue-number">{String(index + 1).padStart(2, "0")}</span>
                  </div>
                  <div className="catalogue-card-copy">
                    <div className="catalogue-name"><div><h2>{category.name}</h2><p>{category.description}</p></div><strong>{count}<small>records</small></strong></div>
                    <div className="catalogue-tags">{category.themes.slice(0, 2).map((theme) => <span key={theme}>{theme}</span>)}</div>
                    <div className="catalogue-card-action"><span>Open collection</span><ArrowUpRight aria-hidden="true" /></div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
