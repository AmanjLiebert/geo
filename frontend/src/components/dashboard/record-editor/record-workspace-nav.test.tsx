import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  defaultRecordWorkspaceSections,
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
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('aria-controls="record-panel-media"');
    expect(html).not.toContain('tabindex="-1"');
  });
});
