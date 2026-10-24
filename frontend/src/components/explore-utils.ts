import type { GeologicalRecord } from "@/content/types";

export const EXPLORE_PAGE_SIZE = 6;
export const exploreFilterKeys = ["type", "region", "age", "formation"] as const;

export type ExploreFilterKey = (typeof exploreFilterKeys)[number];

export interface ExploreQueryState {
  q: string;
  type: string;
  region: string;
  age: string;
  formation: string;
  page: number;
  image?: number;
}

export type ExploreSearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function positiveInteger(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function parseExploreQuery(params: ExploreSearchParams): ExploreQueryState {
  const imageValue = first(params.image);
  const parsedImage = imageValue === "" ? undefined : Number.parseInt(imageValue, 10);

  return {
    q: first(params.q).trim(),
    type: first(params.type).trim(),
    region: first(params.region).trim(),
    age: first(params.age).trim(),
    formation: first(params.formation).trim(),
    page: positiveInteger(first(params.page), 1),
    image: parsedImage !== undefined && Number.isFinite(parsedImage) && parsedImage >= 0 ? parsedImage : undefined,
  };
}

export function serializeExploreQuery(state: ExploreQueryState) {
  const params = new URLSearchParams();
  if (state.q) params.set("q", state.q);
  exploreFilterKeys.forEach((key) => {
    if (state[key]) params.set(key, state[key]);
  });
  if (state.page > 1) params.set("page", String(state.page));
  if (state.image !== undefined) params.set("image", String(state.image));
  return params.toString();
}

export function buildExploreHref(
  pathname: string,
  state: ExploreQueryState,
  patch: Partial<ExploreQueryState> = {},
) {
  const query = serializeExploreQuery({ ...state, ...patch });
  return `${pathname}${query ? `?${query}` : ""}`;
}

export function clampPage(page: number, itemCount: number, pageSize = EXPLORE_PAGE_SIZE) {
  const totalPages = Math.max(1, Math.ceil(itemCount / pageSize));
  return Math.min(Math.max(1, page), totalPages);
}

export function paginateRecords(records: GeologicalRecord[], requestedPage: number, pageSize = EXPLORE_PAGE_SIZE) {
  const page = clampPage(requestedPage, records.length, pageSize);
  const totalPages = Math.max(1, Math.ceil(records.length / pageSize));
  const startIndex = (page - 1) * pageSize;
  return {
    items: records.slice(startIndex, startIndex + pageSize),
    page,
    totalPages,
    startIndex,
  };
}

export function getRecordNavigation(records: GeologicalRecord[], slug: string) {
  const index = records.findIndex((record) => record.slug === slug);
  if (index < 0) return { previous: undefined, next: undefined, position: undefined };
  return {
    previous: index > 0 ? records[index - 1] : undefined,
    next: index < records.length - 1 ? records[index + 1] : undefined,
    position: index + 1,
  };
}

function normalize(value?: string) {
  return value?.trim().toLocaleLowerCase() ?? "";
}

function includes(value: string | undefined, query: string) {
  return !query || normalize(value).includes(query);
}

export function filterExploreRecords(records: GeologicalRecord[], categorySlug: string, query: ExploreQueryState) {
  const search = normalize(query.q);
  return records.filter((record) => {
    const haystack = normalize([
      record.name,
      record.recordType,
      record.summary,
      record.locality,
      record.region,
      record.geologicalAge,
      record.formation,
      ...(record.classification ?? []),
    ].filter(Boolean).join(" "));

    return (record.categoryPath ?? [record.category]).includes(categorySlug)
      && (!search || haystack.includes(search))
      && includes(record.recordType, normalize(query.type))
      && includes(record.region, normalize(query.region))
      && includes(record.geologicalAge, normalize(query.age))
      && includes(record.formation, normalize(query.formation));
  });
}

export interface ExplorePreviewFact {
  label: string;
  value: string;
}

const previewAdapters: Record<string, (record: GeologicalRecord) => Array<ExplorePreviewFact | undefined>> = {
  formations: (record) => [
    record.geologicalAge ? { label: "Age", value: record.geologicalAge } : undefined,
    record.formation ? { label: "Formation", value: record.formation } : undefined,
    { label: "Locality", value: record.locality },
  ],
  minerals: (record) => [
    record.classification?.[0] ? { label: "Mineral", value: record.classification[0] } : undefined,
    record.classification?.[1] ? { label: "Group", value: record.classification[1] } : undefined,
    { label: "Context", value: record.locality },
  ],
  fossils: (record) => [
    record.geologicalAge ? { label: "Age", value: record.geologicalAge } : undefined,
    record.classification?.[0] ? { label: "Group", value: record.classification[0] } : undefined,
    { label: "Context", value: record.locality },
  ],
  rocks: (record) => [
    record.classification?.[0] ? { label: "Class", value: record.classification[0] } : undefined,
    record.classification?.[1] ? { label: "Material", value: record.classification[1] } : undefined,
    { label: "Locality", value: record.locality },
  ],
  "geological-items": (record) => [
    { label: "Locality", value: record.locality },
    { label: "Region", value: record.region },
    record.classification?.[0] ? { label: "Use", value: record.classification[0] } : undefined,
  ],
  other: (record) => [
    { label: "Record", value: record.recordType },
    { label: "Region", value: record.region },
    record.classification?.[0] ? { label: "Theme", value: record.classification[0] } : undefined,
  ],
};

export function getRecordPreviewFacts(record: GeologicalRecord): ExplorePreviewFact[] {
  const adapter = previewAdapters[record.category] ?? previewAdapters.other;
  return adapter(record).filter((fact): fact is ExplorePreviewFact => Boolean(fact?.value)).slice(0, 3);
}
