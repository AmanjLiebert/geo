import { describe, expect, it } from "vitest";
import {
  acceptedMediaTypes,
  isExpectedMediaConfirmationStatus,
  maximumMediaBytes,
  mediaTypeGuidance,
} from "./media-upload-policy";

describe("media upload policy", () => {
  it("keeps the existing production upload choices unchanged", () => {
    expect(acceptedMediaTypes(false)).toContain("application/pdf");
    expect(acceptedMediaTypes(false)).toContain("video/mp4");
    expect(maximumMediaBytes("image/jpeg", false)).toBe(25 * 1024 * 1024);
    expect(isExpectedMediaConfirmationStatus("quarantined", false)).toBe(true);
    expect(isExpectedMediaConfirmationStatus("approved", false)).toBe(false);
  });

  it("limits the demo to three bounded image formats", () => {
    expect(acceptedMediaTypes(true)).toEqual([
      "image/jpeg",
      "image/png",
      "image/webp",
    ]);
    expect(maximumMediaBytes("image/jpeg", true)).toBe(3 * 1024 * 1024);
    expect(isExpectedMediaConfirmationStatus("quarantined", true)).toBe(true);
    expect(isExpectedMediaConfirmationStatus("approved", true)).toBe(true);
    expect(mediaTypeGuidance(true)).toBe("Choose a JPEG, PNG, or WebP image.");
  });
});
