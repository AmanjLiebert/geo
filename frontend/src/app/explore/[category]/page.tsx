import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RecordCard } from "@/components/content-cards";
import { PageIntro, SectionHeading } from "@/components/site-shell";
import { categories, records } from "@/content/mock-data";

export function generateStaticParams() { return categories.map((category) => ({ category: category.slug })); }

export async function generateMetadata({ params }: PageProps<"/explore/[category]">): Promise<Metadata> {
  const { category: slug } = await params;
  const category = categories.find((item) => item.slug === slug);
  return { title: category?.name ?? "Explore", description: category?.description };
}

export default async function CategoryPage({ params }: PageProps<"/explore/[category]">) {
  const { category: slug } = await params;
  const category = categories.find((item) => item.slug === slug);
  if (!category) notFound();
  const categoryRecords = records.filter((record) => record.category === slug);
  const displayRecords = categoryRecords.length ? categoryRecords : records.slice(0, 3);
  return <main>
    <PageIntro eyebrow={`Collection atlas · ${category.eyebrow}`} title={category.name} description={category.description}><div className="intro-actions"><span className="record-status">{category.recordCount} showcase records</span><span className="record-status">Classification pending teacher review</span></div></PageIntro>
    <section className="subpage-section"><div className="shell"><SectionHeading eyebrow="Browse records" title={`Explore ${category.name.toLowerCase()}`} text="Filters are intentionally specific to this collection and remain flexible until the final catalogue is confirmed." /><div className="filter-bar" aria-label="Showcase category filters"><button type="button">All records</button><button type="button">Geological age</button><button type="button">Region</button><button type="button">Record type</button><button type="button">Formation</button></div><div className="record-grid">{displayRecords.map((record) => <RecordCard record={record} key={record.slug} />)}</div></div></section>
    <section className="subpage-section"><div className="shell"><SectionHeading eyebrow="How this collection works" title="A formation is more than a name" /><div className="process-strip"><div><b>01</b><span>Identity</span><i className="strata-icon" /></div><div><b>02</b><span>Age & context</span><i className="fold-icon" /></div><div><b>03</b><span>Field evidence</span><i className="uplift-icon" /></div><div><b>04</b><span>Relationships</span><i className="erosion-icon" /></div></div></div></section>
  </main>;
}
