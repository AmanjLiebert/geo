import type { Metadata } from "next";
import { ShoppingBag } from "lucide-react";
import { UnderDevelopment } from "@/components/under-development";
import { getProduct, listProducts } from "@/content/repository";

export function generateStaticParams() { return listProducts().map((product) => ({ slug: product.slug })); }

export async function generateMetadata({ params }: PageProps<"/shop/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = getProduct(slug);
  return {
    title: product ? `${product.name} — Under Development` : "Study Shop — Under Development",
    description: "The Geo-Kurdistan study shop is currently under development."
  };
}

export default async function ProductPage({ params }: PageProps<"/shop/[slug]">) {
  const { slug } = await params;
  const product = getProduct(slug);
  return (
    <UnderDevelopment
      code="SHP"
      eyebrow={product ? `Study object · ${product.category}` : "Study shop"}
      title={product ? `${product.name} is in preparation.` : "Good things are being unearthed."}
      message={product ? `${product.name} (${product.price}) is currently being catalogued and verified for the educational study archive.` : "We’re designing a clear, trustworthy place for geological learning objects, field tools and educational prints."}
      icon={ShoppingBag}
    />
  );
}

