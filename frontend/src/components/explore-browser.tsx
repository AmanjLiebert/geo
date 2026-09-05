"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type SyntheticEvent } from "react";
import {
  Archive,
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { ReferenceList } from "@/components/content-interface";
import { NeoBadge } from "@/components/neo-badge";
import type {
  CategoryFilterDefinition,
  GeologicalCategory,
  GeologicalRecord,
  GeologicalRecordDetail,
  MediaAsset,
} from "@/content/types";
import {
  buildExploreHref,
  EXPLORE_PAGE_SIZE,
  exploreFilterKeys,
  filterExploreRecords,
  getRecordNavigation,
  getRecordPreviewFacts,
  paginateRecords,
  parseExploreQuery,
  type ExploreQueryState,
} from "./explore-utils";

type CollectionEntry = { category: GeologicalCategory; count: number };
type ExploreFilterDefinition = CategoryFilterDefinition & { values: string[] };
type CollectionFilterSet = { categorySlug: string; definitions: ExploreFilterDefinition[] };

export type ExploreRecordBundle = {
  record: GeologicalRecord;
  detail: GeologicalRecordDetail;
  gallery: MediaAsset[];
};

interface ExploreBrowserProps {
  collections: CollectionEntry[];
  recordBundles: ExploreRecordBundle[];
  collectionFilters: CollectionFilterSet[];
  initialCategorySlug?: string;
  initialRecordSlug?: string;
  initialQuery: ExploreQueryState;
}

const emptyQuery: ExploreQueryState = {
  q: "",
  type: "",
  region: "",
  age: "",
  formation: "",
  page: 1,
};

const COLLECTIONS_PER_PAGE = 6;

function readLocationState() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  return {
    categorySlug: parts[0] === "explore" ? parts[1] : undefined,
    recordSlug: parts[0] === "explore" ? parts[2] : undefined,
    query: parseExploreQuery(Object.fromEntries(new URLSearchParams(window.location.search))),
  };
}

function CollectionChooser({
  collections,
  onSelect,
  compact = false,
}: {
  collections: CollectionEntry[];
  onSelect: (slug: string) => void;
  compact?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const filtered = collections.filter(({ category }) => [category.name, category.description, ...category.themes]
    .join(" ").toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  const totalPages = Math.max(1, Math.ceil(filtered.length / COLLECTIONS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const visible = filtered.slice((safePage - 1) * COLLECTIONS_PER_PAGE, safePage * COLLECTIONS_PER_PAGE);

  const updateSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  return <section className={`catalog-chooser${compact ? " catalog-chooser--compact" : ""}`} aria-labelledby={compact ? "collection-dialog-title" : "collection-chooser-title"}>
    <header>
      <div><p className="eyebrow">Geological catalogue</p><h2 id={compact ? "collection-dialog-title" : "collection-chooser-title"}>Choose a collection</h2></div>
      <NeoBadge className="catalog-chooser-summary-badge">{collections.length} subjects · {collections.reduce((total, item) => total + item.count, 0)} records</NeoBadge>
    </header>
    {collections.length > COLLECTIONS_PER_PAGE && <label className="catalog-chooser-search"><Search aria-hidden="true" /><span className="sr-only">Find a collection</span><input value={search} onChange={(event) => updateSearch(event.target.value)} placeholder="Find a collection" /></label>}
    <div className="catalog-chooser-grid">
      {visible.map(({ category, count }) => <button type="button" className="catalog-collection-button" onClick={() => onSelect(category.slug)} key={category.slug}>
        <span className="catalog-collection-image"><Image src={category.image.src} alt="" fill sizes="(max-width: 640px) 120px, 190px" /></span>
        <span className="catalog-collection-body">
          <span className="catalog-collection-meta"><NeoBadge className="catalog-collection-count-badge">{count} records</NeoBadge><small>Collection</small></span>
          <strong className="catalog-collection-title">{category.name}</strong>
          <span className="catalog-collection-caption">{category.image.caption}</span>
          <i><span>Open collection</span><em><ArrowRight aria-hidden="true" /></em></i>
        </span>
      </button>)}
    </div>
    {!visible.length && <div className="catalog-chooser-empty"><Archive aria-hidden="true" /><strong>No collection matches “{search}”.</strong><button type="button" className="catalog-action catalog-action--secondary" onClick={() => updateSearch("")}>Clear search</button></div>}
    {totalPages > 1 && <nav className="catalog-chooser-pagination" aria-label="Collection pages">
      <button type="button" className="catalog-action catalog-action--secondary catalog-action--icon" onClick={() => setPage(Math.max(1, safePage - 1))} disabled={safePage === 1} aria-label="Previous collection page"><ChevronLeft aria-hidden="true" /></button>
      <span>Page {safePage} of {totalPages}</span>
      <button type="button" className="catalog-action catalog-action--secondary catalog-action--icon" onClick={() => setPage(Math.min(totalPages, safePage + 1))} disabled={safePage === totalPages} aria-label="Next collection page"><ChevronRight aria-hidden="true" /></button>
    </nav>}
  </section>;
}

function FullscreenImage({ image, recordName, onClose }: { image: MediaAsset; recordName: string; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [zoom, setZoom] = useState(1);
  useEffect(() => { if (dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal(); }, []);
  const onCancel = (event: SyntheticEvent<HTMLDialogElement>) => { event.preventDefault(); onClose(); };
  return <dialog ref={dialogRef} className="catalog-image-dialog" onCancel={onCancel} aria-label={`${recordName} image`}>
    <header>
      <div><span>Image viewer</span><strong>{recordName}</strong></div>
      <div className="catalog-image-dialog-tools">
        <button type="button" className="catalog-action catalog-action--light catalog-action--icon" onClick={() => setZoom(Math.max(1, zoom - .5))} disabled={zoom === 1} aria-label="Zoom out"><ZoomOut aria-hidden="true" /></button>
        <span>{Math.round(zoom * 100)}%</span>
        <button type="button" className="catalog-action catalog-action--light catalog-action--icon" onClick={() => setZoom(Math.min(2.5, zoom + .5))} disabled={zoom === 2.5} aria-label="Zoom in"><ZoomIn aria-hidden="true" /></button>
        <button type="button" className="catalog-action catalog-action--light" onClick={onClose} autoFocus><X aria-hidden="true" /> Close</button>
      </div>
    </header>
    <figure><div className="catalog-image-dialog-canvas"><span style={{ width: `${zoom * 100}%`, height: `${zoom * 100}%` }}><Image src={image.src} alt={image.alt} fill priority sizes="100vw" /></span></div><figcaption><span>{image.caption}</span>{image.credit && <small>{image.credit}</small>}</figcaption></figure>
  </dialog>;
}

function RecordReader({
  bundle,
  position,
  total,
  previous,
  next,
  activeImage,
  relatedBundles,
  onBack,
  onRecord,
  onImage,
  onRelated,
}: {
  bundle: ExploreRecordBundle;
  position: number;
  total: number;
  previous?: GeologicalRecord;
  next?: GeologicalRecord;
  activeImage: number;
  relatedBundles: Array<{ bundle: ExploreRecordBundle; reason: string }>;
  onBack: () => void;
  onRecord: (record: GeologicalRecord) => void;
  onImage: (index: number) => void;
  onRelated: (record: GeologicalRecord) => void;
}) {
  const { record, detail, gallery } = bundle;
  const [fullscreen, setFullscreen] = useState(false);
  const image = gallery[activeImage] ?? gallery[0];
  const previousImage = activeImage === 0 ? gallery.length - 1 : activeImage - 1;
  const nextImage = activeImage === gallery.length - 1 ? 0 : activeImage + 1;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !fullscreen) onBack();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [fullscreen, onBack]);

  return <section className="catalog-reader catalog-record-page" aria-labelledby="catalog-reader-title">
    <nav className="catalog-record-toolbar" aria-label="Record navigation">
      <button type="button" className="catalog-record-nav-button" onClick={onBack} aria-label="Back to collection"><ArrowLeft aria-hidden="true" /><span>Collection</span></button>
      <span className="catalog-record-position"><strong>{position}</strong> of {total}</span>
      <div>
        <button type="button" className="catalog-record-nav-button" onClick={() => previous && onRecord(previous)} disabled={!previous}><ChevronLeft aria-hidden="true" /><span>Previous</span></button>
        <button type="button" className="catalog-record-nav-button" onClick={() => next && onRecord(next)} disabled={!next}><span>Next</span><ChevronRight aria-hidden="true" /></button>
      </div>
    </nav>

    <header className="catalog-record-page-header">
      <div className="catalog-record-kicker"><NeoBadge>{record.recordType}</NeoBadge><NeoBadge variant="dark">{record.recordId}</NeoBadge><NeoBadge variant="clay">{record.status}</NeoBadge></div>
      <h2 id="catalog-reader-title">{record.name}</h2>
      <p>{record.summary}</p>
      <dl>
        <div><dt>Locality</dt><dd>{record.locality}</dd></div>
        <div><dt>Region</dt><dd>{record.region}</dd></div>
        {record.geologicalAge && <div><dt>Age</dt><dd>{record.geologicalAge}</dd></div>}
        {record.formation && <div><dt>Formation</dt><dd>{record.formation}</dd></div>}
      </dl>
    </header>

    <div className="catalog-record-reading-layout">
      <aside className="catalog-record-gallery-card" aria-label={`${record.name} gallery`}>
        <header><span>Record gallery</span><strong>{activeImage + 1} / {gallery.length}</strong></header>
        <div className="catalog-record-gallery-stage">
          <Image src={image.src} alt={image.alt} fill priority sizes="(max-width: 820px) 100vw, 420px" />
          {gallery.length > 1 && <>
            <button type="button" className="catalog-record-gallery-arrow catalog-record-gallery-arrow--previous" onClick={() => onImage(previousImage)} aria-label="Previous image"><ChevronLeft aria-hidden="true" /></button>
            <button type="button" className="catalog-record-gallery-arrow catalog-record-gallery-arrow--next" onClick={() => onImage(nextImage)} aria-label="Next image"><ChevronRight aria-hidden="true" /></button>
          </>}
          <button type="button" className="catalog-record-gallery-zoom" onClick={() => setFullscreen(true)}><ZoomIn aria-hidden="true" /> Open image</button>
        </div>
        <div className="catalog-record-gallery-thumbnails">
          {gallery.map((item, index) => <button type="button" className={index === activeImage ? "active" : ""} onClick={() => onImage(index)} aria-label={`Show image ${index + 1}: ${item.caption}`} aria-pressed={index === activeImage} key={`${item.src}-${index}`}><Image src={item.src} alt="" fill sizes="70px" /></button>)}
        </div>
        <p>{image.caption}</p>
        {image.credit && <small>{image.credit}</small>}
      </aside>

      <article className="catalog-record-article">
        <section className="catalog-record-introduction"><p className="eyebrow">Record overview</p><h3>Reading the evidence</h3><p>{record.description}</p></section>
        {detail.discovery && <section><p className="eyebrow">Discovery</p><h3>How this record was framed</h3><p>{detail.discovery}</p></section>}
        {detail.formationContext && <section><p className="eyebrow">Geological context</p><h3>What the evidence supports</h3><p>{detail.formationContext}</p></section>}
        {detail.sections.map((section, index) => {
          if (section.kind === "gallery") return null;
          if (section.kind === "facts") return <section key={`${section.title}-${index}`}><p className="eyebrow">Structured evidence</p><h3>{section.title}</h3><dl className="catalog-reader-facts">{section.items.map((item) => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl></section>;
          if (section.kind === "classification") return <section key={`${section.title}-${index}`}><p className="eyebrow">Classification</p><h3>{section.title}</h3><ul className="catalog-reader-classification">{section.items.map((item) => <li key={item}>{item}</li>)}</ul></section>;
          if (section.kind === "references") return <section key={`${section.title}-${index}`}><p className="eyebrow">References</p><h3>{section.title}</h3><ReferenceList items={section.items} /></section>;
          return <section key={`${section.title}-${index}`}><p className="eyebrow">Interpretation</p><h3>{section.title}</h3>{section.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</section>;
        })}
        <section><p className="eyebrow">Editorial note</p><h3>Source and review status</h3><p>{record.sourceNote}</p><aside className="catalog-review-note"><strong>Showcase record</strong><p>Scientific wording remains editable until regional experts complete review.</p></aside></section>
      </article>
    </div>

    {relatedBundles.length > 0 && <section className="catalog-record-related" aria-labelledby="catalog-related-title">
      <header><p className="eyebrow">Related evidence</p><h3 id="catalog-related-title">Continue exploring</h3></header>
      <div>{relatedBundles.map(({ bundle: related, reason }) => <button type="button" onClick={() => onRelated(related.record)} key={related.record.slug}><span className="catalog-record-related-image"><Image src={related.record.image.src} alt="" fill sizes="180px" /></span><span><small>{reason}</small><strong>{related.record.name}</strong><b>{related.record.recordId}</b></span><ArrowRight aria-hidden="true" /></button>)}</div>
    </section>}
    {fullscreen && <FullscreenImage image={image} recordName={record.name} onClose={() => setFullscreen(false)} />}
  </section>;
}

export function ExploreBrowser({
  collections,
  recordBundles,
  collectionFilters,
  initialCategorySlug,
  initialRecordSlug,
  initialQuery,
}: ExploreBrowserProps) {
  const records = useMemo(() => recordBundles.map((bundle) => bundle.record), [recordBundles]);
  const [categorySlug, setCategorySlug] = useState(initialCategorySlug);
  const [recordSlug, setRecordSlug] = useState(initialRecordSlug);
  const [query, setQuery] = useState(initialQuery);
  const [searchDraft, setSearchDraft] = useState(initialQuery.q);
  const collectionScrollRef = useRef(0);

  const category = collections.find((item) => item.category.slug === categorySlug)?.category;
  const selectedBundle = recordBundles.find((bundle) => bundle.record.category === categorySlug && bundle.record.slug === recordSlug);
  const categoryRecords = category ? records.filter((record) => record.category === category.slug) : [];
  const filteredRecords = category ? filterExploreRecords(records, category.slug, query) : [];
  const pagination = paginateRecords(filteredRecords, query.page);
  const navigationRecords = selectedBundle && filteredRecords.some((record) => record.slug === selectedBundle.record.slug) ? filteredRecords : categoryRecords;
  const navigation = selectedBundle ? getRecordNavigation(navigationRecords, selectedBundle.record.slug) : undefined;
  const activeImage = selectedBundle ? Math.min(query.image ?? 0, Math.max(0, selectedBundle.gallery.length - 1)) : 0;
  const filterDefinitions = collectionFilters.find((item) => item.categorySlug === categorySlug)?.definitions ?? [];

  const commitView = useCallback((nextCategory: string | undefined, nextRecord: string | undefined, nextQuery: ExploreQueryState, mode: "push" | "replace" = "push", scroll = true) => {
    const pathname = nextRecord ? `/explore/${nextCategory}/${nextRecord}` : nextCategory ? `/explore/${nextCategory}` : "/explore";
    const href = buildExploreHref(pathname, nextQuery);
    window.history[mode === "push" ? "pushState" : "replaceState"]({}, "", href);
    setCategorySlug(nextCategory);
    setRecordSlug(nextRecord);
    setQuery(nextQuery);
    setSearchDraft(nextQuery.q);
    if (scroll) requestAnimationFrame(() => document.getElementById("catalog-explorer-surface")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, []);

  useEffect(() => {
    const onPopState = () => {
      const state = readLocationState();
      setCategorySlug(state.categorySlug);
      setRecordSlug(state.recordSlug);
      setQuery(state.query);
      setSearchDraft(state.query.q);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const openCollection = (slug: string) => {
    commitView(slug, undefined, emptyQuery);
  };
  const closeCollection = () => commitView(undefined, undefined, emptyQuery);
  const openRecord = (record: GeologicalRecord, mode: "push" | "replace" = "push") => {
    if (mode === "push") collectionScrollRef.current = window.scrollY;
    const index = filteredRecords.findIndex((candidate) => candidate.slug === record.slug);
    const page = index >= 0 ? Math.floor(index / EXPLORE_PAGE_SIZE) + 1 : query.page;
    commitView(record.category, record.slug, { ...query, page, image: undefined }, mode);
  };
  const closeRecord = () => {
    if (!category) return;
    commitView(category.slug, undefined, { ...query, image: undefined }, "replace", false);
    requestAnimationFrame(() => window.scrollTo({ top: collectionScrollRef.current, behavior: "auto" }));
  };
  const updateQuery = (patch: Partial<ExploreQueryState>, mode: "push" | "replace" = "push", scroll = true) => {
    if (!category) return;
    commitView(category.slug, recordSlug, { ...query, ...patch }, mode, scroll);
  };
  const onSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateQuery({ q: searchDraft.trim(), page: 1, image: undefined });
  };
  const openRelated = (record: GeologicalRecord) => commitView(record.category, record.slug, { ...emptyQuery }, "replace");
  const relatedBundles = selectedBundle?.detail.related.flatMap((relation) => {
    const bundle = recordBundles.find((candidate) => candidate.record.slug === relation.slug);
    return bundle ? [{ bundle, reason: relation.reason }] : [];
  }) ?? [];
  const hasRefinements = Boolean(query.q || exploreFilterKeys.some((key) => query[key]));

  return <main className={`catalog-explorer-page${selectedBundle ? " catalog-explorer-page--reader" : category ? " catalog-explorer-page--collection" : ""}`}>
    {!category && <header className="catalog-explorer-header">
      <div className="shell">
        <div><span><Archive aria-hidden="true" /></span><div><p>Geological catalogue</p><h1>Explore</h1></div></div>
        <p>Choose a collection and move through its evidence without losing your place.</p>
        <dl><div><dt>Collections</dt><dd>{String(collections.length).padStart(2, "0")}</dd></div><div><dt>Records</dt><dd>{records.length}</dd></div></dl>
      </div>
    </header>}

    <div className={`shell catalog-explorer-surface${selectedBundle ? " catalog-explorer-surface--reader" : category ? " catalog-explorer-surface--collection" : ""}`} id="catalog-explorer-surface">
      {!category ? <CollectionChooser collections={collections} onSelect={openCollection} /> : selectedBundle ? <RecordReader
        key={selectedBundle.record.slug}
        bundle={selectedBundle}
        position={navigation?.position ?? 1}
        total={navigationRecords.length}
        previous={navigation?.previous}
        next={navigation?.next}
        activeImage={activeImage}
        relatedBundles={relatedBundles}
        onBack={closeRecord}
        onRecord={(record) => openRecord(record, "replace")}
        onImage={(index) => updateQuery({ image: index === 0 ? undefined : index }, "replace", false)}
        onRelated={openRelated}
      /> : <section className="catalog-collection-view" aria-labelledby="catalog-collection-title">
        <header className="catalog-collection-commandbar">
          <button type="button" className="catalog-action catalog-action--primary" onClick={closeCollection}><ArrowLeft aria-hidden="true" /> Back to collections</button>
          <div><p>{category.eyebrow}</p><h2 id="catalog-collection-title">{category.name}</h2></div>
          <div className="catalog-record-controls">
            <details className="catalog-search-menu"><summary className="catalog-action catalog-action--secondary"><Search aria-hidden="true" /> Search{query.q ? " · 1" : ""}</summary><form onSubmit={onSearch}><label htmlFor="catalog-search">Search this collection</label><div><Search aria-hidden="true" /><input id="catalog-search" value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} placeholder={`Name, place or type`} /><button type="submit" className="catalog-action catalog-action--primary">Apply</button></div></form></details>
            {filterDefinitions.length > 0 && <details className="catalog-filter-menu"><summary className="catalog-action catalog-action--secondary"><Filter aria-hidden="true" /> Filter{exploreFilterKeys.filter((key) => query[key]).length ? ` · ${exploreFilterKeys.filter((key) => query[key]).length}` : ""}</summary><div><header><strong>{category.name} filters</strong><button type="button" className="catalog-text-action" onClick={() => updateQuery({ ...emptyQuery })}>Reset</button></header>{filterDefinitions.map((definition) => <fieldset key={definition.key}><legend>{definition.label}</legend><div><button type="button" className={!query[definition.key] ? "active" : ""} onClick={() => updateQuery({ [definition.key]: "", page: 1 })}>All</button>{definition.values.map((value) => <button type="button" className={query[definition.key] === value ? "active" : ""} onClick={() => updateQuery({ [definition.key]: value, page: 1 })} key={value}>{value}</button>)}</div></fieldset>)}</div></details>}
          </div>
          <NeoBadge className="catalog-collection-badge">{categoryRecords.length} records</NeoBadge>
        </header>

        <section className="catalog-collection-introduction" aria-labelledby="catalog-collection-about-title">
          <div className="catalog-collection-introduction-image"><Image src={category.image.src} alt={category.image.alt} fill sizes="(max-width: 760px) 100vw, 300px" /></div>
          <div className="catalog-collection-introduction-copy"><p className="eyebrow">Collection guide</p><h3 id="catalog-collection-about-title">About {category.name}</h3><p>{category.overview}</p><ul>{category.themes.map((theme) => <li key={theme}>{theme}</li>)}</ul></div>
          <dl>{category.facts.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl>
        </section>

        <div className="catalog-results-heading">
          <div><p className="eyebrow">Browse the collection</p><h3><strong>{filteredRecords.length}</strong> {filteredRecords.length === 1 ? "record" : "records"}</h3><span>{filteredRecords.length ? `Showing ${pagination.startIndex + 1}–${Math.min(pagination.startIndex + pagination.items.length, filteredRecords.length)}` : "No matching records"}</span></div>
        </div>

        {hasRefinements && <div className="catalog-active-filters"><span>Showing</span>{query.q && <button type="button" onClick={() => updateQuery({ q: "", page: 1 })}>“{query.q}” <X aria-hidden="true" /></button>}{exploreFilterKeys.map((key) => query[key] ? <button type="button" onClick={() => updateQuery({ [key]: "", page: 1 })} key={key}>{query[key]} <X aria-hidden="true" /></button> : null)}<button type="button" className="catalog-text-action" onClick={() => updateQuery({ ...emptyQuery })}>Clear all</button></div>}
        {pagination.items.length ? <div className="catalog-record-grid">{pagination.items.map((record) => {
          const facts = getRecordPreviewFacts(record);
          return <article className="catalog-record-card" key={record.slug}>
            <div className="catalog-record-image"><Image src={record.image.src} alt={record.image.alt} fill sizes="(max-width: 620px) 100vw, (max-width: 900px) 50vw, 25vw" />{record.mediaStatus === "reference" && <NeoBadge className="catalog-record-ref-badge">Reference image</NeoBadge>}<NeoBadge variant="dark" className="catalog-record-id-badge">{record.recordId}</NeoBadge></div>
            <div className="catalog-record-card-copy"><p className="catalog-record-type">{record.recordType}</p><h3>{record.name}</h3><p>{record.summary}</p><dl>{facts.slice(0, 3).map((fact) => <div key={`${fact.label}-${fact.value}`}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl></div>
            <button type="button" className="catalog-record-open" onClick={() => openRecord(record)}><span>Open record</span><em><ArrowRight aria-hidden="true" /></em></button>
          </article>;
        })}</div> : <div className="catalog-empty-results"><Archive aria-hidden="true" /><h3>No records match this view.</h3><p>Remove a refinement or use a broader term.</p>{hasRefinements && <button type="button" className="catalog-action catalog-action--primary" onClick={() => updateQuery({ ...emptyQuery })}>Clear refinements</button>}</div>}

        {pagination.totalPages > 1 && <nav className="catalog-record-pagination" aria-label="Record pages"><button type="button" className="catalog-action catalog-action--secondary" onClick={() => updateQuery({ page: pagination.page - 1 })} disabled={pagination.page === 1}><ChevronLeft aria-hidden="true" /> Previous</button><div>{Array.from({ length: pagination.totalPages }, (_, index) => index + 1).map((number) => <button type="button" className={number === pagination.page ? "active" : ""} aria-current={number === pagination.page ? "page" : undefined} onClick={() => updateQuery({ page: number })} key={number}>{String(number).padStart(2, "0")}</button>)}</div><button type="button" className="catalog-action catalog-action--primary" onClick={() => updateQuery({ page: pagination.page + 1 })} disabled={pagination.page === pagination.totalPages}>Next <ChevronRight aria-hidden="true" /></button></nav>}
      </section>}
    </div>

  </main>;
}
