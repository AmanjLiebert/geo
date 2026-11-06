import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { RecordMedia } from "./record-media";
import type { RecordMediaAttachment } from "@/lib/record-extras-api";

const recordId = "11111111-1111-4111-8111-111111111111";

describe("RecordMedia component", () => {
  it("requires a main image before offering additional file formats", () => {
    const html = renderToStaticMarkup(
      createElement(RecordMedia, { recordId, initialItems: [] }),
    );

    expect(html).toContain("Main image");
    expect(html).toContain("Main image required");
    expect(html).toContain("Add main image");
    expect(html).toContain("No files have been added.");
    expect(html).toContain("No files attached yet.");
    expect(html).toContain("Drop a file here");
    expect(html).toContain("Choose file");
    expect(html).toContain(
      'accept="image/jpeg,image/png,image/webp"',
    );
    expect(html).toContain("What does this file show or contain?");
    expect(html).toContain("used as image alternative text");
    expect(html).not.toContain("Short caption (optional)");
    expect(html).not.toContain("Describe the image for accessibility");
    expect(html).toContain("Why may Geo-Kurdistan use this file?");
    expect(html).toContain("Use this as the record’s main image");
    expect(html).toContain("More file information");
    expect(html).toContain("Credit line (optional)");
    expect(html).toContain("Licence name (optional)");
    expect(html).not.toContain("application/pdf");
  });

  it("keeps saved media visible but hides mutation controls in read-only mode", () => {
    const item: RecordMediaAttachment = {
      mediaAssetId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      purpose: "Outcrop overview",
      position: 0,
      caption: "Saved field image",
      description: "Limestone contact",
      altText: "Limestone contact in an exposed face",
      isPrimary: true,
      mediaKind: "image",
      processingStatus: "approved",
      filename: "contact.jpg",
      rightsStatement: "Field team permission",
      licence: null,
      credit: null,
    };
    const html = renderToStaticMarkup(
      createElement(RecordMedia, {
        recordId,
        initialItems: [item],
        readOnly: true,
      }),
    );

    expect(html).toContain("contact.jpg");
    expect(html).toContain("Saved field image");
    expect(html).toContain("View online");
    expect(html).not.toContain("Upload protected media");
    expect(html).not.toContain("Make primary image");
    expect(html).not.toContain("Manage");
  });

  it("renders a multi-attachment gallery with correct badges, metadata, and action controls", () => {
    const sampleItems: RecordMediaAttachment[] = [
      {
        mediaAssetId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        purpose: "Outcrop overview",
        position: 0,
        caption: "Zagros mountain fold",
        description: "Exposed Cretaceous limestone formation",
        altText: "Steep limestone ridges under blue sky",
        isPrimary: true,
        mediaKind: "image",
        processingStatus: "approved",
        filename: "zagros-fold.jpg",
        rightsStatement: "CC-BY-4.0 Geological Survey",
        licence: "CC-BY-4.0",
        credit: "Field Team Alpha",
      },
      {
        mediaAssetId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        purpose: "Drone aerial sweep",
        position: 1,
        caption: "360 degree panoramic video",
        description: "Drone survey showing fault line",
        altText: null,
        isPrimary: false,
        mediaKind: "video",
        processingStatus: "uploaded",
        filename: "fault-survey.mp4",
        rightsStatement: "Copyright 2026 Survey",
        licence: null,
        credit: null,
      },
      {
        mediaAssetId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        purpose: "Stratigraphic report",
        position: 2,
        caption: null,
        description: "Field measurement table",
        altText: null,
        isPrimary: false,
        mediaKind: "document",
        processingStatus: "approved",
        filename: "stratigraphy.pdf",
        rightsStatement: "Open Access",
        licence: null,
        credit: null,
      },
      {
        mediaAssetId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        purpose: "Thin section",
        position: 3,
        caption: "Cross-polarized light",
        description: null,
        altText: "Calcite twinning under polarized light",
        isPrimary: false,
        mediaKind: "image",
        processingStatus: "approved",
        filename: "thin-section.png",
        rightsStatement: "CC-BY-4.0",
        licence: null,
        credit: null,
      },
    ];

    const html = renderToStaticMarkup(
      createElement(RecordMedia, { recordId, initialItems: sampleItems }),
    );

    expect(html).toContain("Additional files remain private");
    expect(html).toContain(
      'accept="image/jpeg,image/png,image/webp,application/pdf,video/mp4,video/webm"',
    );

    // Filenames present
    expect(html).toContain("zagros-fold.jpg");
    expect(html).toContain("fault-survey.mp4");
    expect(html).toContain("stratigraphy.pdf");
    expect(html).toContain("thin-section.png");

    // Badges
    expect(html).toContain("★ Primary image");
    expect(html).toContain("Image");
    expect(html).toContain("Video");
    expect(html).toContain("Document");
    expect(html).toContain("Ready");
    expect(html).toContain("Processing");

    // Metadata
    expect(html).toContain("Zagros mountain fold");
    expect(html).toContain("Steep limestone ridges under blue sky");
    expect(html).toContain("Exposed Cretaceous limestone formation");
    expect(html).toContain("Drone aerial sweep");
    expect(html).toContain("CC-BY-4.0 Geological Survey");

    // Actions
    // "View online" only for approved media
    expect(html).toContain("View online");
    // "Make primary image" only for non-primary images (thin-section.png, not zagros-fold.jpg, not video, not pdf)
    expect(html).toContain("Make primary image");

    // Reorder buttons with accessible labels
    expect(html).toContain('aria-label="Move zagros-fold.jpg up"');
    expect(html).toContain('aria-label="Move zagros-fold.jpg down"');
    expect(html).toContain('aria-label="Move fault-survey.mp4 up"');
    expect(html).toContain('aria-label="Move fault-survey.mp4 down"');

    // Less-frequent controls remain available under the per-file Manage disclosure.
    expect(html).toContain("Manage");
    expect(html).toContain("Move earlier");
    expect(html).toContain("Move later");
    expect(html).toContain("Edit information");
    expect(html).toContain("Detach");
  });
});
