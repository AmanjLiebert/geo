import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ResearchBrowser } from "@/components/research-browser";
import { getResearchLibrary } from "@/content/research-library";
import { getResearch, listResearch } from "@/content/repository";
import { parseResearchView } from "@/lib/research-view";

export function generateStaticParams() { return listResearch().map((item) => ({ slug: item.slug })); }

export async function generateMetadata({ params }: PageProps<"/research/[slug]/read">): Promise<Metadata> {
  const { slug } = await params;
  const publication = getResearch(slug);
  return publication ? { title: `Read: ${publication.title}`, description: publication.abstract, alternates: { canonical: `/research/${slug}/read` } } : { title: "Research reader" };
}

export default async function ResearchReaderPage({ params }: PageProps<"/research/[slug]/read">) {
  const { slug } = await params;
  const entries = getResearchLibrary();
  if (!entries.some(({ publication }) => publication.slug === slug)) notFound();
  return <ResearchBrowser entries={entries} initialView={parseResearchView(`/research/${slug}/read`, new URLSearchParams())} />;
}
