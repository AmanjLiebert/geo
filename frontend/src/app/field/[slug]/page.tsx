import type { Metadata } from "next";
import { ScanSearch } from "lucide-react";
import { UnderDevelopment } from "@/components/under-development";
import { listFieldObservations } from "@/content/repository";

export function generateStaticParams() { return listFieldObservations().map((item) => ({ slug: item.slug })); }

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Field Gallery — Under Development",
    description: "The Geo-Kurdistan field gallery is currently under development.",
  };
}

export default function FieldDetailPage() {
  return (
    <UnderDevelopment
      code="FLD"
      eyebrow="Field notebook"
      title="The field notes are taking shape."
      message="We’re preparing a better way to move through observations, photography and locality context without losing the scientific story."
      icon={ScanSearch}
    />
  );
}

