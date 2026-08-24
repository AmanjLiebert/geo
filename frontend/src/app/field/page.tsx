import type { Metadata } from "next";
import { FieldCard } from "@/components/content-cards";
import { PageIntro } from "@/components/site-shell";
import { fieldObservations } from "@/content/mock-data";

export const metadata: Metadata = { title: "Field Gallery", description: "Field observations, geological photography and locality notes from the Geo-Kurdistan showcase." };
export default function FieldPage() { return <main><PageIntro eyebrow="Field notebook" title="Observe first. Interpret carefully." description="A location-led gallery records what can be seen, where it was documented and which questions should follow." /><section className="subpage-section"><div className="shell field-gallery">{fieldObservations.map((item, index) => <FieldCard item={item} large={index === 0 || index === 3} key={item.slug} />)}</div></section></main>; }
