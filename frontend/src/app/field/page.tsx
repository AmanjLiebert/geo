import type { Metadata } from "next";
import { ScanSearch } from "lucide-react";
import { UnderDevelopment } from "@/components/under-development";

export const metadata: Metadata = { title: "Field Gallery — Under Development", description: "The Geo-Kurdistan field gallery is currently under development." };

export default function FieldPage() {
  return <UnderDevelopment code="FLD" eyebrow="Field notebook" title="The field notes are taking shape." message="We’re preparing a better way to move through observations, photography and locality context without losing the scientific story." icon={ScanSearch} />;
}

