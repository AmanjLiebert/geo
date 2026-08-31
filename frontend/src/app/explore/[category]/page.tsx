import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { notFound } from "next/navigation";
import { CategoryCard, RecordCard } from "@/components/content-cards";
import { SectionHeading } from "@/components/site-shell";
import { categories, records } from "@/content/mock-data";

export function generateStaticParams() { return categories.map((category) => ({ category: category.slug })); }

export async function generateMetadata({ params }: PageProps<"/explore/[category]">): Promise<Metadata> {
  const { category: slug } = await params;
  const category = categories.find((item) => item.slug === slug);
  if (!category) return { title: "Explore" };
  return { title: category.name, description: category.description, openGraph: { title: `${category.name} | Geo-Kurdistan`, description: category.description, images: [category.image.src] }, twitter: { card: "summary_large_image", title: `${category.name} | Geo-Kurdistan`, description: category.description, images: [category.image.src] } };
}

export default async function CategoryPage({ params }: PageProps<"/explore/[category]">) {
  const { category: slug } = await params;
  const category = categories.find((item) => item.slug === slug);
  if (!category) notFound();
  const categoryRecords = records.filter((record) => record.category === slug);
  const relatedCategories = category.relatedCategorySlugs.flatMap((relatedSlug) => {
    const related = categories.find((item) => item.slug === relatedSlug);
    return related ? [related] : [];
  });

  return <main>
    <section className="collection-header"><div className="shell collection-header-grid"><div><Link className="eyebrow" href="/explore">← All collections</Link><h1>{category.name}</h1><p>{category.description}</p></div><figure><Image src={category.image.src} alt={category.image.alt} fill priority sizes="220px" /><figcaption>{category.image.caption}</figcaption></figure></div></section>
    <section className="subpage-section" id="records"><div className="shell"><SectionHeading eyebrow="Collection records" title={`Explore ${category.name.toLowerCase()}`} text="Each card gives the essential context first. Open any record for its full description, evidence, location and related material." />{categoryRecords.length > 0 ? <div className="record-grid comfortable-record-grid">{categoryRecords.map((record) => <RecordCard record={record} key={record.slug} />)}</div> : <div className="empty-collection"><h3>No published records yet</h3><p>This collection is ready for new records when the catalogue expands.</p></div>}</div></section>
    <section className="category-overview"><div className="shell category-overview-grid"><div><p className="eyebrow">Collection summary</p><h2>What this collection reveals</h2><p className="category-overview-text">{category.overview}</p><ul className="category-theme-list">{category.themes.map((theme, index) => <li key={theme}><span>0{index + 1}</span>{theme}</li>)}</ul></div><dl className="category-facts">{category.facts.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}<div><dt>Current catalogue</dt><dd>{categoryRecords.length} showcase records</dd></div></dl></div></section>
    <section className="related-section"><div className="shell"><SectionHeading eyebrow="Continue exploring" title="Related collections" text="Geological evidence becomes more useful when specimens, formations, fossils and places can be read together." /><div className="related-category-grid">{relatedCategories.map((related, index) => <CategoryCard category={related} index={index} key={related.slug} />)}</div><Link className="all-collections-link" href="/#collections">View all collections <ArrowUpRight aria-hidden="true" /></Link></div></section>
  </main>;
}
