"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, type SyntheticEvent } from "react";
import {
  Archive,
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Filter,
  ImageIcon,
  MapPin,
  Search,
  X,
  ZoomIn,
} from "lucide-react";
import { ReferenceList } from "@/components/content-interface";
import type {
  CategoryFilterDefinition,
  GeologicalCategory,
  GeologicalRecord,
  GeologicalRecordDetail,
  MediaAsset,
} from "@/content/types";
import {
  buildExploreHref,
  exploreFilterKeys,
  getRecordPreviewFacts,
  type ExploreQueryState,
} from "./explore-utils";

type CollectionEntry = { category: GeologicalCategory; count: number };
type ExploreFilterDefinition = CategoryFilterDefinition & { values: string[] };
type RelatedRecord = { record: GeologicalRecord; reason: string };

export type ExploreNavigationItem = { record: GeologicalRecord; page: number };

type ExploreNavigation = {
  previous?: ExploreNavigationItem;
  next?: ExploreNavigationItem;
  position?: number;
  total: number;
};

interface ExploreBrowserProps {
  collections: CollectionEntry[];
  totalRecordCount: number;
  query: ExploreQueryState;
  category?: GeologicalCategory;
  collectionRecordCount?: number;
  filteredRecordCount?: number;
  pageRecords?: GeologicalRecord[];
  page?: number;
  totalPages?: number;
  startIndex?: number;
  filterDefinitions?: ExploreFilterDefinition[];
  selectedRecord?: GeologicalRecord;
  selectedDetail?: GeologicalRecordDetail;
  gallery?: MediaAsset[];
  relatedRecords?: RelatedRecord[];
  navigation?: ExploreNavigation;
}

const emptyQuery: ExploreQueryState = {
  q: "",
  type: "",
  region: "",
  age: "",
  formation: "",
  page: 1,
};

function CollectionIndex({ collections, activeSlug }: { collections: CollectionEntry[]; activeSlug?: string }) {
  return <aside className="explore-collection-index" aria-labelledby="collection-index-title">
    <div className="explore-index-heading">
      <div>
        <span>Catalogue</span>
        <h2 id="collection-index-title">Collections</h2>
      </div>
      <strong>{collections.length}</strong>
    </div>
    <nav aria-label="Geological collections">
      {collections.map(({ category, count }, index) => {
        const active = activeSlug === category.slug;
        return <Link
          className={`explore-collection-link${active ? " active" : ""}`}
          href={active ? "/explore" : `/explore/${category.slug}`}
          scroll={false}
          aria-current={active ? "page" : undefined}
          aria-label={active ? `Close ${category.name} collection` : `Open ${category.name} collection`}
          key={category.slug}
        >
          <span className="explore-collection-number">{String(index + 1).padStart(2, "0")}</span>
          <span className="explore-collection-thumb"><Image src={category.image.src} alt="" fill sizes="54px" /></span>
          <span className="explore-collection-copy"><strong>{category.name}</strong><small>{category.description}</small></span>
          <span className="explore-collection-count">{count}<small>records</small></span>
          {active ? <X aria-hidden="true" /> : <ArrowRight aria-hidden="true" />}
        </Link>;
      })}
    </nav>
  </aside>;
}

function OverviewPanel({ collectionCount, recordCount }: { collectionCount: number; recordCount: number }) {
  return <section className="explore-overview-panel" aria-labelledby="explore-overview-title">
    <div className="explore-overview-mark"><Archive aria-hidden="true" /><span>GK / Archive</span></div>
    <div>
      <p className="eyebrow">Start exploring</p>
      <h2 id="explore-overview-title">Choose a collection.</h2>
      <p>Open a subject to read its records as one continuous catalogue. Your place stays intact while you inspect records and images.</p>
    </div>
    <dl>
      <div><dt>Collections</dt><dd>{String(collectionCount).padStart(2, "0")}</dd></div>
      <div><dt>Catalogue records</dt><dd>{recordCount}</dd></div>
      <div><dt>Reading flow</dt><dd>Open · inspect · continue</dd></div>
    </dl>
  </section>;
}

function ActiveRefinements({ category, query }: { category: GeologicalCategory; query: ExploreQueryState }) {
  const refinements = [
    ...(query.q ? [{ key: "q", label: `“${query.q}”` }] : []),
    ...exploreFilterKeys.flatMap((key) => query[key] ? [{ key, label: query[key] }] : []),
  ];
  if (!refinements.length) return null;
  const path = `/explore/${category.slug}`;
  return <div className="explore-active-refinements" aria-label="Active refinements">
    <span>Showing</span>
    {refinements.map((refinement) => <Link
      href={buildExploreHref(path, query, { [refinement.key]: "", page: 1, image: undefined })}
      scroll={false}
      key={`${refinement.key}-${refinement.label}`}
    >{refinement.label}<X aria-hidden="true" /></Link>)}
    <Link className="explore-clear-refinements" href={path} scroll={false}>Clear all</Link>
  </div>;
}

function CollectionTools({
  category,
  query,
  definitions,
}: {
  category: GeologicalCategory;
  query: ExploreQueryState;
  definitions: ExploreFilterDefinition[];
}) {
  const path = `/explore/${category.slug}`;
  const activeFilterCount = exploreFilterKeys.filter((key) => query[key]).length;
  return <div className="explore-tools">
    <form className="explore-collection-search" action={path}>
      {exploreFilterKeys.map((key) => query[key] ? <input key={key} type="hidden" name={key} value={query[key]} /> : null)}
      <label htmlFor="collection-search"><Search aria-hidden="true" /><span className="sr-only">Search {category.name}</span></label>
      <input id="collection-search" name="q" defaultValue={query.q} placeholder={`Search ${category.name.toLowerCase()}`} />
      <button type="submit">Search</button>
    </form>
    {definitions.length > 0 && <details className="explore-filter-panel">
      <summary><Filter aria-hidden="true" /> Refine{activeFilterCount > 0 ? ` · ${activeFilterCount}` : ""}</summary>
      <div>
        <div className="explore-filter-panel-heading"><span>Collection filters</span><Link href={path} scroll={false}>Reset</Link></div>
        {definitions.map((definition) => <fieldset key={definition.key}>
          <legend>{definition.label}</legend>
          <div>
            <Link
              className={!query[definition.key] ? "active" : ""}
              href={buildExploreHref(path, query, { [definition.key]: "", page: 1, image: undefined })}
              scroll={false}
            >All</Link>
            {definition.values.map((value) => <Link
              className={query[definition.key] === value ? "active" : ""}
              href={buildExploreHref(path, query, { [definition.key]: value, page: 1, image: undefined })}
              scroll={false}
              key={value}
            >{value}</Link>)}
          </div>
        </fieldset>)}
      </div>
    </details>}
  </div>;
}

function RecordRow({ record, query }: { record: GeologicalRecord; query: ExploreQueryState }) {
  const href = buildExploreHref(`/explore/${record.category}/${record.slug}`, query, { image: undefined });
  const facts = getRecordPreviewFacts(record);
  return <Link className="explore-record-row" href={href} scroll={false}>
    <span className="explore-record-image"><Image src={record.image.src} alt={record.image.alt} fill sizes="(max-width: 680px) 120px, 176px" />{record.mediaStatus === "reference" && <small>Reference image</small>}</span>
    <article>
      <div className="explore-record-meta"><span>{record.recordType}</span><span>{record.recordId}</span></div>
      <h3>{record.name}</h3>
      <p>{record.summary}</p>
      <dl>{facts.map((fact) => <div key={`${fact.label}-${fact.value}`}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl>
    </article>
    <span className="explore-record-open"><span>Open record</span><ArrowRight aria-hidden="true" /></span>
  </Link>;
}

function Pagination({ category, query, page, totalPages }: { category: GeologicalCategory; query: ExploreQueryState; page: number; totalPages: number }) {
  if (totalPages <= 1) return null;
  const path = `/explore/${category.slug}`;
  return <nav className="explore-pagination" aria-label="Record pages">
    {page > 1 ? <Link href={buildExploreHref(path, query, { page: page - 1, image: undefined })} scroll={false}><ChevronLeft aria-hidden="true" /><span>Previous</span></Link> : <span aria-disabled="true"><ChevronLeft aria-hidden="true" /><span>Previous</span></span>}
    <div>{Array.from({ length: totalPages }, (_, index) => index + 1).map((number) => <Link
      className={number === page ? "active" : ""}
      aria-current={number === page ? "page" : undefined}
      href={buildExploreHref(path, query, { page: number, image: undefined })}
      scroll={false}
      key={number}
    >{String(number).padStart(2, "0")}</Link>)}</div>
    {page < totalPages ? <Link href={buildExploreHref(path, query, { page: page + 1, image: undefined })} scroll={false}><span>Next</span><ChevronRight aria-hidden="true" /></Link> : <span aria-disabled="true"><span>Next</span><ChevronRight aria-hidden="true" /></span>}
  </nav>;
}

function DetailSections({ detail }: { detail: GeologicalRecordDetail }) {
  return <>
    {detail.discovery && <section><p className="eyebrow">Discovery information</p><h3>How this record was framed</h3><p>{detail.discovery}</p></section>}
    {detail.formationContext && <section><p className="eyebrow">Formation context</p><h3>What the evidence supports</h3><p>{detail.formationContext}</p></section>}
    {detail.sections.map((section, index) => {
      if (section.kind === "gallery") return null;
      if (section.kind === "facts") return <section key={`${section.kind}-${index}`}><p className="eyebrow">Structured evidence</p><h3>{section.title}</h3><dl className="explore-detail-facts">{section.items.map((item) => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl></section>;
      if (section.kind === "classification") return <section key={`${section.kind}-${index}`}><p className="eyebrow">Scientific context</p><h3>{section.title}</h3><ul className="explore-detail-classification">{section.items.map((item) => <li key={item}>{item}</li>)}</ul></section>;
      if (section.kind === "references") return <section key={`${section.kind}-${index}`}><p className="eyebrow">Sources and limits</p><h3>{section.title}</h3><ReferenceList items={section.items} /></section>;
      return <section key={`${section.kind}-${index}`}><p className="eyebrow">Interpretation</p><h3>{section.title}</h3>{section.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</section>;
    })}
  </>;
}

function ImageViewer({
  record,
  gallery,
  imageIndex,
  query,
  onClose,
}: {
  record: GeologicalRecord;
  gallery: MediaAsset[];
  imageIndex: number;
  query: ExploreQueryState;
  onClose: () => void;
}) {
  const image = gallery[imageIndex];
  const previous = imageIndex === 0 ? gallery.length - 1 : imageIndex - 1;
  const next = imageIndex === gallery.length - 1 ? 0 : imageIndex + 1;
  const path = `/explore/${record.category}/${record.slug}`;
  return <div className="explore-image-viewer">
    <header><div><span>Image {imageIndex + 1} / {gallery.length}</span><strong>{record.name}</strong></div><button type="button" onClick={onClose} autoFocus><X aria-hidden="true" /><span>Close image</span></button></header>
    <figure>
      <div><Image src={image.src} alt={image.alt} fill priority sizes="100vw" /></div>
      <figcaption><span>{image.caption}</span>{image.credit && <small>{image.credit}</small>}</figcaption>
    </figure>
    {gallery.length > 1 && <nav aria-label="Gallery images">
      <Link href={buildExploreHref(path, query, { image: previous })} scroll={false}><ChevronLeft aria-hidden="true" /><span>Previous image</span></Link>
      <div>{gallery.map((item, index) => <Link className={index === imageIndex ? "active" : ""} href={buildExploreHref(path, query, { image: index })} scroll={false} aria-label={`Open image ${index + 1}: ${item.caption}`} key={`${item.src}-${index}`}><Image src={item.src} alt="" fill sizes="64px" /></Link>)}</div>
      <Link href={buildExploreHref(path, query, { image: next })} scroll={false}><span>Next image</span><ChevronRight aria-hidden="true" /></Link>
    </nav>}
  </div>;
}

function RecordDialog({
  category,
  record,
  detail,
  gallery,
  relatedRecords,
  navigation,
  query,
}: {
  category: GeologicalCategory;
  record: GeologicalRecord;
  detail: GeologicalRecordDetail;
  gallery: MediaAsset[];
  relatedRecords: RelatedRecord[];
  navigation?: ExploreNavigation;
  query: ExploreQueryState;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const categoryPath = `/explore/${category.slug}`;
  const recordPath = `/explore/${record.category}/${record.slug}`;
  const closeHref = buildExploreHref(categoryPath, query, { image: undefined });
  const closeImageHref = buildExploreHref(recordPath, query, { image: undefined });
  const imageIndex = query.image;

  const closeRecord = useCallback(() => {
    dialogRef.current?.close();
    router.replace(closeHref, { scroll: false });
  }, [closeHref, router]);

  const closeImage = useCallback(() => {
    router.replace(closeImageHref, { scroll: false });
  }, [closeImageHref, router]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  useEffect(() => {
    if (imageIndex === undefined) dialogRef.current?.querySelector(".explore-sheet-scroll")?.scrollTo({ top: 0 });
  }, [record.slug, imageIndex]);

  const onCancel = (event: SyntheticEvent<HTMLDialogElement>) => {
    event.preventDefault();
    if (imageIndex !== undefined) closeImage(); else closeRecord();
  };

  if (imageIndex !== undefined && gallery[imageIndex]) {
    return <dialog ref={dialogRef} className="explore-record-dialog explore-image-dialog" onCancel={onCancel} aria-label={`${record.name} image viewer`}>
      <ImageViewer record={record} gallery={gallery} imageIndex={imageIndex} query={query} onClose={closeImage} />
    </dialog>;
  }

  const recordLink = (item: ExploreNavigationItem) => buildExploreHref(
    `/explore/${item.record.category}/${item.record.slug}`,
    query,
    { page: item.page, image: undefined },
  );

  return <dialog ref={dialogRef} className="explore-record-dialog" onCancel={onCancel} aria-labelledby="explore-record-title">
    <div className="explore-sheet-shell">
      <header className="explore-sheet-header">
        <div><span>{category.name} · {record.recordId}</span><strong>{navigation?.position ?? "—"} / {navigation?.total ?? "—"}</strong></div>
        <button type="button" onClick={closeRecord} autoFocus><X aria-hidden="true" /><span>Close record</span></button>
      </header>
      <div className="explore-sheet-scroll">
        <section className="explore-sheet-lead">
          <Link className="explore-sheet-image" href={buildExploreHref(recordPath, query, { image: 0 })} scroll={false} aria-label={`Open ${record.name} image`}>
            <Image src={record.image.src} alt={record.image.alt} fill priority sizes="(max-width: 760px) 100vw, 420px" />
            <span><ZoomIn aria-hidden="true" /> Open image</span>
            {gallery.length > 1 && <small><ImageIcon aria-hidden="true" /> {gallery.length} images</small>}
          </Link>
          <div className="explore-sheet-intro">
            <div className="explore-sheet-kicker"><span>{record.recordType}</span><span>{record.status}</span></div>
            <h2 id="explore-record-title">{record.name}</h2>
            <p>{record.summary}</p>
            <div className="explore-sheet-place"><MapPin aria-hidden="true" /><span><strong>{record.locality}</strong><small>{record.region}</small></span></div>
            {record.classification?.length ? <ul>{record.classification.map((item) => <li key={item}>{item}</li>)}</ul> : null}
          </div>
        </section>

        <div className="explore-sheet-content">
          <aside>
            <h3>Record facts</h3>
            <dl>
              <div><dt>Record ID</dt><dd>{record.recordId}</dd></div>
              <div><dt>Collection</dt><dd>{category.name}</dd></div>
              <div><dt>Locality</dt><dd>{record.locality}</dd></div>
              <div><dt>Region</dt><dd>{record.region}</dd></div>
              {record.geologicalAge && <div><dt>Geological age</dt><dd>{record.geologicalAge}</dd></div>}
              {record.formation && <div><dt>Formation</dt><dd>{record.formation}</dd></div>}
              {record.coordinates && <div><dt>Coordinates</dt><dd>{record.coordinates[0].toFixed(3)}° N, {record.coordinates[1].toFixed(3)}° E</dd></div>}
            </dl>
            <div className="explore-review-note"><span>Showcase record</span><p>Scientific wording remains editable until regional experts complete review.</p></div>
          </aside>
          <article>
            <section><p className="eyebrow">Record overview</p><h3>Reading the evidence</h3><p className="explore-sheet-lead-copy">{record.description}</p><p>{record.sourceNote}</p></section>
            <DetailSections detail={detail} />
            {gallery.length > 1 && <section><p className="eyebrow">Media record</p><h3>Field documentation</h3><div className="explore-sheet-gallery">{gallery.map((image, index) => <Link href={buildExploreHref(recordPath, query, { image: index })} scroll={false} key={`${image.src}-${index}`}><span><Image src={image.src} alt={image.alt} fill sizes="160px" /></span><small>{image.caption}</small></Link>)}</div></section>}
            {relatedRecords.length > 0 && <section><p className="eyebrow">Related evidence</p><h3>Continue from this record</h3><div className="explore-related-records">{relatedRecords.map(({ record: related, reason }) => <Link href={buildExploreHref(`/explore/${related.category}/${related.slug}`, emptyQuery)} scroll={false} key={related.slug}><span>{reason}</span><strong>{related.name}</strong><ArrowRight aria-hidden="true" /></Link>)}</div></section>}
          </article>
        </div>
      </div>
      <footer className="explore-sheet-navigation">
        {navigation?.previous ? <Link href={recordLink(navigation.previous)} scroll={false}><ArrowLeft aria-hidden="true" /><span><small>Previous record</small><strong>{navigation.previous.record.name}</strong></span></Link> : <span aria-disabled="true"><ArrowLeft aria-hidden="true" /><span><small>Previous record</small><strong>Start of collection</strong></span></span>}
        {navigation?.next ? <Link href={recordLink(navigation.next)} scroll={false}><span><small>Next record</small><strong>{navigation.next.record.name}</strong></span><ArrowRight aria-hidden="true" /></Link> : <span aria-disabled="true"><span><small>Next record</small><strong>End of collection</strong></span><ArrowRight aria-hidden="true" /></span>}
      </footer>
    </div>
  </dialog>;
}

export function ExploreBrowser({
  collections,
  totalRecordCount,
  query,
  category,
  collectionRecordCount = 0,
  filteredRecordCount = 0,
  pageRecords = [],
  page = 1,
  totalPages = 1,
  startIndex = 0,
  filterDefinitions = [],
  selectedRecord,
  selectedDetail,
  gallery = [],
  relatedRecords = [],
  navigation,
}: ExploreBrowserProps) {
  const hasRefinements = Boolean(query.q || exploreFilterKeys.some((key) => query[key]));
  const visibleRange = useMemo(() => {
    if (!filteredRecordCount) return "0";
    return `${startIndex + 1}–${Math.min(startIndex + pageRecords.length, filteredRecordCount)}`;
  }, [filteredRecordCount, pageRecords.length, startIndex]);

  return <main className="explore-workspace-page">
    <header className="explore-workspace-header">
      <div className="shell">
        <div className="explore-workspace-title"><span><Archive aria-hidden="true" /></span><div><p>Geological catalogue</p><h1>Explore</h1></div></div>
        <p>Open a collection, inspect a record, then continue exactly where you left off.</p>
        <dl><div><dt>Collections</dt><dd>{String(collections.length).padStart(2, "0")}</dd></div><div><dt>Records</dt><dd>{totalRecordCount}</dd></div></dl>
      </div>
    </header>

    <div className="shell explore-workspace-layout">
      <CollectionIndex collections={collections} activeSlug={category?.slug} />
      {!category ? <OverviewPanel collectionCount={collections.length} recordCount={totalRecordCount} /> : <section className="explore-record-workspace" aria-labelledby="active-collection-title">
        <header className="explore-active-collection">
          <div>
            <p className="eyebrow">{category.eyebrow}</p>
            <h2 id="active-collection-title">{category.name}</h2>
            <p>{category.description}</p>
          </div>
          <div className="explore-active-count"><strong>{collectionRecordCount}</strong><span>catalogue records</span><Link href="/explore" scroll={false}><X aria-hidden="true" /> Close collection</Link></div>
        </header>
        <CollectionTools category={category} query={query} definitions={filterDefinitions} />
        <ActiveRefinements category={category} query={query} />
        <div className="explore-results-summary"><p><strong>{filteredRecordCount}</strong> {filteredRecordCount === 1 ? "record" : "records"}</p><span>{filteredRecordCount ? `Showing ${visibleRange}` : "No matching records"}</span></div>
        {pageRecords.length ? <div className="explore-record-list">{pageRecords.map((record) => <RecordRow record={record} query={query} key={record.slug} />)}</div> : <div className="explore-empty-results"><Archive aria-hidden="true" /><span>0 records</span><h3>No records match this view.</h3><p>Remove a refinement or search with a broader term.</p>{hasRefinements && <Link href={`/explore/${category.slug}`} scroll={false}>Clear refinements</Link>}</div>}
        <Pagination category={category} query={query} page={page} totalPages={totalPages} />
      </section>}
    </div>

    {category && selectedRecord && selectedDetail && <RecordDialog category={category} record={selectedRecord} detail={selectedDetail} gallery={gallery} relatedRecords={relatedRecords} navigation={navigation} query={query} />}
  </main>;
}
