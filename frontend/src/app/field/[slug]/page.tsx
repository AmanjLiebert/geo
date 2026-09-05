import type { Metadata } from "next";
import { ScanSearch } from "lucide-react";
import { UnderDevelopment } from "@/components/under-development";
import { getFieldObservation, listFieldObservations } from "@/content/repository";

export function generateStaticParams() { return listFieldObservations().map((item) => ({ slug: item.slug })); }

export async function generateMetadata({ params }: PageProps<"/field/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const item = getFieldObservation(slug);
  return {
    title: item ? `${item.title} — Under Development` : "Field observation — Under Development",
    description: "The Geo-Kurdistan field gallery is currently under development."
  };
}

export default async function FieldDetailPage({ params }: PageProps<"/field/[slug]">) {
  const { slug } = await params;
  const item = getFieldObservation(slug);
  return (
    <UnderDevelopment
      code="FLD"
      eyebrow={item ? `Field observation · ${item.type}` : "Field notebook"}
      title={item ? `${item.title} is being prepared.` : "The field notes are taking shape."}
      message={item ? `Field observations and locality notes for ${item.location} are being reviewed and verified before publication.` : "We’re preparing a better way to move through observations, photography and locality context without losing the scientific story."}
      icon={ScanSearch}
    />
  );
}

