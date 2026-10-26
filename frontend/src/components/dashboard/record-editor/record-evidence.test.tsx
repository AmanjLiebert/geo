import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RecordEvidence } from "./record-evidence";
import type { TemplateField } from "@/lib/dashboard-api";

const recordId = "11111111-1111-4111-8111-111111111111";

describe("RecordEvidence component", () => {
  it("renders the guided new-source path without internal evidence terminology", () => {
    const fields = [
      {
        id: "22222222-2222-4222-8222-222222222222",
        stableKey: "formation_age",
        label: "Formation age",
        dataType: "text",
        required: false,
        status: "active",
      },
    ] as TemplateField[];

    const html = renderToStaticMarkup(
      createElement(RecordEvidence, { recordId, fields }),
    );

    expect(html).toContain("Sources and evidence");
    expect(html).toContain("Add a new source");
    expect(html).toContain("Use a saved source");
    expect(html).toContain("What kind of source is it?");
    expect(html).toContain("Journal article");
    expect(html).toContain("Website or online image");
    expect(html).toContain("Article title");
    expect(html).toContain("Author or authors");
    expect(html).toContain("Journal name");
    expect(html).toContain("Web address (optional)");
    expect(html).toContain("DOI or article identifier (optional)");
    expect(html).toContain("What does this source support?");
    expect(html).toContain("The whole record");
    expect(html).toContain("Only the field: Formation age");
    expect(html).toContain("Save and connect source");
    expect(html).not.toContain("Evidence type");
    expect(html).not.toContain("published_source");
  });

  it("hides source mutation controls in read-only mode", () => {
    const html = renderToStaticMarkup(
      createElement(RecordEvidence, { recordId, fields: [], readOnly: true }),
    );

    expect(html).toContain("Sources connected to this record");
    expect(html).not.toContain("Add a new source");
    expect(html).not.toContain("Use a saved source");
    expect(html).not.toContain("Save and connect source");
  });
});
