import { categories, fieldObservations, locations, records, research } from "./mock-data";
import { categoryFilters, fieldStories, products, recordDetails, researchDocuments } from "./showcase-data";
import type {
  FieldObservation,
  GeologicalCategory,
  GeologicalRecord,
  GeologicalRecordDetail,
  ResearchPublication,
  SearchResult,
  ShopProduct,
} from "./types";

export interface RecordQuery {
  category?: string;
  q?: string;
  type?: string;
  region?: string;
  age?: string;
  formation?: string;
}

function normalize(value?: string) {
  return value?.trim().toLocaleLowerCase() ?? "";
}

function includes(value: string | undefined, query: string) {
  return !query || normalize(value).includes(query);
}

function matchesRecord(record: GeologicalRecord, query: RecordQuery) {
  const q = normalize(query.q);
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

  return (!query.category || record.category === query.category)
    && (!q || haystack.includes(q))
    && includes(record.recordType, normalize(query.type))
    && includes(record.region, normalize(query.region))
    && includes(record.geologicalAge, normalize(query.age))
    && includes(record.formation, normalize(query.formation));
}

export function listCategories(): GeologicalCategory[] {
  return categories;
}

export function getCategoryBySlug(slug: string) {
  return categories.find((category) => category.slug === slug);
}

export function listRecords(query: RecordQuery = {}): GeologicalRecord[] {
  return records.filter((record) => matchesRecord(record, query));
}

export function getRecordBySlug(category: string, slug: string) {
  return records.find((record) => record.category === category && record.slug === slug);
}

export function getRecordDetail(record: GeologicalRecord): GeologicalRecordDetail {
  const configured = recordDetails.find((detail) => detail.recordSlug === record.slug);
  if (configured) return configured;

  const related = records
    .filter((candidate) => candidate.slug !== record.slug && (candidate.category === record.category || candidate.region === record.region))
    .slice(0, 3)
    .map((candidate) => ({
      slug: candidate.slug,
      reason: candidate.category === record.category ? "Same geological collection" : `Shared regional context · ${record.region}`,
    }));

  return {
    recordSlug: record.slug,
    sections: [
      ...(record.classification ? [{ kind: "classification" as const, title: "Classification", items: record.classification }] : []),
      ...(record.gallery?.length ? [{ kind: "gallery" as const, title: "Field documentation", images: record.gallery }] : []),
      { kind: "references" as const, title: "Source and review", items: [{ label: "Catalogue note", detail: record.sourceNote }] },
    ],
    related,
  };
}

export function getCategoryFilterDefinitions(categorySlug: string) {
  return categoryFilters[categorySlug] ?? [];
}

export function getRecordFilterOptions(categorySlug: string, key: "type" | "region" | "age" | "formation") {
  const categoryRecords = records.filter((record) => record.category === categorySlug);
  const values = categoryRecords.map((record) => {
    if (key === "type") return record.recordType;
    if (key === "region") return record.region;
    if (key === "age") return record.geologicalAge;
    return record.formation;
  }).filter((value): value is string => Boolean(value));
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

export function listResearch(query: { q?: string; type?: string } = {}): ResearchPublication[] {
  const q = normalize(query.q);
  const type = normalize(query.type);
  return research.filter((item) => {
    const haystack = normalize([item.title, item.authors, item.abstract, item.topic, item.location, item.type].join(" "));
    return (!q || haystack.includes(q)) && (!type || normalize(item.type) === type);
  });
}

export function getResearch(slug: string) {
  return research.find((item) => item.slug === slug);
}

export function getResearchDocument(slug: string) {
  return researchDocuments.find((document) => document.publicationSlug === slug);
}

export function listFieldObservations(query: { q?: string; type?: string } = {}): FieldObservation[] {
  const q = normalize(query.q);
  const type = normalize(query.type);
  return fieldObservations.filter((item) => {
    const haystack = normalize([item.title, item.location, item.note, item.type].join(" "));
    return (!q || haystack.includes(q)) && (!type || normalize(item.type) === type);
  });
}

export function getFieldObservation(slug: string) {
  return fieldObservations.find((item) => item.slug === slug);
}

export function getFieldStory(slug: string) {
  return fieldStories.find((story) => story.observationSlug === slug);
}

export function listProducts(query: { q?: string; category?: string } = {}): ShopProduct[] {
  const q = normalize(query.q);
  const category = normalize(query.category);
  return products.filter((product) => {
    const haystack = normalize([product.name, product.category, product.summary, product.description, product.purpose].join(" "));
    return (!q || haystack.includes(q)) && (!category || normalize(product.category) === category);
  });
}

export function getProduct(slug: string) {
  return products.find((product) => product.slug === slug);
}

export function searchContent(query: { q?: string; type?: string; region?: string; age?: string; formation?: string }): SearchResult[] {
  const q = normalize(query.q);
  if (!q) return [];
  const type = normalize(query.type);
  const results: SearchResult[] = [];

  if (!type || type === "record") {
    listRecords({ q: query.q, region: query.region, age: query.age, formation: query.formation }).forEach((record) => results.push({
      kind: "record",
      slug: record.slug,
      title: record.name,
      context: `${record.recordType} · ${record.locality}`,
      summary: record.summary,
      href: `/explore/${record.category}/${record.slug}`,
      image: record.image,
    }));
  }

  if (!type || type === "research") {
    listResearch({ q: query.q }).filter((item) => includes(item.location, normalize(query.region))).forEach((item) => results.push({
      kind: "research",
      slug: item.slug,
      title: item.title,
      context: `${item.type} · ${item.year}`,
      summary: item.abstract,
      href: `/research/${item.slug}`,
      image: item.image,
    }));
  }

  if (!type || type === "location") {
    locations.filter((location) => normalize([location.name, location.region, location.category, location.description, location.geologicalAge].filter(Boolean).join(" ")).includes(q) && includes(location.region, normalize(query.region)) && includes(location.geologicalAge, normalize(query.age))).forEach((location) => results.push({
      kind: "location",
      slug: location.slug,
      title: location.name,
      context: `${location.category} · ${location.region}`,
      summary: location.description,
      href: `/maps?place=${location.slug}`,
      image: location.image,
    }));
  }

  if (!type || type === "field") {
    listFieldObservations({ q: query.q }).filter((item) => includes(item.location, normalize(query.region))).forEach((item) => results.push({
      kind: "field",
      slug: item.slug,
      title: item.title,
      context: `${item.type} · ${item.location}`,
      summary: item.note,
      href: `/field/${item.slug}`,
      image: item.image,
    }));
  }

  return results;
}

export function getRelatedRecords(slugs: string[]) {
  return slugs.flatMap((slug) => {
    const record = records.find((item) => item.slug === slug);
    return record ? [record] : [];
  });
}

export function listLocations() {
  return locations;
}

export function getLocation(slug: string) {
  return locations.find((location) => location.slug === slug);
}
