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
import { ExploreBrowser, type ExploreNavigationItem } from "./explore-browser";
import {
  EXPLORE_PAGE_SIZE,
  getRecordNavigation,
  paginateRecords,
  parseExploreQuery,
  type ExploreSearchParams,
} from "./explore-utils";

function uniqueGallery(record: GeologicalRecord, configuredImages: MediaAsset[]) {
  return [record.image, ...configuredImages, ...(record.gallery ?? [])]
    .filter((image, index, images) => images.findIndex((candidate) => candidate.src === image.src) === index);
}

function navigationItem(record: GeologicalRecord | undefined, records: GeologicalRecord[]): ExploreNavigationItem | undefined {
  if (!record) return undefined;
  const index = records.findIndex((candidate) => candidate.slug === record.slug);
  return { record, page: Math.floor(Math.max(0, index) / EXPLORE_PAGE_SIZE) + 1 };
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
  const query = parseExploreQuery(searchParams);
  const categories = listCategories();
  const allRecords = listRecords();
  const selectedCategory = selectedCategorySlug ? getCategoryBySlug(selectedCategorySlug) : undefined;
  if (selectedCategorySlug && !selectedCategory) notFound();

  const collectionEntries = categories.map((category) => ({
    category,
    count: allRecords.filter((record) => record.category === category.slug).length,
  }));

  if (!selectedCategory) {
    return <ExploreBrowser collections={collectionEntries} totalRecordCount={allRecords.length} query={query} />;
  }

  const categoryRecords = listRecords({ category: selectedCategory.slug });
  const filteredRecords = listRecords({
    category: selectedCategory.slug,
    q: query.q,
    type: query.type,
    region: query.region,
    age: query.age,
    formation: query.formation,
  });
  const pagination = paginateRecords(filteredRecords, query.page);
  const normalizedQuery = { ...query, page: pagination.page };
  const selectedRecord = selectedRecordSlug
    ? getRecordBySlug(selectedCategory.slug, selectedRecordSlug)
    : undefined;
  if (selectedRecordSlug && !selectedRecord) notFound();

  const selectedDetail = selectedRecord ? getRecordDetail(selectedRecord) : undefined;
  const configuredGallery = selectedDetail?.sections.find((section) => section.kind === "gallery");
  const gallery = selectedRecord
    ? uniqueGallery(selectedRecord, configuredGallery?.kind === "gallery" ? configuredGallery.images : [])
    : [];
  const activeImageIndex = normalizedQuery.image === undefined
    ? undefined
    : Math.min(normalizedQuery.image, Math.max(0, gallery.length - 1));

  const navigationRecords = selectedRecord && filteredRecords.some((record) => record.slug === selectedRecord.slug)
    ? filteredRecords
    : categoryRecords;
  const navigation = selectedRecord ? getRecordNavigation(navigationRecords, selectedRecord.slug) : undefined;
  const relatedRecords = selectedDetail?.related.flatMap((relation) => {
    const record = allRecords.find((candidate) => candidate.slug === relation.slug);
    return record ? [{ record, reason: relation.reason }] : [];
  }) ?? [];

  const filterDefinitions = getCategoryFilterDefinitions(selectedCategory.slug).map((definition) => ({
    ...definition,
    values: getRecordFilterOptions(selectedCategory.slug, definition.key),
  }));

  return <ExploreBrowser
    collections={collectionEntries}
    totalRecordCount={allRecords.length}
    query={{ ...normalizedQuery, image: activeImageIndex }}
    category={selectedCategory}
    collectionRecordCount={categoryRecords.length}
    filteredRecordCount={filteredRecords.length}
    pageRecords={pagination.items}
    page={pagination.page}
    totalPages={pagination.totalPages}
    startIndex={pagination.startIndex}
    filterDefinitions={filterDefinitions}
    selectedRecord={selectedRecord}
    selectedDetail={selectedDetail}
    gallery={gallery}
    relatedRecords={relatedRecords}
    navigation={navigation ? {
      previous: navigationItem(navigation.previous, navigationRecords),
      next: navigationItem(navigation.next, navigationRecords),
      position: navigation.position,
      total: navigationRecords.length,
    } : undefined}
  />;
}
