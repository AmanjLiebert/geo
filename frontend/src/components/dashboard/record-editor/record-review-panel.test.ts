import { describe, expect, it } from "vitest";
import { issueActionLabel } from "./record-review-panel";

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
});
