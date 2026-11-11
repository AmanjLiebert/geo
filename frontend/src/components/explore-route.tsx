import { notFound } from "next/navigation";
import {
  emptyPublicRecordDetail,
  mapPublicCategories,
  mapPublicRecord,
  mapPublicRecordDetail,
} from "@/content/public-explore";
import {
  getPublicRecord,
  listPublicCategories,
  listPublicRecords,
} from "@/lib/public-scientific-api";
import { ExploreBrowser, type ExploreRecordBundle } from "./explore-browser";
import { parseExploreQuery, type ExploreSearchParams } from "./explore-utils";

export async function ExploreRoute({
  selectedCategorySlug,
  selectedRecordSlug,
  searchParams,
}: {
  selectedCategorySlug?: string;
  selectedRecordSlug?: string;
  searchParams: ExploreSearchParams;
}) {
  const publicCategories = await listPublicCategories();
  const categories = mapPublicCategories(publicCategories);
  const selectedCategory = selectedCategorySlug
    ? categories.find((category) => category.slug === selectedCategorySlug)
    : undefined;
  if (selectedCategorySlug && !selectedCategory) notFound();

  const publicRecords = selectedCategorySlug
    ? await listPublicRecords(selectedCategorySlug)
    : [];
  const mappedRecords = publicRecords.map((record) =>
    mapPublicRecord(record, publicCategories),
  );
  const selectedSummary = selectedRecordSlug
    ? mappedRecords.find(
        (record) =>
          record.slug === selectedRecordSlug &&
          (record.categoryPath ?? [record.category]).includes(selectedCategorySlug ?? ""),
      )
    : undefined;
  if (selectedRecordSlug && !selectedSummary) notFound();

  let selectedBundle: ExploreRecordBundle | undefined;
  if (selectedSummary) {
    selectedBundle = mapPublicRecordDetail(
      await getPublicRecord(selectedSummary.recordId),
      publicCategories,
    );
  }

  const recordBundles: ExploreRecordBundle[] = mappedRecords.map((record) => {
    if (selectedBundle?.record.recordId === record.recordId) return selectedBundle;
    return {
      record,
      detail: emptyPublicRecordDetail(record),
      gallery: record.image.src ? [record.image] : [],
    };
  });
  const collections = categories.map((category) => ({
    category,
    count: category.recordCount,
  }));
  const collectionFilters = categories.map((category) => ({
    categorySlug: category.slug,
    definitions: [
      {
        key: "type" as const,
        label: "Record type",
        values: Array.from(
          new Set(
            mappedRecords
              .filter((record) =>
                (record.categoryPath ?? [record.category]).includes(category.slug),
              )
              .map((record) => record.recordType),
          ),
        ).sort((a, b) => a.localeCompare(b)),
      },
    ].filter((definition) => definition.values.length > 1),
  }));
  const initialQuery = parseExploreQuery(searchParams);

  return (
    <ExploreBrowser
      key={`${selectedCategorySlug ?? "root"}:${selectedRecordSlug ?? "list"}:${JSON.stringify(initialQuery)}`}
      collections={collections}
      recordBundles={recordBundles}
      collectionFilters={collectionFilters}
      initialCategorySlug={selectedCategorySlug}
      initialRecordSlug={selectedRecordSlug}
      initialQuery={initialQuery}
    />
  );
}
