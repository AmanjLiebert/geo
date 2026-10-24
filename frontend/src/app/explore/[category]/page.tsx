import type { Metadata } from "next";
import { ExploreRoute } from "@/components/explore-route";
import { listPublicCategories } from "@/lib/public-scientific-api";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/explore/[category]">): Promise<Metadata> {
  const { category: slug } = await params;
  const category = (await listPublicCategories()).find((item) => item.slug === slug);
  if (!category) return { title: "Explore" };
  const description = category.summary ?? category.description ?? "Published geological collection.";
  return {
    title: category.name,
    description,
    alternates: { canonical: `/explore/${category.slug}` },
    openGraph: {
      title: `${category.name} | Geo-Kurdistan`,
      description,
      images: category.image ? [category.image.viewEndpoint] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: `${category.name} | Geo-Kurdistan`,
      description,
      images: category.image ? [category.image.viewEndpoint] : [],
    },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: PageProps<"/explore/[category]">) {
  const { category } = await params;
  return (
    <ExploreRoute
      selectedCategorySlug={category}
      searchParams={await searchParams}
    />
  );
}
