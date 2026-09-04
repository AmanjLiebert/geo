import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, BookCheck, Map, ScanSearch, UsersRound } from "lucide-react";
import { PrototypeNotice } from "@/components/content-interface";
import { PageIntro } from "@/components/site-shell";

export const metadata: Metadata = { title: "About", description: "Learn about Geo-Kurdistan's mission, regional focus and teacher-led editorial review approach.", alternates: { canonical: "/about" } };

const principles = [
  { icon: Map, title: "Connected to place", text: "Records keep geological evidence connected to localities, regional landscapes and map context." },
  { icon: ScanSearch, title: "Observation before certainty", text: "Visible evidence, interpretation and unanswered questions are presented as different layers." },
  { icon: BookCheck, title: "Sources remain visible", text: "References, image credits and review status help visitors understand why a claim can be trusted." },
  { icon: UsersRound, title: "Reviewed with specialists", text: "Geology teachers and domain experts will shape terminology, classification and editorial standards." },
];

export default function AboutPage() { return <main>
  <PageIntro eyebrow="About the project" title="A public geological archive, shaped through review" description="Geo-Kurdistan is being designed as an accessible, evidence-led place to explore the geology and geological heritage of the Kurdistan Region." icon={UsersRound} code="ABT" tone="about" steps={["Understand the mission", "Review the principles"]} />
  <section className="about-mission"><div className="shell about-mission-grid"><article><p className="eyebrow">Mission</p><h2>Make regional geology easier to explore without weakening its scientific context.</h2><p>The platform connects rocks, minerals, fossils, formations, landscapes, field observations and research through clear public explanations. Beginners should be able to enter through an image or place, while knowledgeable visitors can continue into structured evidence and references.</p><p>This visitor showcase exists to validate that information architecture before backend, database and editorial systems are designed.</p></article><figure><Image src="/images/atlas/halgurd-mountain.jpg" alt="High rocky ridges at Halgurd Mountain" fill sizes="(max-width: 900px) 100vw, 46vw" /><figcaption>Halgurd Mountain · open-license regional photography</figcaption></figure></div></section>
  <section className="about-principles"><div className="shell"><p className="eyebrow">Editorial principles</p><h2>Trust is designed into the reading path</h2><div>{principles.map(({ icon: Icon, title, text }, index) => <article key={title}><span>{String(index + 1).padStart(2, "0")}</span><Icon aria-hidden="true" /><h3>{title}</h3><p>{text}</p></article>)}</div></div></section>
  <section className="about-review"><div className="shell about-review-grid"><div><p className="eyebrow">Teacher review</p><h2>What this showcase is meant to answer</h2><ol><li>Are the main geological collections understandable?</li><li>Which fields and filters matter for each kind of record?</li><li>Which relationships help visitors explore responsibly?</li><li>How should age, formation and locality terminology be presented?</li><li>What editorial and citation standards should the platform communicate?</li></ol></div><aside><PrototypeNotice title="No invented governance">The showcase does not name contributors, institutions or formal review bodies until those details are supplied and approved.</PrototypeNotice><h3>Current review labels</h3><dl><div><dt>Reviewed mock</dt><dd>Suitable for testing the visitor experience, but not a production scientific record.</dd></div><div><dt>Pending teacher review</dt><dd>Terminology, attribution or interpretation needs specialist verification.</dd></div></dl></aside></div></section>
  <section className="about-sources"><div className="shell"><div><p className="eyebrow">Sources and imagery</p><h2>Credits stay attached to the evidence</h2><p>The showcase uses original project artwork, public-domain imagery and open-license geological photography stored locally for stable review. Detailed creator and license information is maintained in the project attribution record.</p></div><Link className="reader-primary-action" href="/research">Explore research <ArrowUpRight aria-hidden="true" /></Link></div></section>
</main>; }
