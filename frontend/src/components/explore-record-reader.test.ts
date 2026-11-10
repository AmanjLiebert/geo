import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("visitor record reading path", () => {
  it("presents the public record as a complete scientific dossier", () => {
    const source = readFileSync(
      new URL("./explore-browser.tsx", import.meta.url),
      "utf8",
    );
    const identity = source.indexOf("catalog-record-identity");
    const image = source.indexOf("catalog-record-primary-media");
    const overview = source.indexOf("About this record");
    const facts = source.indexOf("Scientific data");
    const media = source.indexOf("Images and files");
    const sources = source.indexOf("Sources and evidence");

    expect(identity).toBeGreaterThan(0);
    expect(image).toBeGreaterThan(identity);
    expect(overview).toBeGreaterThan(image);
    expect(facts).toBeGreaterThan(overview);
    expect(media).toBeGreaterThan(facts);
    expect(sources).toBeGreaterThan(media);
    expect(source).toContain("catalog-record-dossier-section");
    expect(source).toContain("detail.media");
    expect(source).toContain("detail.relatedRecords");
    expect(source).toContain("catalog-record-sequence");
    expect(source).toContain("Previous record");
    expect(source).toContain("Next record");
    expect(source).toContain("total > 1");
    expect(source).not.toContain("catalog-record-hero");
    expect(source).not.toContain("homeStyles.leadUpdate");
  });

  it("keeps record evidence in uncropped square frames", () => {
    const styles = readFileSync(
      new URL("../app/globals.css", import.meta.url),
      "utf8",
    );

    expect(styles).toMatch(
      /\.catalog-record-primary-media > div \{[\s\S]*?aspect-ratio:\s*1;/,
    );
    expect(styles).toContain(
      ".catalog-record-primary-media > div > img,",
    );
    expect(styles).toContain("object-fit: contain;");
    expect(styles).toMatch(
      /\.catalog-record-media-square \{[\s\S]*?aspect-ratio:\s*1;/,
    );
  });
});
