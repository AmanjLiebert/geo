import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpenText, Clock3 } from "lucide-react";
import { Breadcrumbs, PrototypeNotice, ReferenceList } from "@/components/content-interface";
import { getResearch, getResearchDocument, listResearch } from "@/content/repository";

export function generateStaticParams() { return listResearch().map((item) => ({ slug: item.slug })); }

export async function generateMetadata({ params }: PageProps<"/research/[slug]/read">): Promise<Metadata> {
  const { slug } = await params;
  const publication = getResearch(slug);
  return publication ? { title: `Read: ${publication.title}`, description: publication.abstract, alternates: { canonical: `/research/${slug}/read` } } : { title: "Research reader" };
}

export default async function ResearchReaderPage({ params }: PageProps<"/research/[slug]/read">) {
  const { slug } = await params;
  const publication = getResearch(slug);
  const document = getResearchDocument(slug);
  if (!publication || !document) notFound();
  return <main className="reader-page">
    <header className="reader-header"><div className="shell"><Breadcrumbs items={[{ label: "Research", href: "/research" }, { label: publication.title, href: `/research/${slug}` }, { label: "Reader" }]} /><div><span><BookOpenText aria-hidden="true" /> Read-only showcase</span><span><Clock3 aria-hidden="true" /> {document.readingTime}</span></div><h1>{publication.title}</h1><p>{publication.authors} · {publication.year}</p></div></header>
    <div className="shell reader-layout">
      <aside className="reader-toc"><strong>Contents</strong><nav aria-label="Article contents">{document.sections.map((section, index) => <a href={`#${section.id}`} key={section.id}><span>{String(index + 1).padStart(2, "0")}</span>{section.title}</a>)}<a href="#references"><span>{String(document.sections.length + 1).padStart(2, "0")}</span>References</a></nav><PrototypeNotice title="No download action">The reader demonstrates structured online access. It does not claim that browser content is impossible to copy.</PrototypeNotice></aside>
      <article className="reader-article"><section className="reader-abstract"><p className="eyebrow">Abstract</p><p>{publication.abstract}</p></section>{document.sections.map((section, index) => <section id={section.id} key={section.id}><span className="reader-section-number">Section {String(index + 1).padStart(2, "0")}</span><h2>{section.title}</h2>{section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}{section.figure && <figure><div><Image src={section.figure.src} alt={section.figure.alt} fill sizes="(max-width: 800px) 100vw, 720px" /></div><figcaption>{section.figure.caption}<small>{section.figure.credit}</small></figcaption></figure>}<nav className="reader-section-nav" aria-label={`Navigate from ${section.title}`}>{index > 0 ? <a href={`#${document.sections[index - 1].id}`}><ArrowLeft aria-hidden="true" /> Previous</a> : <span />}{index < document.sections.length - 1 ? <a href={`#${document.sections[index + 1].id}`}>Next <ArrowRight aria-hidden="true" /></a> : <a href="#references">References <ArrowRight aria-hidden="true" /></a>}</nav></section>)}<section id="references"><span className="reader-section-number">Sources</span><h2>References and editorial limits</h2><ReferenceList items={document.references} /></section></article>
    </div>
  </main>;
}
