import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("visitor record reading path", () => {
  it("connects meaning, key facts, and sources without exposing system terminology", () => {
    const source = readFileSync(
      new URL("./explore-browser.tsx", import.meta.url),
      "utf8",
    );
    const meaning = source.indexOf("What it describes");
    const facts = source.indexOf("At a glance");
    const sources = source.indexOf("Evidence used for this record");

    expect(meaning).toBeGreaterThan(0);
    expect(facts).toBeGreaterThan(meaning);
    expect(sources).toBeGreaterThan(facts);
    expect(source).toContain("catalog-record-breadcrumb");
    expect(source).toContain("View sources");
    expect(source).not.toContain("Structured evidence");
    expect(source).not.toContain("Reading the evidence");
  });
});
