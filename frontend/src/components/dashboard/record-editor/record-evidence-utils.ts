export const SOURCE_TYPES = [
  "journal",
  "book",
  "research",
  "website",
  "map",
  "dataset",
  "institution",
  "catalogue",
] as const;

export type SourceType = (typeof SOURCE_TYPES)[number];

export type SourceTypeConfig = {
  label: string;
  description: string;
  titleLabel: string;
  contributorLabel: string;
  publicationLabel: string;
  identifierLabel: string;
  pagesLabel: string;
  linkRequired: boolean;
};

const SOURCE_TYPE_CONFIG: Record<SourceType, SourceTypeConfig> = {
  journal: {
    label: "Journal article",
    description: "An article published in a scientific or academic journal.",
    titleLabel: "Article title",
    contributorLabel: "Author or authors",
    publicationLabel: "Journal name",
    identifierLabel: "DOI or article identifier",
    pagesLabel: "Volume, issue, pages, or figure",
    linkRequired: false,
  },
  book: {
    label: "Book",
    description: "A book, chapter, field guide, or reference volume.",
    titleLabel: "Book or chapter title",
    contributorLabel: "Author or editor",
    publicationLabel: "Publisher",
    identifierLabel: "ISBN or catalogue identifier",
    pagesLabel: "Chapter, pages, plate, or figure",
    linkRequired: false,
  },
  research: {
    label: "Research paper or report",
    description:
      "A thesis, survey report, technical paper, or institutional study.",
    titleLabel: "Paper or report title",
    contributorLabel: "Author or institution",
    publicationLabel: "University, institution, or publisher",
    identifierLabel: "Report number or DOI",
    pagesLabel: "Section, pages, table, or figure",
    linkRequired: false,
  },
  website: {
    label: "Website or online image",
    description:
      "A web page, online database entry, or externally hosted image.",
    titleLabel: "Page or image title",
    contributorLabel: "Author or organization",
    publicationLabel: "Website name",
    identifierLabel: "Archive or catalogue identifier",
    pagesLabel: "Section or figure",
    linkRequired: true,
  },
  map: {
    label: "Geological map",
    description: "A published geological, topographic, or survey map.",
    titleLabel: "Map title",
    contributorLabel: "Cartographer or institution",
    publicationLabel: "Map series or publisher",
    identifierLabel: "Sheet or catalogue number",
    pagesLabel: "Scale, sheet, plate, or figure",
    linkRequired: false,
  },
  dataset: {
    label: "Dataset",
    description:
      "A structured dataset from a repository, survey, or institution.",
    titleLabel: "Dataset title",
    contributorLabel: "Creator or institution",
    publicationLabel: "Repository or publisher",
    identifierLabel: "DOI or dataset identifier",
    pagesLabel: "Version, table, or subset",
    linkRequired: false,
  },
  institution: {
    label: "Institutional source",
    description:
      "Information published by a museum, university, survey, or authority.",
    titleLabel: "Source title",
    contributorLabel: "Institution",
    publicationLabel: "Collection or publication",
    identifierLabel: "Institutional identifier",
    pagesLabel: "Section, pages, or figure",
    linkRequired: false,
  },
  catalogue: {
    label: "Catalogue entry",
    description: "A specimen, archive, museum, or collection catalogue entry.",
    titleLabel: "Entry title",
    contributorLabel: "Museum, collection, or author",
    publicationLabel: "Catalogue or collection",
    identifierLabel: "Accession or catalogue number",
    pagesLabel: "Page, plate, or figure",
    linkRequired: false,
  },
};

export function getSourceTypeConfig(sourceType: string): SourceTypeConfig {
  return (
    SOURCE_TYPE_CONFIG[sourceType as SourceType] ?? SOURCE_TYPE_CONFIG.website
  );
}

export function formatSourceType(sourceType: string): string {
  return getSourceTypeConfig(sourceType).label;
}

export function inferEvidenceKind(sourceType: string): string {
  if (sourceType === "map") return "map";
  if (sourceType === "dataset") return "dataset";
  return "published_source";
}

export function normalizeHttpsUrl(rawValue: string): string | undefined {
  const value = rawValue.trim();
  if (!value) return undefined;
  const candidate = /^[a-z][a-z\d+.-]*:/i.test(value)
    ? value
    : `https://${value}`;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "https:" || !parsed.hostname) return undefined;
    return parsed.toString();
  } catch {
    return undefined;
  }
}

export function parseOptionalPublicationYear(
  rawValue: string,
): { value?: number } | { error: string } {
  const value = rawValue.trim();
  if (!value) return {};
  if (!/^\d{4}$/.test(value)) {
    return { error: "Enter a four-digit publication year." };
  }
  const year = Number(value);
  if (year < 1500 || year > 2200) {
    return { error: "Publication year must be between 1500 and 2200." };
  }
  return { value: year };
}
