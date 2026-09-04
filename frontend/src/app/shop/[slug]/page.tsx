import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, BadgeInfo, ShoppingBag } from "lucide-react";
import { Breadcrumbs, PrototypeNotice } from "@/components/content-interface";
import { MediaGallery } from "@/components/media-gallery";
import { getProduct, listProducts } from "@/content/repository";

export function generateStaticParams() { return listProducts().map((product) => ({ slug: product.slug })); }
export async function generateMetadata({ params }: PageProps<"/shop/[slug]">): Promise<Metadata> { const { slug } = await params; const product = getProduct(slug); return product ? { title: product.name, description: product.summary, alternates: { canonical: `/shop/${slug}` }, openGraph: { title: `${product.name} | Geo-Kurdistan`, description: product.summary, images: [product.image.src] }, twitter: { card: "summary_large_image", title: `${product.name} | Geo-Kurdistan`, description: product.summary, images: [product.image.src] } } : { title: "Study object" }; }

export default async function ProductPage({ params }: PageProps<"/shop/[slug]">) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) notFound();
  const related = listProducts().filter((item) => item.slug !== slug).slice(0, 3);
  return <main><section className="product-detail"><div className="shell"><Breadcrumbs items={[{ label: "Shop", href: "/shop" }, { label: product.name }]} /><div className="product-detail-grid"><div><Image src={product.image.src} alt={product.image.alt} fill priority sizes="(max-width: 900px) 100vw, 52vw" /></div><article><p className="eyebrow"><ShoppingBag aria-hidden="true" />{product.category}</p><h1>{product.name}</h1><p className="product-price">{product.price}</p><p className="product-summary">{product.summary}</p><PrototypeNotice title="Purchasing is unavailable">This is a visitor-showcase product concept. No cart, checkout, payment or reservation is created.</PrototypeNotice><dl><div><dt>Concept description</dt><dd>{product.description}</dd></div><div><dt>Educational purpose</dt><dd>{product.purpose}</dd></div></dl><Link className="reader-primary-action" href="/about"><BadgeInfo aria-hidden="true" /> About the showcase</Link></article></div></div></section>
    <section className="subpage-section"><div className="shell"><p className="eyebrow">Object gallery</p><h2>Material and learning context</h2><MediaGallery images={product.gallery} title={`${product.name} gallery`} /></div></section>
    <section className="related-section"><div className="shell"><p className="eyebrow">Browse next</p><h2>Related study objects</h2><div className="compact-product-grid">{related.map((item) => <Link href={`/shop/${item.slug}`} key={item.slug}><div><Image src={item.image.src} alt="" fill sizes="220px" /></div><span>{item.category}</span><h3>{item.name}</h3><p>{item.price}</p><ArrowUpRight aria-hidden="true" /></Link>)}</div></div></section>
  </main>;
}
