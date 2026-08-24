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
