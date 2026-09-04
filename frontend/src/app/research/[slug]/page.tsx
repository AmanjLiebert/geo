import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BookOpenText, Clock3, MapPinned } from "lucide-react";
import { Breadcrumbs, PrototypeNotice, ReferenceList } from "@/components/content-interface";
import { RecordCard } from "@/components/content-cards";
import { SectionHeading } from "@/components/site-shell";
import { getRelatedRecords, getResearch, getResearchDocument, listResearch } from "@/content/repository";

export function generateStaticParams() { return listResearch().map((item) => ({ slug: item.slug })); }

export async function generateMetadata({ params }: PageProps<"/research/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const publication = getResearch(slug);
  if (!publication) return { title: "Research publication" };
  return { title: publication.title, description: publication.abstract, alternates: { canonical: `/research/${slug}` }, openGraph: { title: `${publication.title} | Geo-Kurdistan`, description: publication.abstract, images: [publication.image.src] }, twitter: { card: "summary_large_image", title: `${publication.title} | Geo-Kurdistan`, description: publication.abstract, images: [publication.image.src] } };
}

export default async function ResearchDetailPage({ params }: PageProps<"/research/[slug]">) {
  const { slug } = await params;
  const publication = getResearch(slug);
  const document = getResearchDocument(slug);
  if (!publication || !document) notFound();
  const related = getRelatedRecords(document.relatedRecordSlugs);
  return <main>
    <section className="research-detail-hero"><div className="shell"><Breadcrumbs items={[{ label: "Research", href: "/research" }, { label: publication.title }]} /><div className="research-detail-grid"><div><p className="eyebrow">{publication.type} · {publication.year}</p><h1>{publication.title}</h1><p className="research-abstract">{publication.abstract}</p><div className="research-byline"><span>{publication.authors}</span><span><MapPinned aria-hidden="true" />{publication.location}</span><span><Clock3 aria-hidden="true" />{document.readingTime}</span></div><Link className="reader-primary-action" href={`/research/${slug}/read`}><BookOpenText aria-hidden="true" /> Read research <ArrowRight aria-hidden="true" /></Link></div><figure><Image src={publication.image.src} alt={publication.image.alt} fill priority sizes="(max-width: 900px) 100vw, 42vw" /><figcaption>{publication.image.caption}</figcaption></figure></div></div></section>
    <section className="subpage-section"><div className="shell research-summary-grid"><div><p className="eyebrow">Publication outline</p><h2>What this reading covers</h2><ol className="document-outline">{document.sections.map((section, index) => <li key={section.id}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{section.title}</strong><p>{section.paragraphs[0]}</p></div></li>)}</ol></div><aside><PrototypeNotice title="Integrated reader concept">This publication is structured for comfortable online reading and intentionally has no download control.</PrototypeNotice><h3>Publication details</h3><dl><div><dt>Status</dt><dd>{publication.status}</dd></div><div><dt>Topic</dt><dd>{publication.topic}</dd></div><div><dt>Type</dt><dd>{publication.type}</dd></div><div><dt>Year</dt><dd>{publication.year}</dd></div></dl><Link href={`/research/${slug}/read`}>Open reader <ArrowRight aria-hidden="true" /></Link></aside></div></section>
    <section className="reference-section"><div className="shell"><p className="eyebrow">Sources and limits</p><h2>References</h2><ReferenceList items={document.references} /></div></section>
    {related.length > 0 && <section className="related-section"><div className="shell"><SectionHeading eyebrow="Connected archive" title="Related geological records" text="These links demonstrate possible research-to-record relationships for teacher review." /><div className="record-grid comfortable-record-grid">{related.map((record) => <RecordCard record={record} key={record.slug} />)}</div></div></section>}
  </main>;
}
