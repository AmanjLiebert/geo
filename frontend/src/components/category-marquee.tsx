import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { GeologicalCategory } from "@/content/types";
import { NeoBadge } from "./neo-badge";
import styles from "./category-marquee.module.css";

function CategoryGroup({ categories, counts, duplicate = false }: { categories: GeologicalCategory[]; counts: Record<string, number>; duplicate?: boolean }) {
  return (
    <div className={styles.group} aria-hidden={duplicate || undefined}>
      {categories.map((category) => (
        <Link className={styles.tile} href={`/explore/${category.slug}`} tabIndex={duplicate ? -1 : undefined} key={`${duplicate ? "duplicate-" : ""}${category.slug}`}>
          <div className={styles.visual}>
            <Image src={category.image.src} alt={duplicate ? "" : category.image.alt} fill sizes="(max-width: 680px) 265px, (max-width: 1200px) 28vw, 340px" />
            <NeoBadge variant="dark">{counts[category.slug] ?? category.recordCount} records</NeoBadge>
          </div>
          <div className={styles.copy}>
            <div><h3>{category.name}</h3><p>{category.image.caption}</p></div>
            <ArrowUpRight aria-hidden="true" />
          </div>
        </Link>
      ))}
    </div>
  );
}

export function CategoryMarquee({ categories, counts }: { categories: GeologicalCategory[]; counts: Record<string, number> }) {
  return (
    <nav className={styles.viewport} aria-label="Geological collections">
      <div className={styles.track}>
        <CategoryGroup categories={categories} counts={counts} />
        <CategoryGroup categories={categories} counts={counts} duplicate />
      </div>
    </nav>
  );
}
