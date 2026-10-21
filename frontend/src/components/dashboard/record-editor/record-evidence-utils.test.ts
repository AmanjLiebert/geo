import { describe, expect, it } from "vitest";
import {
  formatSourceType,
  getSourceTypeConfig,
  inferEvidenceKind,
  normalizeHttpsUrl,
  parseOptionalPublicationYear,
} from "./record-evidence-utils";

describe("record evidence helpers", () => {
  it("provides source-specific plain-language labels", () => {
    expect(getSourceTypeConfig("journal").publicationLabel).toBe(
      "Journal name",
    );
    expect(getSourceTypeConfig("book").identifierLabel).toContain("ISBN");
    expect(getSourceTypeConfig("website").linkRequired).toBe(true);
    expect(formatSourceType("map")).toBe("Geological map");
  });

  it("infers internal evidence kinds without asking the teacher", () => {
    expect(inferEvidenceKind("map")).toBe("map");
    expect(inferEvidenceKind("dataset")).toBe("dataset");
    expect(inferEvidenceKind("journal")).toBe("published_source");
  });

  it("normalizes simple web addresses and rejects unsafe protocols", () => {
    expect(normalizeHttpsUrl("example.org/source")).toBe(
      "https://example.org/source",
    );
    expect(normalizeHttpsUrl("https://example.org/source")).toBe(
      "https://example.org/source",
    );
    expect(normalizeHttpsUrl("http://example.org/source")).toBeUndefined();
    expect(normalizeHttpsUrl("javascript:alert(1)")).toBeUndefined();
  });

  it("parses optional bounded publication years", () => {
    expect(parseOptionalPublicationYear("")).toEqual({});
    expect(parseOptionalPublicationYear("2026")).toEqual({ value: 2026 });
    expect(parseOptionalPublicationYear("20x6")).toEqual({
      error: "Enter a four-digit publication year.",
    });
    expect(parseOptionalPublicationYear("1499")).toEqual({
      error: "Publication year must be between 1500 and 2200.",
    });
  });
});
