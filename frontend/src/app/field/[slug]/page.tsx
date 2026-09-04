import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { CalendarDays, MapPinned } from "lucide-react";
import { Breadcrumbs, PrototypeNotice } from "@/components/content-interface";
import { RecordCard } from "@/components/content-cards";
import { InteractiveMap } from "@/components/interactive-map";
import { MediaGallery } from "@/components/media-gallery";
import { SectionHeading } from "@/components/site-shell";
import { getFieldObservation, getFieldStory, getRelatedRecords, listFieldObservations } from "@/content/repository";
import type { GeologicalLocation } from "@/content/types";

export function generateStaticParams() { return listFieldObservations().map((item) => ({ slug: item.slug })); }
export async function generateMetadata({ params }: PageProps<"/field/[slug]">): Promise<Metadata> { const { slug } = await params; const item = getFieldObservation(slug); return item ? { title: item.title, description: item.note, alternates: { canonical: `/field/${slug}` }, openGraph: { title: `${item.title} | Geo-Kurdistan`, description: item.note, images: [item.image.src] }, twitter: { card: "summary_large_image", title: `${item.title} | Geo-Kurdistan`, description: item.note, images: [item.image.src] } } : { title: "Field observation" }; }

export default async function FieldDetailPage({ params }: PageProps<"/field/[slug]">) {
  const { slug } = await params;
  const item = getFieldObservation(slug);
  const story = getFieldStory(slug);
  if (!item || !story) notFound();
  const related = getRelatedRecords(story.relatedRecordSlugs);
  const mapLocation: GeologicalLocation = { slug: item.slug, name: item.location, region: "Kurdistan Region", coordinates: item.coordinates, category: item.type, description: item.note, image: item.image };
  return <main>
    <section className="field-detail-hero"><div className="field-detail-image"><Image src={item.image.src} alt={item.image.alt} fill priority sizes="(max-width: 900px) 100vw, 56vw" /></div><div className="field-detail-copy"><Breadcrumbs items={[{ label: "Field", href: "/field" }, { label: item.title }]} /><p className="eyebrow">{item.type}</p><h1>{item.title}</h1><p>{story.introduction}</p><div><span><MapPinned aria-hidden="true" />{item.location}</span><span><CalendarDays aria-hidden="true" />{item.date}</span></div></div></section>
    <section className="subpage-section"><div className="shell field-story-grid"><article><p className="eyebrow">Field note</p><h2>What was recorded</h2><p className="record-lead">{item.note}</p>{story.sections.map((section) => <section key={section.title}><h2>{section.title}</h2>{section.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</section>)}<h2>Field gallery</h2><MediaGallery images={story.gallery} title={`${item.title} field gallery`} /></article><aside><PrototypeNotice title="Observation, not final interpretation">This page separates visible evidence from geological claims that still require field verification and teacher review.</PrototypeNotice><dl><div><dt>Status</dt><dd>{item.status}</dd></div><div><dt>Latitude</dt><dd>{item.coordinates[0].toFixed(3)}° N</dd></div><div><dt>Longitude</dt><dd>{item.coordinates[1].toFixed(3)}° E</dd></div></dl></aside></div></section>
    <section className="section map-section"><div className="shell"><p className="eyebrow light">Mapped observation</p><h2 className="map-detail-title">Return the note to its place</h2><InteractiveMap locations={[mapLocation]} compact /></div></section>
    {related.length > 0 && <section className="related-section"><div className="shell"><SectionHeading eyebrow="Connected evidence" title="Related archive records" text="These record links provide geological context without duplicating the field journal." /><div className="record-grid comfortable-record-grid">{related.map((record) => <RecordCard record={record} key={record.slug} />)}</div></div></section>}
  </main>;
}
