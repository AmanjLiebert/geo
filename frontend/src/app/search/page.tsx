import type { Metadata } from "next";
import Link from "@/components/safe-link";
import { Search, SlidersHorizontal } from "lucide-react";
import { EmptyState, FilterChips, ResultsHeader, SearchResultCard } from "@/components/content-interface";
import { PageIntro } from "@/components/site-shell";
import { searchContent } from "@/content/repository";

export const metadata: Metadata = { title: "Search", description: "Search geological records, locations, research and field observations across Geo-Kurdistan.", alternates: { canonical: "/search" } };
const types = [{ value: "record", label: "Geological records" }, { value: "location", label: "Locations" }, { value: "research", label: "Research" }, { value: "field", label: "Field notes" }];

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const query = await searchParams;
  const read = (key: string) => typeof query[key] === "string" ? query[key] as string : "";
  const filters = { q: read("q"), type: read("type"), region: read("region"), age: read("age"), formation: read("formation") };
  const results = searchContent(filters);
  const filtered = Boolean(filters.q || filters.type || filters.region || filters.age || filters.formation);
  const grouped = types.map((type) => ({ ...type, results: results.filter((result) => result.kind === type.value) })).filter((group) => group.results.length > 0);
  return <main><PageIntro eyebrow="Global discovery" title="Search the geological archive" description="Find records by name, locality, geological age or formation, then narrow the result to the kind of evidence you need." />
    <section className="search-workspace"><div className="shell">
      <form className="global-search-form" action="/search"><label htmlFor="global-search">Name, place, geological age or formation</label><div><Search aria-hidden="true" /><input id="global-search" name="q" defaultValue={filters.q} placeholder="Try Rawandiz, Cretaceous, calcite…" /><button type="submit">Search</button></div>{filters.type && <input type="hidden" name="type" value={filters.type} />}</form>
      <div className="search-refinements"><span><SlidersHorizontal aria-hidden="true" />Refine results</span><FilterChips label="Content type" basePath="/search" values={types.map((type) => type.value)} active={filters.type} params={Object.fromEntries(Object.entries(filters).filter(([, value]) => value))} paramKey="type" /><form action="/search"><input type="hidden" name="q" value={filters.q} /><input type="hidden" name="type" value={filters.type} /><label>Region<input name="region" defaultValue={filters.region} placeholder="Erbil Governorate" /></label><label>Geological age<input name="age" defaultValue={filters.age} placeholder="Cretaceous" /></label><label>Formation<input name="formation" defaultValue={filters.formation} placeholder="Formation name" /></label><button type="submit">Apply context</button></form></div>
    </div></section>
    <section className="subpage-section"><div className="shell">{filters.q ? <><ResultsHeader count={results.length} label={results.length === 1 ? "result" : "results"} resetHref="/search" filtered={filtered} />{grouped.length > 0 ? <div className="search-groups">{grouped.map((group) => <section key={group.value}><header><span>{group.label}</span><strong>{group.results.length}</strong></header><div>{group.results.map((result) => <SearchResultCard result={result} key={`${result.kind}-${result.slug}`} />)}</div></section>)}</div> : <EmptyState title="No matching evidence" text="Try a shorter term, remove a contextual filter, or search a nearby locality." resetHref="/search" />}</> : <div className="search-start"><Search aria-hidden="true" /><h2>Start with a geological clue</h2><p>Search a name, location, geological age or formation. Example pathways can help you begin.</p><div><Link href="/search?q=Rawandiz">Rawandiz</Link><Link href="/search?q=calcite">Calcite</Link><Link href="/search?q=Cretaceous">Cretaceous</Link><Link href="/search?q=fold">Fold</Link></div></div>}</div></section>
  </main>;
}
