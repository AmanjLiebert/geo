import { describe, expect, it } from "vitest";
import { issueActionLabel } from "./record-review-panel";
import { readFileSync } from "node:fs";

describe("record review issue actions", () => {
  it("sends teacher-fixable main-image issues to an explicit repair action", () => {
    expect(issueActionLabel("media", "primary_image_rights_required")).toBe(
      "Fix main image",
    );
    expect(issueActionLabel("media", "primary_image_alt_text_required")).toBe(
      "Fix main image",
    );
  });

  it("uses a viewing action for processing and replacement issues", () => {
    expect(issueActionLabel("media", "primary_image_processing")).toBe(
      "View files",
    );
    expect(issueActionLabel("media", "primary_image_rejected")).toBe(
      "View files",
    );
  });

  it("does not ask a signed-in publisher to confirm identity again", () => {
    const source = readFileSync(
      new URL("./record-review-panel.tsx", import.meta.url),
      "utf8",
    );
    expect(source).not.toContain("Confirm your identity");
    expect(source).not.toContain("Confirm identity and return");
    expect(source).not.toContain("verified evidence");
  });
});
