import { getRelatedRecords, getResearchDocument, listResearch } from "./repository";

// Showcase files are generated from the same editorial data as the online reader.
const samplePdfs: Record<string, string> = {
  "reading-folded-landscapes": "/research-pdfs/reading-folded-landscapes.pdf",
  "cataloguing-regional-formations": "/research-pdfs/cataloguing-regional-formations.pdf",
  "field-observation-language": "/research-pdfs/field-observation-language.pdf",
};

export function getResearchLibrary() {
  return listResearch().flatMap((publication) => {
    const document = getResearchDocument(publication.slug);
    return document ? [{ publication, document, pdf: samplePdfs[publication.slug], related: getRelatedRecords(document.relatedRecordSlugs) }] : [];
  });
}
export type ResearchEntry = ReturnType<typeof getResearchLibrary>[number];
