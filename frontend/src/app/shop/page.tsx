import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, ShoppingBag } from "lucide-react";
import { EmptyState, FilterChips, PrototypeNotice, QueryForm, ResultsHeader } from "@/components/content-interface";
import { PageIntro } from "@/components/site-shell";
import { listProducts } from "@/content/repository";

export const metadata: Metadata = { title: "Study Shop", description: "Browse a lightweight showcase of geological learning objects and field materials.", alternates: { canonical: "/shop" } };

export default async function ShopPage({ searchParams }: PageProps<"/shop">) {
  const query = await searchParams;
  const q = typeof query.q === "string" ? query.q : "";
  const category = typeof query.category === "string" ? query.category : "";
  const allProducts = listProducts();
  const products = listProducts({ q, category });
  const categories = Array.from(new Set(allProducts.map((product) => product.category)));
  return <main><PageIntro eyebrow="Study objects" title="Geology beyond the screen" description="A restrained browse-only concept for educational objects, field tools and geological prints that could support learning." icon={ShoppingBag} code="SHP" tone="shop" steps={["Browse study objects", "View object details"]} />
    <section className="catalogue-controls"><div className="shell"><QueryForm action="/shop" value={q} placeholder="Search study objects" hidden={{ category }} /><FilterChips label="Object type" basePath="/shop" values={categories} active={category} params={Object.fromEntries(Object.entries({ q, category }).filter(([, value]) => value))} paramKey="category" /></div></section>
    <section className="subpage-section"><div className="shell"><ResultsHeader count={products.length} label={products.length === 1 ? "study object" : "study objects"} resetHref="/shop" filtered={Boolean(q || category)} /><PrototypeNotice title="Browse-only shop concept">Prices and products are realistic mock content. There is no cart, checkout, payment, order, inventory or customer account.</PrototypeNotice>{products.length > 0 ? <div className="shop-grid">{products.map((product, index) => <Link href={`/shop/${product.slug}`} className="shop-card" key={product.slug}><div><Image src={product.image.src} alt={product.image.alt} fill sizes="(max-width: 720px) 100vw, 33vw" /><span>{String(index + 1).padStart(2, "0")}</span></div><article><p><ShoppingBag aria-hidden="true" />{product.category}</p><h2>{product.name}</h2><p>{product.summary}</p><footer><strong>{product.price}</strong><span>View object <ArrowUpRight aria-hidden="true" /></span></footer></article></Link>)}</div> : <EmptyState title="No matching study objects" text="Try a broader keyword or clear the object-type filter." resetHref="/shop" />}</div></section>
  </main>;
}
