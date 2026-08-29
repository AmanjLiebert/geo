import Image from "next/image";
import Link from "next/link";
import {
  Archive,
  ArrowUpRight,
  BookOpen,
  Boxes,
  CircleDot,
  Gem,
  Layers3,
  MapPinned,
  Mountain,
  ScanSearch,
  Search as SearchIcon,
  Shell,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react";
import { BrutalHomeHero } from "@/components/brutal-home-hero";
import { InteractiveMap } from "@/components/interactive-map";
import { categories, featuredRecord, locations, records, research } from "@/content/mock-data";
import styles from "./home.module.css";

const products = [
  { name: "Ammonite study cast", type: "Fossil object", image: "/images/catalog/ammonite.jpg", alt: "Ammonite fossil study object" },
  { name: "Zagros fold map", type: "Map print", image: "/images/atlas/zagros-satellite.jpg", alt: "Satellite view of the folded Zagros mountain belt" },
  { name: "Calcite specimen", type: "Mineral object", image: "/images/catalog/calcite.jpg", alt: "Translucent calcite crystal specimen" },
  { name: "Field notebook", type: "Field tool", image: "/images/catalog/fieldwork.jpg", alt: "Geologist recording observations beside an outcrop" },
  { name: "Fold structure print", type: "Learning print", image: "/images/catalog/folded-strata.jpg", alt: "Folded bands visible in a rock specimen" },
];

const categoryIcons: Record<string, LucideIcon> = {
  "geological-items": Boxes,
  formations: Layers3,
  rocks: Mountain,
  minerals: Gem,
  fossils: Shell,
  other: Archive,
};

function SectionHead({ icon: Icon, title, titleId, description, link }: { icon: LucideIcon; title: string; titleId: string; description?: string; link?: { href: string; label: string } }) {
  return (
    <div className={styles.sectionHead}>
      <span aria-hidden="true"><Icon /></span>
      <h2 id={titleId}>{title}</h2>
      {description && <p>{description}</p>}
      {link && <Link href={link.href}>{link.label}<ArrowUpRight aria-hidden="true" /></Link>}
    </div>
  );
}

export default function Home() {
  const discoveries = [featuredRecord, ...records.filter((record) => record.slug !== featuredRecord.slug)].slice(0, 4);

  return (
    <main className={styles.home}>
      <BrutalHomeHero />

      <section id="discoveries" className={styles.discoveries} aria-labelledby="discoveries-title">
        <SectionHead icon={ScanSearch} title="Recent discoveries" titleId="discoveries-title" description="Selected geological records, each grounded in a visible specimen, formation or place." />
        <div className={styles.outcropList}>
          {discoveries.map((record) => (
            <Link className={styles.outcropBand} href={`/explore/${record.category}/${record.slug}`} key={record.slug}>
              <div className={styles.bandImage}>
                <Image src={record.image.src} alt={record.image.alt} fill sizes="(max-width: 800px) 100vw, 34vw" />
              </div>
              <article className={styles.bandCopy}>
                <small>{record.recordType} / {record.recordId}</small>
                <h3>{record.name}</h3>
                <p>{record.summary}</p>
                <div><MapPinned aria-hidden="true" /><span>{record.locality}</span></div>
              </article>
              <span className={styles.bandArrow} aria-hidden="true"><ArrowUpRight /></span>
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.collections} aria-labelledby="collections-title">
        <SectionHead icon={CircleDot} title="Browse the collections" titleId="collections-title" description="Choose a geological subject. Every collection remains visible as the archive grows." />
        <div className={styles.categoryWall}>
          {categories.map((category) => {
            const CategoryIcon = categoryIcons[category.slug] ?? CircleDot;
            return (
              <Link className={styles.categoryBlock} href={`/explore/${category.slug}`} key={category.slug}>
                <span className={styles.categoryIcon} aria-hidden="true"><CategoryIcon /></span>
                <div><header><span>{category.eyebrow}</span><b>{category.recordCount} items</b></header><h3>{category.name}</h3><p>{category.description}</p></div>
                <ArrowUpRight className={styles.categoryArrow} aria-hidden="true" />
              </Link>
            );
          })}
        </div>
      </section>

      <section className={styles.mapSection} aria-labelledby="map-title">
        <SectionHead icon={MapPinned} title="Explore by place" titleId="map-title" link={{ href: "/maps", label: "Open full map" }} />
        <InteractiveMap locations={locations} variant="observatory" />
      </section>

      <section className={styles.researchSection} aria-labelledby="research-title">
        <SectionHead icon={BookOpen} title="Research and interpretation" titleId="research-title" link={{ href: "/research", label: "View all research" }} />
        <div className={styles.researchWall}>
          {research.map((item) => (
            <Link className={styles.researchBlock} href="/research" key={item.slug}>
              <header><span>{item.type}</span><b>{item.year}</b></header>
              <div><small>{item.topic}</small><h3>{item.title}</h3><p>{item.abstract}</p><footer>{item.authors}</footer></div>
              <ArrowUpRight aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>

      <section id="shop" className={styles.shopSection} aria-labelledby="shop-title">
        <SectionHead icon={ShoppingBag} title="Shop" titleId="shop-title" description="Field tools, specimen casts, maps and study prints selected for geological study." />
        <div className={styles.productGrid}>
          {products.map((product) => (
            <article className={styles.productBlock} key={product.name}>
              <div><Image src={product.image} alt={product.alt} fill sizes="(max-width: 800px) 50vw, 20vw" /></div>
              <small>{product.type}</small>
              <h3>{product.name}</h3>
              <footer><span>View product</span><ArrowUpRight aria-hidden="true" /></footer>
            </article>
          ))}
        </div>
      </section>

      <section id="search" className={styles.searchSection} aria-labelledby="search-title">
        <div><SearchIcon aria-hidden="true" /><h2 id="search-title">Find a geological record</h2></div>
        <form action="/explore/formations"><label htmlFor="site-search">Search by name, place, age or formation</label><div><input id="site-search" name="q" placeholder="Rawandiz, fold, Cretaceous…" /><button type="submit" aria-label="Search Geo-Kurdistan"><SearchIcon aria-hidden="true" /></button></div></form>
      </section>
    </main>
  );
}
