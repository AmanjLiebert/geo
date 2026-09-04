export type RecordStatus = "Reviewed mock" | "Pending teacher review";

export interface MediaAsset {
  src: string;
  alt: string;
  caption: string;
  credit?: string;
}

export interface GeologicalCategory {
  slug: string;
  name: string;
  eyebrow: string;
  description: string;
  recordCount: number;
  image: MediaAsset;
  overview: string;
  facts: Array<{ label: string; value: string }>;
  themes: string[];
  relatedCategorySlugs: string[];
}

export interface GeologicalLocation {
  slug: string;
  name: string;
  region: string;
  coordinates: [number, number];
  category: string;
  geologicalAge?: string;
  description: string;
  image: MediaAsset;
}

export interface GeologicalRecord {
  slug: string;
  name: string;
  category: string;
  recordType: string;
  recordId: string;
  summary: string;
  description: string;
  locality: string;
  region: string;
  coordinates?: [number, number];
  geologicalAge?: string;
  formation?: string;
  classification?: string[];
  status: RecordStatus;
  image: MediaAsset;
  mediaStatus?: "record" | "reference";
  gallery?: MediaAsset[];
  sourceNote: string;
}

export interface ResearchPublication {
  slug: string;
  title: string;
  authors: string;
  year: string;
  type: string;
  topic: string;
  location: string;
  abstract: string;
  image: MediaAsset;
  status: RecordStatus;
}

export interface FieldObservation {
  slug: string;
  title: string;
  location: string;
  date: string;
  type: string;
  coordinates: [number, number];
  note: string;
  image: MediaAsset;
  status: RecordStatus;
}

export interface ContentReference {
  label: string;
  detail: string;
  href?: string;
}

export type RecordDetailSection =
  | { kind: "prose"; title: string; body: string[] }
  | { kind: "facts"; title: string; items: Array<{ label: string; value: string }> }
  | { kind: "classification"; title: string; items: string[] }
  | { kind: "gallery"; title: string; images: MediaAsset[] }
  | { kind: "references"; title: string; items: ContentReference[] };

export interface GeologicalRecordDetail {
  recordSlug: string;
  discovery?: string;
  formationContext?: string;
  sections: RecordDetailSection[];
  related: Array<{ slug: string; reason: string }>;
}

export interface ResearchSection {
  id: string;
  title: string;
  paragraphs: string[];
  figure?: MediaAsset;
}

export interface ResearchDocument {
  publicationSlug: string;
  readingTime: string;
  sections: ResearchSection[];
  references: ContentReference[];
  relatedRecordSlugs: string[];
}

export interface FieldStory {
  observationSlug: string;
  introduction: string;
  sections: Array<{ title: string; body: string[] }>;
  gallery: MediaAsset[];
  relatedRecordSlugs: string[];
}

export interface ShopProduct {
  slug: string;
  name: string;
  category: string;
  price: string;
  summary: string;
  description: string;
  purpose: string;
  image: MediaAsset;
  gallery: MediaAsset[];
}

export type SearchResult =
  | { kind: "record"; slug: string; title: string; context: string; summary: string; href: string; image: MediaAsset }
  | { kind: "research"; slug: string; title: string; context: string; summary: string; href: string; image: MediaAsset }
  | { kind: "location"; slug: string; title: string; context: string; summary: string; href: string; image: MediaAsset }
  | { kind: "field"; slug: string; title: string; context: string; summary: string; href: string; image: MediaAsset };

export interface CategoryFilterDefinition {
  key: "type" | "region" | "age" | "formation";
  label: string;
}
