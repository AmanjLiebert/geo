import Image from "next/image";
import Link from "@/components/safe-link";
import { Archive, ArrowUpRight, Compass, FileText, MapPinned, Search, ShoppingBag, Telescope, type LucideIcon } from "lucide-react";
import { BrutalHomeHero } from "@/components/brutal-home-hero";
import { CategoryMarquee } from "@/components/category-marquee";
import { InteractiveMap } from "@/components/interactive-map";
import { NeoAction } from "@/components/neo-action";
import { NeoBadge } from "@/components/neo-badge";
import { collectionHighlights, homeUpdates, shopProducts } from "@/content/home-data";
import { categories, fieldObservations, getCategoryRecordCount, locations, research } from "@/content/mock-data";
import styles from "./home.module.css";

function ModuleBar({ icon: Icon, title, titleId, note, link }: { icon: LucideIcon; title: string; titleId: string; note?: string; link?: { href: string; label: string } }) {
  return (
    <header className={styles.moduleBar}>
      <div><span><Icon aria-hidden="true" /></span><h2 id={titleId}>{title}</h2>{note && <NeoBadge variant="outline" className={styles.moduleBadge}>{note}</NeoBadge>}</div>
      {link && <NeoAction href={link.href} variant="dark" className={styles.moduleAction}>{link.label}<ArrowUpRight aria-hidden="true" /></NeoAction>}
    </header>
  );
}

export default function Home() {
  const [leadUpdate, ...updateFeed] = homeUpdates;
  const categoryCounts = Object.fromEntries(categories.map((category) => [category.slug, getCategoryRecordCount(category.slug)]));

  return (
    <main className={styles.home}>
      <BrutalHomeHero />

      <section id="collections" className={styles.archiveIndex} aria-labelledby="archive-index-title">
        <ModuleBar icon={Archive} title="Collections" titleId="archive-index-title" note={`${categories.length + collectionHighlights.length} exploration collections`} />
        <CategoryMarquee categories={categories} counts={categoryCounts} highlights={[...collectionHighlights]} />
      </section>

      <section id="discoveries" className={styles.updates} aria-labelledby="updates-title">
        <ModuleBar icon={Telescope} title="Recently added" titleId="updates-title" note={`${homeUpdates.length} records`} link={{ href: "/explore/formations", label: "All records" }} />
        <div className={styles.updateBoard}>
          <Link className={styles.leadUpdate} href={leadUpdate.href}>
            <Image src={leadUpdate.image.src} alt={leadUpdate.image.alt} fill sizes="(max-width: 900px) 100vw, 62vw" />
            <div><NeoBadge className={styles.leadBadge}>{leadUpdate.type} · {leadUpdate.id}</NeoBadge><h3>{leadUpdate.title}</h3><p>{leadUpdate.summary}</p><span>{leadUpdate.place}<ArrowUpRight aria-hidden="true" /></span></div>
          </Link>
          <div className={styles.updateFeed}>
            {updateFeed.slice(0, 6).map((item) => (
              <Link href={item.href} key={item.id}>
                <div><Image src={item.image.src} alt="" fill sizes="112px" /></div>
                <article><small>{item.type} · {item.id}</small><h3>{item.title}</h3><span>{item.place}</span></article>
                <ArrowUpRight aria-hidden="true" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.mapSection} aria-labelledby="map-title">
        <ModuleBar icon={Compass} title="Places" titleId="map-title" note={`${locations.length} mapped localities`} link={{ href: "/maps", label: "Full map" }} />
        <InteractiveMap locations={locations} variant="observatory" />
      </section>

      <section className={styles.researchSection} aria-labelledby="research-title">
        <ModuleBar icon={FileText} title="Research" titleId="research-title" note={`${research.length} publications`} link={{ href: "/research", label: "Library" }} />
        <div className={styles.researchGrid}>
          {research.map((item) => (
            <Link className={styles.researchCard} href="/research" key={item.slug}>
              <div className={styles.researchImage}><Image src={item.image.src} alt={item.image.alt} fill sizes="(max-width: 700px) 100vw, 34vw" /><b className={styles.researchTopic}>{item.topic}</b></div>
              <div><small>{item.type} · {item.year}</small><h3>{item.title}</h3><p>{item.abstract}</p><footer><span>{item.authors}</span><ArrowUpRight aria-hidden="true" /></footer></div>
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.fieldSection} aria-labelledby="field-title">
        <ModuleBar icon={MapPinned} title="Field notes" titleId="field-title" note={`${fieldObservations.length} observations`} link={{ href: "/field", label: "Journal" }} />
        <div className={styles.fieldJournal}>
          {fieldObservations.slice(0, 4).map((item, index) => (
            <Link href="/field" key={item.slug}>
              <div><Image src={item.image.src} alt={item.image.alt} fill sizes="(max-width: 700px) 100vw, 25vw" /><b>{String(index + 1).padStart(2, "0")}</b></div>
              <article><NeoBadge className={styles.cardBadge}>{item.type}</NeoBadge><h3>{item.title}</h3><span className={styles.locationMeta}><MapPinned aria-hidden="true" />{item.location}</span></article>
            </Link>
          ))}
        </div>
      </section>

      <section id="shop" className={styles.shopSection} aria-labelledby="shop-title">
        <ModuleBar icon={ShoppingBag} title="Shop" titleId="shop-title" note={`${shopProducts.length} study objects`} />
        <div className={styles.productShelf}>
          {shopProducts.map((product) => (
              <Link href={`/shop/${product.slug}`} key={product.name}>
                <div><Image src={product.image} alt={product.alt} fill sizes="(max-width: 700px) 50vw, 17vw" /></div>
                <NeoBadge variant="outline" className={styles.productBadge}>{product.type}</NeoBadge>
                <h3>{product.name}</h3>
                <footer><span>{product.price}</span><ArrowUpRight aria-hidden="true" /></footer>
              </Link>
          ))}
        </div>
      </section>

      <section id="search" className={styles.searchStrip} aria-labelledby="search-title">
        <div><Search aria-hidden="true" /><h2 id="search-title">Search the archive</h2></div>
        <form action="/search"><label htmlFor="site-search">Name, place, age or formation</label><div><input id="site-search" name="q" placeholder="Rawandiz, calcite, fold…" /><button type="submit">Search</button></div></form>
      </section>
    </main>
  );
}
