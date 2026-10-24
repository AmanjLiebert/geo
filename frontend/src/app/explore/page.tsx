import type { Metadata } from "next";
import { ExploreRoute } from "@/components/explore-route";

export const metadata: Metadata = {
  title: "Explore collections",
  description: "Browse published geological collections and records from Geo-Kurdistan.",
};

export const dynamic = "force-dynamic";

export default async function ExplorePage({ searchParams }: PageProps<"/explore">) {
  return <ExploreRoute searchParams={await searchParams} />;
}
