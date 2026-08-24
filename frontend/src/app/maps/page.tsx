import type { Metadata } from "next";
import { InteractiveMap } from "@/components/interactive-map";
import { PageIntro } from "@/components/site-shell";
import { locations } from "@/content/mock-data";

export const metadata: Metadata = { title: "Geological Map", description: "Explore selected geological localities across the Kurdistan Region." };
export default function MapsPage() { return <main><PageIntro eyebrow="Regional explorer" title="Geology, connected to place" description="Select a locality to move between the geographic base map, field evidence, geological context and related records." /><section className="section map-section"><div className="shell"><InteractiveMap locations={locations} /></div></section></main>; }
