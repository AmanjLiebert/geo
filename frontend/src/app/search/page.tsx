import type { Metadata } from "next";
import { SearchBrowser } from "@/components/search-browser";
import { PageIntro } from "@/components/site-shell";

export const metadata: Metadata = { title: "Search", description: "Search geological records, locations, research and field observations across Geo-Kurdistan.", alternates: { canonical: "/search" } };
export default function SearchPage() {
  return <main><PageIntro eyebrow="Global discovery" title="Search the geological archive" description="Find records by name, locality, geological age or formation, then narrow the result to the kind of evidence you need." />
    <SearchBrowser />
  </main>;
}
