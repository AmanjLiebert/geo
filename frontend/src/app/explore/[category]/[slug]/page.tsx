import type { Metadata } from "next";
import { ExploreRoute } from "@/components/explore-route";
import { getRecordBySlug, listRecords } from "@/content/repository";

export function generateStaticParams() {
  return listRecords().map((record) => ({ category: record.category, slug: record.slug }));
}

export async function generateMetadata({ params }: PageProps<"/explore/[category]/[slug]">): Promise<Metadata> {
  const { category, slug } = await params;
  const record = getRecordBySlug(category, slug);
  if (!record) return { title: "Geological record" };
  return {
    title: record.name,
    description: record.summary,
    alternates: { canonical: `/explore/${record.category}/${record.slug}` },
    openGraph: { title: `${record.name} | Geo-Kurdistan`, description: record.summary, images: [record.image.src] },
    twitter: { card: "summary_large_image", title: `${record.name} | Geo-Kurdistan`, description: record.summary, images: [record.image.src] },
  };
}

export default async function RecordPage({ params, searchParams }: PageProps<"/explore/[category]/[slug]">) {
  const { category, slug } = await params;
  return <ExploreRoute selectedCategorySlug={category} selectedRecordSlug={slug} searchParams={await searchParams} />;
}
