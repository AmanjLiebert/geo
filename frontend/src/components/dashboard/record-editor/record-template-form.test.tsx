import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ActiveScientificTemplate } from "@/lib/dashboard-api";
import { RecordTemplateForm } from "./record-template-form";

const template = {
  id: "template-1",
  name: "Rock specimen",
  version: { id: "version-1", number: 1, status: "active" },
  fields: [
    {
      id: "required-field",
      stableKey: "rock_name",
      label: "Rock name",
      dataType: "text",
      required: true,
      status: "active",
      position: 0,
      validation: {},
    },
    {
      id: "optional-field",
      stableKey: "texture",
      label: "Texture notes",
      dataType: "text",
      required: false,
      status: "active",
      position: 1,
      validation: {},
    },
  ],
} as ActiveScientificTemplate;

function render(initialAttributes: Record<string, unknown> = {}) {
  return renderToStaticMarkup(
    createElement(RecordTemplateForm, {
      template,
      categoryName: "Rocks and minerals",
      recordTypeName: "Rock specimen",
      initialAttributes,
      mode: "edit",
      isSaving: false,
      onSubmit: vi.fn(),
      onCancel: vi.fn(),
    }),
  );
}

describe("RecordTemplateForm progressive disclosure", () => {
  it("shows required facts first and keeps empty optional facts collapsed", () => {
    const html = render();
    expect(html).toContain("Rock name");
    expect(html).toContain("Add optional scientific facts (1)");
    expect(html).not.toContain("Texture notes");
    expect(html).toContain("Advanced: edit the public URL identifier");
  });

  it("keeps an existing optional value visible", () => {
    const html = render({ texture: "Porphyritic" });
    expect(html).toContain("Texture notes");
    expect(html).toContain('value="Porphyritic"');
  });
});
