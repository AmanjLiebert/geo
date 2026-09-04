import type { Metadata } from "next";
import { ScanSearch } from "lucide-react";
import { FieldCard } from "@/components/content-cards";
import { EmptyState, FilterChips, PrototypeNotice, QueryForm, ResultsHeader } from "@/components/content-interface";
import { PageIntro } from "@/components/site-shell";
import { listFieldObservations } from "@/content/repository";

export const metadata: Metadata = { title: "Field Gallery", description: "Field observations, geological photography and locality notes from the Geo-Kurdistan showcase.", alternates: { canonical: "/field" } };

export default async function FieldPage({ searchParams }: PageProps<"/field">) {
  const query = await searchParams;
  const q = typeof query.q === "string" ? query.q : "";
  const type = typeof query.type === "string" ? query.type : "";
  const allItems = listFieldObservations();
  const items = listFieldObservations({ q, type });
  const types = Array.from(new Set(allItems.map((item) => item.type)));
  return <main>
    <PageIntro eyebrow="Field notebook" title="Observe first. Interpret carefully." description="Explore place-led observations that keep visible evidence, field questions and provisional interpretation in their proper order." icon={ScanSearch} code="FLD" tone="field" steps={["Browse observations", "Inspect local context"]} />
    <section className="catalogue-controls"><div className="shell"><QueryForm action="/field" value={q} placeholder="Search observation, locality or process" hidden={{ type }} /><FilterChips label="Observation type" basePath="/field" values={types} active={type} params={Object.fromEntries(Object.entries({ q, type }).filter(([, value]) => value))} paramKey="type" /></div></section>
    <section className="subpage-section"><div className="shell"><ResultsHeader count={items.length} label={items.length === 1 ? "observation" : "observations"} resetHref="/field" filtered={Boolean(q || type)} /><PrototypeNotice title="Field interpretation in review">Coordinates and observations are provided for information-architecture review; detailed scientific interpretation remains provisional.</PrototypeNotice>{items.length > 0 ? <div className="field-gallery">{items.map((item, index) => <FieldCard item={item} large={index === 0 || index === 3} key={item.slug} />)}</div> : <EmptyState title="No matching field observations" text="Try a broader locality or clear the observation filter." resetHref="/field" />}</div></section>
  </main>;
}
