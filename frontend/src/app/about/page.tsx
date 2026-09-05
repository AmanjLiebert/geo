import type { Metadata } from "next";
import { UsersRound } from "lucide-react";
import { UnderDevelopment } from "@/components/under-development";

export const metadata: Metadata = { title: "About — Under Development", description: "The Geo-Kurdistan project story is currently under development." };

export default function AboutPage() {
  return <UnderDevelopment code="ABT" eyebrow="About Geo–Kurdistan" title="Our story needs a little more time." message="We’re shaping this page to clearly explain the project’s purpose, scientific principles and teacher-led review process." icon={UsersRound} />;
}

