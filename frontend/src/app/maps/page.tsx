import type { Metadata } from "next";
import { MapPinned } from "lucide-react";
import { InteractiveMap } from "@/components/interactive-map";
import { PageIntro } from "@/components/site-shell";
import { listLocations } from "@/content/repository";

export const metadata: Metadata = { title: "Geological Map", description: "Explore selected geological localities across the Kurdistan Region." };
export default async function MapsPage({ searchParams }: PageProps<"/maps">) { const query = await searchParams; const place = typeof query.place === "string" ? query.place : undefined; return <main><PageIntro eyebrow="Regional explorer" title="Geology, connected to place" description="Select a locality to move between the geographic base map, field evidence, geological context and related records." icon={MapPinned} code="MAP" tone="map" steps={["Choose a locality", "Connect place to evidence"]} /><section className="section map-section"><div className="shell"><InteractiveMap locations={listLocations()} initialSlug={place} /></div></section></main>; }
