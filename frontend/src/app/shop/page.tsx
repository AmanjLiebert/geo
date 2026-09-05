import type { Metadata } from "next";
import { ShoppingBag } from "lucide-react";
import { UnderDevelopment } from "@/components/under-development";

export const metadata: Metadata = { title: "Study Shop — Under Development", description: "The Geo-Kurdistan study shop is currently under development." };

export default function ShopPage() {
  return <UnderDevelopment code="SHP" eyebrow="Study shop" title="Good things are being unearthed." message="We’re designing a clear, trustworthy place for geological learning objects, field tools and educational prints." icon={ShoppingBag} />;
}

