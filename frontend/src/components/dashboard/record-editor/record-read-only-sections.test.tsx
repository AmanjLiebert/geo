import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { buildLocationPayload, RecordLocations } from "./record-locations";
import { RecordRelationships } from "./record-relationships";
import { RecordScientificSummary } from "./record-scientific-summary";
import type { ActiveScientificTemplate } from "@/lib/dashboard-api";

const recordId = "11111111-1111-4111-8111-111111111111";

describe("read-only record sections", () => {
  it("keeps the optional location form closed until requested", () => {
    const html = renderToStaticMarkup(
      createElement(RecordLocations, { recordId }),
    );
    expect(html).toContain("This does not block publication");
    expect(html).toContain("Add location");
    expect(html).not.toContain("Exact latitude");
    expect(html).not.toContain("What may visitors see?");
  });

  it("shows location state without duplicate entry controls", () => {
    const html = renderToStaticMarkup(
      createElement(RecordLocations, { recordId, readOnly: true }),
    );
    expect(html).toContain("No location added");
    expect(html).not.toContain("Exact latitude");
    expect(html).not.toContain("Add location");
  });

  it("shows relationship state without add controls", () => {
    const html = renderToStaticMarkup(
      createElement(RecordRelationships, { recordId, readOnly: true }),
    );
    expect(html).toContain("No related items yet");
    expect(html).not.toContain("Connect to");
    expect(html).not.toContain("Add related item");
  });

  it("reuses exact coordinates for a fully public location", () => {
    const result = buildLocationPayload({
      label: "Bekhme outcrop",
      region: "Erbil",
      exactLatitude: "36.65",
      exactLongitude: "44.25",
      visibility: "public",
      publicLatitude: "",
      publicLongitude: "",
      precision: "",
      reason: "",
      embargoUntil: "",
    });
    expect(result).toEqual({
      payload: expect.objectContaining({
        exactLatitude: 36.65,
        exactLongitude: 44.25,
        publicLatitude: 36.65,
        publicLongitude: 44.25,
      }),
    });
  });

  it("requires a separate safe map point for an approximate location", () => {
    const result = buildLocationPayload({
      label: "Sensitive fossil site",
      region: "Duhok",
      exactLatitude: "37.1",
      exactLongitude: "43.2",
      visibility: "approximate",
      publicLatitude: "37.0",
      publicLongitude: "43.0",
      precision: "10000",
      reason: "Protect the site",
      embargoUntil: "",
    });
    expect(result).toEqual({
      payload: expect.objectContaining({
        exactLatitude: 37.1,
        exactLongitude: 43.2,
        publicLatitude: 37,
        publicLongitude: 43,
        publicPrecisionMetres: 10000,
      }),
    });
  });

  it("renders saved scientific values as a readable summary", () => {
    const template = {
      id: "template-1",
      name: "Fossil occurrence",
      version: { id: "version-1", number: 1, status: "active" },
      fields: [
        {
          id: "field-1",
          stableKey: "identification",
          label: "Fossil identification",
          dataType: "text",
          required: true,
          status: "active",
          position: 0,
          validation: {},
        },
      ],
    } as ActiveScientificTemplate;
    const html = renderToStaticMarkup(
      createElement(RecordScientificSummary, {
        template,
        attributes: { identification: "Ammonite" },
      }),
    );
    expect(html).toContain("Fossil identification");
    expect(html).toContain("Ammonite");
  });
});
