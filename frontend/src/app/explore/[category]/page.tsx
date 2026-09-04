import type { Metadata } from "next";
import { ExploreRoute } from "@/components/explore-route";
import { getCategoryBySlug, listCategories } from "@/content/repository";

export function generateStaticParams() {
  return listCategories().map((category) => ({ category: category.slug }));
}

export async function generateMetadata({ params }: PageProps<"/explore/[category]">): Promise<Metadata> {
  const { category: slug } = await params;
  const category = getCategoryBySlug(slug);
  if (!category) return { title: "Explore" };
  return {
    title: category.name,
    description: category.description,
    alternates: { canonical: `/explore/${category.slug}` },
    openGraph: { title: `${category.name} | Geo-Kurdistan`, description: category.description, images: [category.image.src] },
    twitter: { card: "summary_large_image", title: `${category.name} | Geo-Kurdistan`, description: category.description, images: [category.image.src] },
  };
}

export default async function CategoryPage({ params, searchParams }: PageProps<"/explore/[category]">) {
  const { category } = await params;
  return <ExploreRoute selectedCategorySlug={category} searchParams={await searchParams} />;
}
