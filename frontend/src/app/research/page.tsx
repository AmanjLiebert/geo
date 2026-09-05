import type { Metadata } from "next";
import { ResearchBrowser } from "@/components/research-browser";
import { getResearchLibrary } from "@/content/research-library";
import { parseResearchView, researchSearchParams } from "@/lib/research-view";

export const metadata: Metadata = {
  title: "Research",
  description: "Explore geological studies, methods and public-science reading from Geo-Kurdistan.",
  alternates: { canonical: "/research" },
};

export default async function ResearchPage({ searchParams }: PageProps<"/research">) {
  return <ResearchBrowser entries={getResearchLibrary()} initialView={parseResearchView("/research", researchSearchParams(await searchParams))} />;
}
