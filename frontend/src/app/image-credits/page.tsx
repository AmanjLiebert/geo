import type { Metadata } from "next";
import { PageIntro } from "@/components/site-shell";
import credits from "@/content/category-image-credits.json";

export const metadata: Metadata = { title: "Image credits" };

export default function ImageCreditsPage() {
  return <>
    <PageIntro eyebrow="Image credits" title="Image credits" description="Sources and licences for the main collection images." />
    <section className="shell" style={{ paddingBlock: "2rem" }} aria-label="Collection image credits">
      <p>Images are resized for display and may be cropped in collection cards.</p>
      {credits.map((image) => <article key={image.slug} style={{ marginBlock: "2rem" }}>
        <h2>{image.slug.replaceAll("-", " ")}</h2>
        <p><a href={image.source}>{image.file.replace(/\.jpg$/, "")}</a> by {image.credit}.</p>
        <p>Licensed under <a href={image.licenceUrl}>{image.licence}</a>.</p>
      </article>)}
    </section>
  </>;
}
