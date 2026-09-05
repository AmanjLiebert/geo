import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ResearchBrowser } from "@/components/research-browser";
import { getResearchLibrary } from "@/content/research-library";
import { getResearch, listResearch } from "@/content/repository";
import { parseResearchView, researchSearchParams } from "@/lib/research-view";

export function generateStaticParams() { return listResearch().map((item) => ({ slug: item.slug })); }

export async function generateMetadata({ params }: PageProps<"/research/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const publication = getResearch(slug);
  if (!publication) return { title: "Research publication" };
  return { title: publication.title, description: publication.abstract, alternates: { canonical: `/research/${slug}` }, openGraph: { title: `${publication.title} | Geo-Kurdistan`, description: publication.abstract, images: [publication.image.src] }, twitter: { card: "summary_large_image", title: `${publication.title} | Geo-Kurdistan`, description: publication.abstract, images: [publication.image.src] } };
}

export default async function ResearchDetailPage({ params, searchParams }: PageProps<"/research/[slug]">) {
  const { slug } = await params;
  const entries = getResearchLibrary();
  if (!entries.some(({ publication }) => publication.slug === slug)) notFound();
  return <ResearchBrowser entries={entries} initialView={parseResearchView(`/research/${slug}`, researchSearchParams(await searchParams))} />;
}
