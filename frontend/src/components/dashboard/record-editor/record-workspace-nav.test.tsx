import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  defaultRecordWorkspaceSections,
  getRecordWorkspaceSections,
  RecordWorkspaceNav,
} from "./record-workspace-nav";

describe("RecordWorkspaceNav", () => {
  it("presents the complete scientific editing sequence as accessible tabs", () => {
    const html = renderToStaticMarkup(
      createElement(RecordWorkspaceNav, {
        sections: defaultRecordWorkspaceSections,
        activeSection: "details",
        onSelect: vi.fn(),
      }),
    );

    expect(html).toContain('aria-label="Record sections"');
    expect(html).toContain('role="tablist"');
    expect(html).toContain("Record details");
    expect(html).toContain("Scientific fields");
    expect(html).toContain("Sources");
    expect(html).toContain("Location");
    expect(html).toContain("Related items");
    expect(html).toContain("Images and files");
    expect(html).toContain("Review and publish");
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('aria-controls="record-panel-media"');
    expect(html).toContain('aria-controls="record-panel-review"');
    expect(html).not.toContain('tabindex="-1"');
  });

  it("keeps every saved-data section available for published records", () => {
    expect(
      getRecordWorkspaceSections("published").map((section) => section.id),
    ).toEqual([
      "details",
      "scientific",
      "sources",
      "location",
      "related",
      "media",
      "review",
    ]);
  });

  it("shows record-specific completion summaries", () => {
    const html = renderToStaticMarkup(
      createElement(RecordWorkspaceNav, {
        sections: defaultRecordWorkspaceSections,
        activeSection: "location",
        onSelect: vi.fn(),
        summaries: {
          details: "Saved",
          location: "2 locations",
          media: "3 files",
        },
      }),
    );

    expect(html).toContain("Saved");
    expect(html).toContain("2 locations");
    expect(html).toContain("3 files");
  });
});
