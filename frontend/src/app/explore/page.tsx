import type { Metadata } from "next";
import { ExploreRoute } from "@/components/explore-route";

export const metadata: Metadata = {
  title: "Explore collections",
  description: "Browse every geological collection and record in the Geo-Kurdistan showcase.",
};

export default async function ExplorePage({ searchParams }: PageProps<"/explore">) {
  return <ExploreRoute searchParams={await searchParams} />;
}
