import { describe, expect, it } from "vitest";
import { parseResearchView, researchHref, researchSearchParams } from "./research-view";

describe("research URL state", () => {
  it("starts at the library without selecting a publication", () => {
    expect(parseResearchView("/research", new URLSearchParams())).toEqual({ mode: "library", slug: undefined, q: "", type: "", section: 0, pdf: false });
  });
  it("restores a publication, reader section and PDF format", () => {
    const href = "/research/reading-folded-landscapes/read?q=fold&type=Interpretive+study&section=2&format=pdf";
    const [path, query] = href.split("?");
    const view = parseResearchView(path, new URLSearchParams(query));
    expect(view).toMatchObject({ mode: "read", slug: "reading-folded-landscapes", section: 2, pdf: true });
    expect(researchHref(view)).toBe(href);
  });
  it.each(["-1", "1.5", "invalid", "Infinity", "9007199254740992"])("resets invalid section %s", (section) => {
    expect(parseResearchView("/research/paper/read", new URLSearchParams({ section })).section).toBe(0);
  });
  it("keeps refinements when closing and omits reader-only parameters", () => {
    const view = parseResearchView("/research/paper/read", new URLSearchParams("q=field&type=Education+note&section=3&format=pdf"));
    expect(researchHref({ ...view, mode: "detail" })).toBe("/research/paper?q=field&type=Education+note");
    expect(researchHref({ ...view, mode: "library" })).toBe("/research?q=field&type=Education+note");
  });
  it("ignores ambiguous server query arrays", () => {
    expect(researchSearchParams({ q: "field", type: ["a", "b"], section: undefined }).toString()).toBe("q=field");
  });
});
