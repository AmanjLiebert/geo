export interface ResearchView {
  slug?: string;
  mode: "library" | "detail" | "read";
  q: string;
  type: string;
  section: number;
  pdf: boolean;
}
export function researchSearchParams(query: Record<string, string | string[] | undefined>) {
  return new URLSearchParams(Object.entries(query).flatMap(([key, value]) => typeof value === "string" ? [[key, value]] : []));
}
export function parseResearchView(path: string, query: URLSearchParams): ResearchView {
  const parts = path.split("/").filter(Boolean);
  const section = Number(query.get("section"));
  return { slug: parts[1], mode: parts[1] ? parts[2] === "read" ? "read" : "detail" : "library", q: query.get("q") ?? "", type: query.get("type") ?? "", section: Number.isSafeInteger(section) && section >= 0 ? section : 0, pdf: query.get("format") === "pdf" };
}
export function researchHref(view: ResearchView) {
  const params = new URLSearchParams();
  if (view.q) params.set("q", view.q);
  if (view.type) params.set("type", view.type);
  if (view.mode === "read" && view.section) params.set("section", String(view.section));
  if (view.mode === "read" && view.pdf) params.set("format", "pdf");
  const path = view.mode === "library" ? "/research" : `/research/${view.slug}${view.mode === "read" ? "/read" : ""}`;
  return path + (params.size ? `?${params}` : "");
}
