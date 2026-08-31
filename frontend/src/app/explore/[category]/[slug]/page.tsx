import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getRecord, locations, records } from "@/content/mock-data";
import { InteractiveMap } from "@/components/interactive-map";
import { RecordCard } from "@/components/content-cards";
import { SectionHeading } from "@/components/site-shell";

export function generateStaticParams() { return records.map((record) => ({ category: record.category, slug: record.slug })); }

export async function generateMetadata({ params }: PageProps<"/explore/[category]/[slug]">): Promise<Metadata> {
  const { category, slug } = await params;
  const record = getRecord(category, slug);
  if (!record) return { title: "Geological record" };
  return { title: record.name, description: record.summary, openGraph: { title: `${record.name} | Geo-Kurdistan`, description: record.summary, images: [record.image.src] }, twitter: { card: "summary_large_image", title: `${record.name} | Geo-Kurdistan`, description: record.summary, images: [record.image.src] } };
}

export default async function RecordPage({ params }: PageProps<"/explore/[category]/[slug]">) {
  const { category, slug } = await params;
  const record = getRecord(category, slug);
  if (!record) notFound();
  const gallery = record.gallery ?? [record.image];
  const mapLocations = record.coordinates ? [{ slug: record.slug, name: record.locality, region: record.region, coordinates: record.coordinates, category: record.recordType, geologicalAge: record.geologicalAge, description: record.summary, image: record.image }] : locations.slice(0, 1);
  const relatedRecords = records.filter((item) => item.slug !== record.slug && (item.category === record.category || item.region === record.region)).slice(0, 3);
  return <main>
    <section className="record-hero"><div className="record-hero-image"><Image src={record.image.src} alt={record.image.alt} fill priority sizes="(max-width: 980px) 100vw, 63vw" /></div><div className="record-hero-copy"><Link className="eyebrow" href={`/explore/${record.category}`}>← {record.category}</Link><span className="micro-label">{record.recordType} · {record.recordId}</span><h1>{record.name}</h1><p>{record.summary}</p><span className="record-status">{record.status}</span></div></section>
    <section className="subpage-section"><div className="shell record-body"><aside className="record-sidebar"><dl><div><dt>Record ID</dt><dd>{record.recordId}</dd></div><div><dt>Category</dt><dd>{record.category}</dd></div><div><dt>Locality</dt><dd>{record.locality}</dd></div><div><dt>Region</dt><dd>{record.region}</dd></div>{record.geologicalAge && <div><dt>Geological age</dt><dd>{record.geologicalAge}</dd></div>}{record.formation && <div><dt>Formation</dt><dd>{record.formation}</dd></div>}</dl></aside><div className="prose"><span className="eyebrow">Record overview</span><h2>Reading the evidence</h2><p>{record.description}</p><p>{record.sourceNote}</p>{record.classification && <ul className="class-list">{record.classification.map((item) => <li key={item}>{item}</li>)}</ul>}<h2>Field documentation</h2><div className="gallery-grid">{gallery.map((image) => <figure className="gallery-item" key={image.src}><Image src={image.src} alt={image.alt} fill sizes="(max-width: 720px) 100vw, 45vw" /><figcaption className="gallery-caption">{image.caption}</figcaption></figure>)}</div></div></div></section>
    <section className="section map-section"><div className="shell"><p className="eyebrow light">Mapped locality</p><h2 className="map-detail-title">Evidence connected to place</h2><InteractiveMap locations={mapLocations} compact /></div></section>
    {relatedRecords.length > 0 && <section className="related-section"><div className="shell"><SectionHeading eyebrow="Related evidence" title="Keep exploring" text="Records connected by collection or regional context." /><div className="record-grid comfortable-record-grid">{relatedRecords.map((item) => <RecordCard record={item} key={item.slug} />)}</div></div></section>}
  </main>;
}
