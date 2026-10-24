import type { Metadata } from "next";
import { ExploreRoute } from "@/components/explore-route";
import { getPublicRecord, listPublicRecords } from "@/lib/public-scientific-api";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/explore/[category]/[slug]">): Promise<Metadata> {
  const { category, slug } = await params;
  const summary = (await listPublicRecords(category)).find(
    (record) => (record.slug ?? record.publicId) === slug,
  );
  if (!summary) return { title: "Geological record" };
  const record = await getPublicRecord(summary.publicId);
  const description = record.summary ?? record.description ?? "Published geological record.";
  return {
    title: record.title,
    description,
    alternates: { canonical: `/explore/${category}/${slug}` },
    openGraph: {
      title: `${record.title} | Geo-Kurdistan`,
      description,
      images: record.image ? [record.image.viewEndpoint] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: `${record.title} | Geo-Kurdistan`,
      description,
      images: record.image ? [record.image.viewEndpoint] : [],
    },
  };
}

export default async function RecordPage({
  params,
  searchParams,
}: PageProps<"/explore/[category]/[slug]">) {
  const { category, slug } = await params;
  return (
    <ExploreRoute
      selectedCategorySlug={category}
      selectedRecordSlug={slug}
      searchParams={await searchParams}
    />
  );
}
