import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  defaultRecordWorkspaceSections,
  getRecordWorkspaceSections,
  RecordWorkspaceNav,
} from "./record-workspace-nav";

describe("RecordWorkspaceNav", () => {
  it("presents four recognizable editing stages as accessible tabs", () => {
    const html = renderToStaticMarkup(
      createElement(RecordWorkspaceNav, {
        sections: defaultRecordWorkspaceSections,
        activeSection: "record",
        onSelect: vi.fn(),
      }),
    );

    expect(html).toContain('aria-label="Record sections"');
    expect(html).toContain('role="tablist"');
    expect(html).toContain(">Record<");
    expect(html).toContain("Evidence");
    expect(html).toContain("Optional");
    expect(html).toContain("Review");
    expect(defaultRecordWorkspaceSections).toHaveLength(4);
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('aria-controls="record-panel-evidence"');
    expect(html).toContain('aria-controls="record-panel-optional"');
    expect(html).toContain('aria-controls="record-panel-review"');
    expect(html).not.toContain('tabindex="-1"');
  });

  it("keeps every saved-data stage available for published records", () => {
    expect(
      getRecordWorkspaceSections("published").map((section) => section.id),
    ).toEqual(["record", "evidence", "optional", "review"]);
  });

  it("omits publication actions for archived records", () => {
    expect(
      getRecordWorkspaceSections("archived").map((section) => section.id),
    ).toEqual(["record", "evidence", "optional"]);
  });

  it("shows completion summaries without marking optional work incomplete", () => {
    const html = renderToStaticMarkup(
      createElement(RecordWorkspaceNav, {
        sections: defaultRecordWorkspaceSections,
        activeSection: "optional",
        onSelect: vi.fn(),
        summaries: {
          record: "Details saved",
          evidence: "1 source · 1 file",
          optional: "Add only when useful",
        },
      }),
    );

    expect(html).toContain("Details saved");
    expect(html).toContain("1 source · 1 file");
    expect(html).toContain("Add only when useful");
  });
});
