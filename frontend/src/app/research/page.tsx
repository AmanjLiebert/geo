import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, BookOpen, BookOpenText, MapPinned } from "lucide-react";
import { EmptyState, FilterChips, PrototypeNotice, QueryForm, ResultsHeader } from "@/components/content-interface";
import { PageIntro } from "@/components/site-shell";
import { listResearch } from "@/content/repository";

export const metadata: Metadata = {
  title: "Research",
  description: "Explore geological studies, methods and public-science reading from Geo-Kurdistan.",
  alternates: { canonical: "/research" },
};

export default async function ResearchPage({ searchParams }: PageProps<"/research">) {
  const query = await searchParams;
  const q = typeof query.q === "string" ? query.q : "";
  const type = typeof query.type === "string" ? query.type : "";
  const allResearch = listResearch();
  const publications = listResearch({ q, type });
  const types = Array.from(new Set(allResearch.map((item) => item.type)));
  const filtered = Boolean(q || type);
  return <main>
    <PageIntro eyebrow="Research library" title="Evidence, interpretation and public reading" description="Browse publication summaries, follow their connections to field localities and read complete showcase articles in a focused online environment." icon={BookOpenText} code="RSC" tone="research" steps={["Find a publication", "Read its evidence"]} />
    <section className="catalogue-controls"><div className="shell"><QueryForm action="/research" value={q} placeholder="Search title, author, topic or place" hidden={{ type }} /><FilterChips label="Publication type" basePath="/research" values={types} active={type} params={Object.fromEntries(Object.entries({ q, type }).filter(([, value]) => value))} paramKey="type" /></div></section>
    <section id="publications" className="subpage-section"><div className="shell">
      <ResultsHeader count={publications.length} label={publications.length === 1 ? "publication" : "publications"} resetHref="/research" filtered={filtered} />
      <PrototypeNotice title="Read-only research showcase">These structured articles demonstrate an online reading experience. They are mock editorial content, not downloadable publications.</PrototypeNotice>
      {publications.length > 0 ? <div className="research-cards">{publications.map((item, index) => <Link className="research-card" href={`/research/${item.slug}`} key={item.slug}>
        <div className="research-card-image"><Image src={item.image.src} alt={item.image.alt} fill sizes="(max-width: 720px) 100vw, 33vw" /><span>{String(index + 1).padStart(2, "0")}</span><b>{item.topic}</b></div>
        <div className="research-card-copy"><div className="research-card-meta"><span><BookOpen aria-hidden="true" />{item.type}</span><span>{item.year}</span></div><h2>{item.title}</h2><p>{item.abstract}</p><small>{item.authors}</small><div className="research-card-foot"><span><MapPinned aria-hidden="true" />{item.location}</span><b aria-label="Open publication"><ArrowUpRight aria-hidden="true" /></b></div></div>
      </Link>)}</div> : <EmptyState title="No matching publications" text="Try a broader keyword or view all publication types." resetHref="/research" />}
    </div></section>
  </main>;
}
