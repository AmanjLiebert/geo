import type { Metadata } from "next";
import { MapPinned } from "lucide-react";
import { UnderDevelopment } from "@/components/under-development";

export const metadata: Metadata = { title: "Geological Map — Under Development", description: "The Geo-Kurdistan geological map is currently under development." };

export default function MapsPage() {
  return <UnderDevelopment code="MAP" eyebrow="Regional map" title="We’re mapping the next layer." message="The geological map is being refined to make places, field evidence and regional context clearer to explore." icon={MapPinned} />;
}

