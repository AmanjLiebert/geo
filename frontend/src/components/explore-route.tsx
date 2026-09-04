import { notFound } from "next/navigation";
import {
  getCategoryBySlug,
  getCategoryFilterDefinitions,
  getRecordBySlug,
  getRecordDetail,
  getRecordFilterOptions,
  listCategories,
  listRecords,
} from "@/content/repository";
import type { GeologicalRecord, MediaAsset } from "@/content/types";
import { ExploreBrowser, type ExploreRecordBundle } from "./explore-browser";
import { parseExploreQuery, type ExploreSearchParams } from "./explore-utils";

function uniqueGallery(record: GeologicalRecord, configuredImages: MediaAsset[]) {
  return [record.image, ...configuredImages, ...(record.gallery ?? [])]
    .filter((image, index, images) => images.findIndex((candidate) => candidate.src === image.src) === index);
}

export function ExploreRoute({
  selectedCategorySlug,
  selectedRecordSlug,
  searchParams,
}: {
  selectedCategorySlug?: string;
  selectedRecordSlug?: string;
  searchParams: ExploreSearchParams;
}) {
  if (selectedCategorySlug && !getCategoryBySlug(selectedCategorySlug)) notFound();
  if (selectedRecordSlug && (!selectedCategorySlug || !getRecordBySlug(selectedCategorySlug, selectedRecordSlug))) notFound();

  const categories = listCategories();
  const records = listRecords();
  const collections = categories.map((category) => ({
    category,
    count: records.filter((record) => record.category === category.slug).length,
  }));
  const recordBundles: ExploreRecordBundle[] = records.map((record) => {
    const detail = getRecordDetail(record);
    const configuredGallery = detail.sections.find((section) => section.kind === "gallery");
    return {
      record,
      detail,
      gallery: uniqueGallery(record, configuredGallery?.kind === "gallery" ? configuredGallery.images : []),
    };
  });
  const collectionFilters = categories.map((category) => ({
    categorySlug: category.slug,
    definitions: getCategoryFilterDefinitions(category.slug).map((definition) => ({
      ...definition,
      values: getRecordFilterOptions(category.slug, definition.key),
    })),
  }));

  return <ExploreBrowser
    key={`${selectedCategorySlug ?? "root"}:${selectedRecordSlug ?? "list"}`}
    collections={collections}
    recordBundles={recordBundles}
    collectionFilters={collectionFilters}
    initialCategorySlug={selectedCategorySlug}
    initialRecordSlug={selectedRecordSlug}
    initialQuery={parseExploreQuery(searchParams)}
  />;
}
