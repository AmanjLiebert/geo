"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import homeStyles from "@/app/home.module.css";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type SyntheticEvent } from "react";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  GeoArchiveIcon,
  GeoBackIcon,
  GeoChevronIcon,
  GeoCloseIcon,
  GeoFilterIcon,
  GeoSearchIcon,
} from "@/components/geo-icons";
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

function CollectionChooser({
  collections,
  onSelect,
  compact = false,
}: {
  collections: CollectionEntry[];
  onSelect: (slug: string) => void;
  compact?: boolean;
}) {
  const rootCollections = collections.filter(({ category }) => !category.parentSlug);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const filtered = rootCollections.filter(({ category }) => [category.name, category.description, ...category.themes]
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
      <NeoBadge className="catalog-chooser-summary-badge">{rootCollections.length} collections · {rootCollections.reduce((total, item) => total + item.count, 0)} records</NeoBadge>
    </header>
    {rootCollections.length > COLLECTIONS_PER_PAGE && <label className="catalog-chooser-search"><GeoSearchIcon aria-hidden="true" /><span className="sr-only">Find a collection</span><input value={search} onChange={(event) => updateSearch(event.target.value)} placeholder="Find a collection" /></label>}
    <div className="catalog-chooser-grid">
      {visible.map(({ category, count }) => <button type="button" className="catalog-collection-button" onClick={() => onSelect(category.slug)} key={category.slug}>
        <span className="catalog-collection-image">{category.image.src ? <Image src={category.image.src} alt="" fill sizes="(max-width: 620px) 100vw, (max-width: 1120px) 50vw, (max-width: 1504px) 33vw, 480px" /> : <span className="catalog-media-placeholder"><GeoArchiveIcon aria-hidden="true" /><small>No image</small></span>}</span>
        <span className="catalog-collection-body">
          <span className="catalog-collection-meta"><NeoBadge className="catalog-collection-count-badge">{count} records</NeoBadge><small>Collection</small></span>
          <strong className="catalog-collection-title">{category.name}</strong>
          <span className="catalog-collection-caption">{category.image.caption}</span>
          <i><span>Open collection</span><em><ArrowRight aria-hidden="true" /></em></i>
        </span>
      </button>)}
    </div>
    {!visible.length && <div className="catalog-chooser-empty"><GeoArchiveIcon aria-hidden="true" /><strong>{rootCollections.length ? `No collection matches “${search}”.` : "No published collections yet."}</strong>{rootCollections.length > 0 && <button type="button" data-ui-action="secondary" className="catalog-action catalog-action--secondary" onClick={() => updateSearch("")}>Clear search</button>}</div>}
    {totalPages > 1 && <nav className="catalog-chooser-pagination" aria-label="Collection pages">
      <button type="button" data-ui-action="pagination" data-ui-size="icon" className="catalog-action catalog-action--secondary catalog-action--icon" onClick={() => setPage(Math.max(1, safePage - 1))} disabled={safePage === 1} aria-label="Previous collection page"><ChevronLeft aria-hidden="true" /></button>
      <span>Page {safePage} of {totalPages}</span>
      <button type="button" data-ui-action="pagination" data-ui-size="icon" className="catalog-action catalog-action--secondary catalog-action--icon" onClick={() => setPage(Math.min(totalPages, safePage + 1))} disabled={safePage === totalPages} aria-label="Next collection page"><ChevronRight aria-hidden="true" /></button>
    </nav>}
  </section>;
}

function CollectionGuide({ category }: { category: GeologicalCategory }) {
  const [open, setOpen] = useState(false);
  const panelId = `collection-guide-${category.slug}`;

  return <section className={`catalog-collection-introduction${open ? " is-open" : ""}`} aria-labelledby="catalog-collection-about-title">
    <button
      type="button"
      data-ui-action="disclosure"
      className="catalog-collection-guide-trigger"
      aria-expanded={open}
      aria-controls={panelId}
      onClick={() => setOpen((value) => !value)}
    >
      <span>Collection guide</span>
      <strong>About {category.name}</strong>
      <GeoChevronIcon aria-hidden="true" />
    </button>
    <div className="catalog-collection-guide-panel" id={panelId}>
      <div className="catalog-collection-guide-panel-inner">
        <div className="catalog-collection-introduction-image">{category.image.src ? <Image src={category.image.src} alt={category.image.alt} fill sizes="(max-width: 760px) 100vw, 300px" /> : <span className="catalog-media-placeholder"><GeoArchiveIcon aria-hidden="true" /><small>No image</small></span>}</div>
        <div className="catalog-collection-introduction-copy"><p className="eyebrow">Collection guide</p><h3 id="catalog-collection-about-title">About {category.name}</h3><p>{category.overview}</p><ul>{category.themes.map((theme) => <li key={theme}>{theme}</li>)}</ul></div>
        <dl>{category.facts.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl>
      </div>
    </div>
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
        <button type="button" data-ui-action="utility" data-ui-size="icon" className="catalog-action catalog-action--light catalog-action--icon" onClick={() => setZoom(Math.max(1, zoom - .5))} disabled={zoom === 1} aria-label="Zoom out"><ZoomOut aria-hidden="true" /></button>
        <span>{Math.round(zoom * 100)}%</span>
        <button type="button" data-ui-action="utility" data-ui-size="icon" className="catalog-action catalog-action--light catalog-action--icon" onClick={() => setZoom(Math.min(2.5, zoom + .5))} disabled={zoom === 2.5} aria-label="Zoom in"><ZoomIn aria-hidden="true" /></button>
        <button type="button" data-ui-action="close" className="catalog-action catalog-action--light" onClick={onClose} autoFocus><GeoCloseIcon aria-hidden="true" /> Close</button>
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
  const previousImage = gallery.length ? (activeImage === 0 ? gallery.length - 1 : activeImage - 1) : 0;
  const nextImage = gallery.length ? (activeImage === gallery.length - 1 ? 0 : activeImage + 1) : 0;
  const factSections = detail.sections.filter((section) => section.kind === "facts");
  const keyFactSections = factSections.filter((section) => section.title === "Key facts");
  const contextFactSections = factSections.filter((section) => section.title !== "Key facts");
  const referenceSections = detail.sections.filter((section) => section.kind === "references");
  const narrativeSections = detail.sections.filter((section) => !["facts", "references", "gallery"].includes(section.kind));
  const sourceCount = referenceSections.reduce((total, section) => total + section.items.length, 0);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !fullscreen) onBack();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [fullscreen, onBack]);

  return <section className="catalog-reader catalog-record-page" aria-labelledby="catalog-reader-title">
    <nav className="catalog-record-toolbar" aria-label="Record navigation">
      <button type="button" data-ui-action="back" className="catalog-record-nav-button" onClick={onBack} aria-label="Back to collection"><GeoBackIcon aria-hidden="true" /><span>Collection</span></button>
      <span className="catalog-record-position"><strong>{position}</strong> {total === 1 ? "record" : `of ${total}`}</span>
      {total > 1 && <div>
        <button type="button" data-ui-action="pagination" className="catalog-record-nav-button" onClick={() => previous && onRecord(previous)} disabled={!previous} aria-label={previous ? `Previous record: ${previous.name}` : "No previous record"}><ChevronLeft aria-hidden="true" /><span>Previous</span></button>
        <button type="button" data-ui-action="pagination" className="catalog-record-nav-button" onClick={() => next && onRecord(next)} disabled={!next} aria-label={next ? `Next record: ${next.name}` : "No next record"}><span>Next</span><ChevronRight aria-hidden="true" /></button>
      </div>}
    </nav>

    <div className="catalog-record-reading-layout">
      <header className={`${homeStyles.leadUpdate} catalog-record-hero${image ? "" : " catalog-record-hero--empty"}`}>
        {image ? <Image src={image.src} alt={image.alt} fill priority sizes="(max-width: 760px) 100vw, 1120px" /> : <div className="catalog-record-hero-placeholder"><GeoArchiveIcon aria-hidden="true" /><small>No published image</small></div>}
        <div>
          <small>{record.recordType} · {record.status}</small>
          <h2 id="catalog-reader-title">{record.name}</h2>
          <p>{record.summary}</p>
          <span>
            {record.categoryTrail?.length ? <b>{record.categoryTrail.join(" / ")}</b> : <b>Scientific record</b>}
            {image && <button type="button" data-ui-action="secondary" className="catalog-record-nav-button catalog-record-hero-open" onClick={() => setFullscreen(true)}><ZoomIn aria-hidden="true" /> Open image</button>}
          </span>
        </div>
        {image && gallery.length > 1 && <nav className="catalog-record-hero-images" aria-label="Record images">
          <button type="button" data-ui-action="pagination" className="catalog-record-nav-button" onClick={() => onImage(previousImage)} aria-label="Previous image"><ChevronLeft aria-hidden="true" /></button>
          <strong>{activeImage + 1} / {gallery.length}</strong>
          <button type="button" data-ui-action="pagination" className="catalog-record-nav-button" onClick={() => onImage(nextImage)} aria-label="Next image"><ChevronRight aria-hidden="true" /></button>
        </nav>}
      </header>

      <article className="catalog-record-article">
        <section className="catalog-record-summary-card">
          <div className="catalog-record-introduction"><p className="eyebrow">About this record</p><h3>What it describes</h3><p>{record.description}</p></div>
          {keyFactSections.map((section) => <div className="catalog-record-key-facts" key={section.title}><div><p className="eyebrow">At a glance</p><h3>{section.title}</h3></div><dl className="catalog-reader-facts">{section.items.map((item, itemIndex) => <div key={`${item.label}-${itemIndex}`}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl></div>)}
          {sourceCount > 0 && <details className="catalog-record-source-disclosure"><summary><span><strong>{sourceCount} {sourceCount === 1 ? "source" : "sources"}</strong><small>Evidence used for this record</small></span><span>View sources</span></summary><div>{referenceSections.map((section, index) => <ReferenceList items={section.items} key={`${section.title}-${index}`} />)}</div></details>}
        </section>
        {contextFactSections.map((section, index) => <section className="catalog-record-context-card" key={`${section.title}-${index}`}><p className="eyebrow">Place and context</p><h3>{section.title}</h3><dl className="catalog-reader-facts">{section.items.map((item, itemIndex) => <div key={`${item.label}-${itemIndex}`}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl></section>)}
        {detail.discovery && <section className="catalog-record-context-card"><p className="eyebrow">Discovery</p><h3>How this record was framed</h3><p>{detail.discovery}</p></section>}
        {detail.formationContext && <section className="catalog-record-context-card"><p className="eyebrow">Geological context</p><h3>What the evidence supports</h3><p>{detail.formationContext}</p></section>}
        {narrativeSections.map((section, index) => section.kind === "classification"
          ? <section className="catalog-record-context-card" key={`${section.title}-${index}`}><p className="eyebrow">Classification</p><h3>{section.title}</h3><ul className="catalog-reader-classification">{section.items.map((item) => <li key={item}>{item}</li>)}</ul></section>
          : section.kind === "prose" ? <section className="catalog-record-context-card" key={`${section.title}-${index}`}><p className="eyebrow">Interpretation</p><h3>{section.title}</h3>{section.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</section> : null)}
        <footer className="catalog-record-publication-note"><strong>Published scientific record</strong><span>{record.sourceNote}</span>{record.publishedAt && <time dateTime={record.publishedAt}>{new Intl.DateTimeFormat("en", { dateStyle: "long" }).format(new Date(record.publishedAt))}</time>}</footer>
      </article>
    </div>

      {total > 1 && <nav className="catalog-record-sequence" aria-label="Browse records">
        <button type="button" data-ui-action="pagination" className="catalog-record-nav-button catalog-record-sequence-button" onClick={() => previous && onRecord(previous)} disabled={!previous}>
          <ChevronLeft aria-hidden="true" />
          <span><small>Previous record</small><strong>{previous?.name ?? "Start of collection"}</strong></span>
        </button>
        <span><strong>{position}</strong><small> of {total}</small></span>
        <button type="button" data-ui-action="pagination" className="catalog-record-nav-button catalog-record-sequence-button" onClick={() => next && onRecord(next)} disabled={!next}>
          <span><small>Next record</small><strong>{next?.name ?? "End of collection"}</strong></span>
          <ChevronRight aria-hidden="true" />
        </button>
      </nav>}

    {relatedBundles.length > 0 && <section className="catalog-record-related" aria-labelledby="catalog-related-title">
      <header><p className="eyebrow">Related evidence</p><h3 id="catalog-related-title">Continue exploring</h3></header>
      <div>{relatedBundles.map(({ bundle: related, reason }) => <button type="button" onClick={() => onRelated(related.record)} key={related.record.slug}><span className="catalog-record-related-image">{related.record.image.src ? <Image src={related.record.image.src} alt="" fill sizes="180px" /> : <span className="catalog-media-placeholder"><GeoArchiveIcon aria-hidden="true" /></span>}</span><span><small>{reason}</small><strong>{related.record.name}</strong></span><ArrowRight aria-hidden="true" /></button>)}</div>
    </section>}
    {fullscreen && image && <FullscreenImage image={image} recordName={record.name} onClose={() => setFullscreen(false)} />}
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
  const router = useRouter();
  const records = useMemo(() => recordBundles.map((bundle) => bundle.record), [recordBundles]);
  const [query, setQuery] = useState(initialQuery);
  const [searchDraft, setSearchDraft] = useState(initialQuery.q);
  const collectionScrollRef = useRef(0);
  const searchMenuRef = useRef<HTMLDetailsElement>(null);
  const filterMenuRef = useRef<HTMLDetailsElement>(null);

  const categorySlug = initialCategorySlug;
  const recordSlug = initialRecordSlug;
  const category = collections.find((item) => item.category.slug === categorySlug)?.category;
  const selectedBundle = recordBundles.find((bundle) => (bundle.record.categoryPath ?? [bundle.record.category]).includes(categorySlug ?? "") && bundle.record.slug === recordSlug);
  const categoryRecords = category ? records.filter((record) => (record.categoryPath ?? [record.category]).includes(category.slug)) : [];
  const filteredRecords = category ? filterExploreRecords(records, category.slug, query) : [];
  const pagination = paginateRecords(filteredRecords, query.page);
  const navigationRecords = selectedBundle && filteredRecords.some((record) => record.slug === selectedBundle.record.slug) ? filteredRecords : categoryRecords;
  const navigation = selectedBundle ? getRecordNavigation(navigationRecords, selectedBundle.record.slug) : undefined;
  const activeImage = selectedBundle ? Math.min(query.image ?? 0, Math.max(0, selectedBundle.gallery.length - 1)) : 0;
  const filterDefinitions = collectionFilters.find((item) => item.categorySlug === categorySlug)?.definitions ?? [];

  const commitView = useCallback((nextCategory: string | undefined, nextRecord: string | undefined, nextQuery: ExploreQueryState, mode: "push" | "replace" = "push", scroll = true) => {
    const pathname = nextRecord ? `/explore/${nextCategory}/${nextRecord}` : nextCategory ? `/explore/${nextCategory}` : "/explore";
    const href = buildExploreHref(pathname, nextQuery);
    const pathChanged = nextCategory !== categorySlug || nextRecord !== recordSlug;
    router[mode](href, { scroll: pathChanged ? scroll : false });
    if (!pathChanged) {
      setQuery(nextQuery);
      setSearchDraft(nextQuery.q);
      if (scroll) requestAnimationFrame(() => document.getElementById("catalog-explorer-surface")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  }, [categorySlug, recordSlug, router]);

  const openCollection = (slug: string) => {
    commitView(slug, undefined, emptyQuery);
  };
  const closeCollection = () => commitView(undefined, undefined, emptyQuery);
  const openRecord = (record: GeologicalRecord, mode: "push" | "replace" = "push") => {
    if (mode === "push") collectionScrollRef.current = window.scrollY;
    const index = filteredRecords.findIndex((candidate) => candidate.slug === record.slug);
    const page = index >= 0 ? Math.floor(index / EXPLORE_PAGE_SIZE) + 1 : query.page;
    commitView(category?.slug ?? record.category, record.slug, { ...query, page, image: undefined }, mode);
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
    searchMenuRef.current?.removeAttribute("open");
  };
  const openRelated = (record: GeologicalRecord) => commitView(record.category, record.slug, { ...emptyQuery }, "replace");
  const relatedBundles = selectedBundle?.detail.related.flatMap((relation) => {
    const bundle = recordBundles.find((candidate) => candidate.record.slug === relation.slug);
    return bundle ? [{ bundle, reason: relation.reason }] : [];
  }) ?? [];
  const hasRefinements = Boolean(query.q || exploreFilterKeys.some((key) => query[key]));
  const activeFilterCount = exploreFilterKeys.filter((key) => query[key]).length;
  const rootCollections = collections.filter((item) => !item.category.parentSlug);

  return <main className={`catalog-explorer-page${selectedBundle ? " catalog-explorer-page--reader" : category ? " catalog-explorer-page--collection" : ""}`}>
    {!category && <header className="catalog-explorer-header">
      <div className="shell">
        <div><span><GeoArchiveIcon aria-hidden="true" /></span><div><p>Geological catalogue</p><h1>Explore</h1></div></div>
        <p>Choose a collection and move through its evidence without losing your place.</p>
        <dl><div><dt>Collections</dt><dd>{String(rootCollections.length).padStart(2, "0")}</dd></div><div><dt>Records</dt><dd>{rootCollections.reduce((total, item) => total + item.count, 0)}</dd></div></dl>
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
          <button type="button" data-ui-action="back" className="catalog-action catalog-action--primary" onClick={closeCollection}><GeoBackIcon aria-hidden="true" /><span>Back to collections</span></button>
          <div className="catalog-collection-header-heading"><p>{category.eyebrow}</p><h2 id="catalog-collection-title">{category.name}</h2></div>
          <div className="catalog-record-controls">
            <details ref={searchMenuRef} className="catalog-search-menu" onToggle={(event) => { if (event.currentTarget.open) filterMenuRef.current?.removeAttribute("open"); }}><summary data-ui-action="filter" data-ui-size="icon" className="catalog-action catalog-action--secondary" aria-label={query.q ? "Search this collection, one search active" : "Search this collection"}><GeoSearchIcon aria-hidden="true" /><span className="sr-only">Search</span>{query.q && <b aria-hidden="true">1</b>}</summary><form onSubmit={onSearch}><header><label htmlFor="catalog-search">Search this collection</label><button type="button" data-ui-action="close" data-ui-size="icon" className="catalog-panel-close" aria-label="Close collection search" onClick={() => searchMenuRef.current?.removeAttribute("open")}><GeoCloseIcon aria-hidden="true" /></button></header><div><GeoSearchIcon aria-hidden="true" /><input id="catalog-search" value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} placeholder={`Name, place or type`} /><button type="submit" data-ui-action="primary" className="catalog-action catalog-action--primary">Apply</button></div></form></details>
            {filterDefinitions.length > 0 && <details ref={filterMenuRef} className="catalog-filter-menu" onToggle={(event) => { if (event.currentTarget.open) searchMenuRef.current?.removeAttribute("open"); }}><summary data-ui-action="filter" data-ui-size="icon" className="catalog-action catalog-action--secondary" aria-label={activeFilterCount ? `Filter this collection, ${activeFilterCount} active` : "Filter this collection"}><GeoFilterIcon aria-hidden="true" /><span className="sr-only">Filter</span>{activeFilterCount > 0 && <b aria-hidden="true">{activeFilterCount}</b>}</summary><div><header><strong>{category.name} filters</strong><span><button type="button" data-ui-action="text" className="catalog-text-action" onClick={() => updateQuery({ ...emptyQuery })}>Reset</button><button type="button" data-ui-action="close" data-ui-size="icon" className="catalog-panel-close" aria-label="Close collection filters" onClick={() => filterMenuRef.current?.removeAttribute("open")}><GeoCloseIcon aria-hidden="true" /></button></span></header>{filterDefinitions.map((definition) => <fieldset key={definition.key}><legend>{definition.label}</legend><div><button type="button" data-ui-action="filter" className={!query[definition.key] ? "active" : ""} onClick={() => updateQuery({ [definition.key]: "", page: 1 })}>All</button>{definition.values.map((value) => <button type="button" data-ui-action="filter" className={query[definition.key] === value ? "active" : ""} onClick={() => updateQuery({ [definition.key]: value, page: 1 })} key={value}>{value}</button>)}</div></fieldset>)}</div></details>}
          </div>
          <NeoBadge className="catalog-collection-badge">{categoryRecords.length} records</NeoBadge>
        </header>

        <CollectionGuide category={category} />

        <div className="catalog-results-heading">
          <div><p className="eyebrow">Browse the collection</p><h3><strong>{filteredRecords.length}</strong> {filteredRecords.length === 1 ? "record" : "records"}</h3><span>{filteredRecords.length ? `Showing ${pagination.startIndex + 1}–${Math.min(pagination.startIndex + pagination.items.length, filteredRecords.length)}` : "No matching records"}</span></div>
        </div>

        {hasRefinements && <div className="catalog-active-filters"><span>Showing</span>{query.q && <button type="button" data-ui-action="filter" onClick={() => updateQuery({ q: "", page: 1 })}>“{query.q}” <GeoCloseIcon aria-hidden="true" /></button>}{exploreFilterKeys.map((key) => query[key] ? <button type="button" data-ui-action="filter" onClick={() => updateQuery({ [key]: "", page: 1 })} key={key}>{query[key]} <GeoCloseIcon aria-hidden="true" /></button> : null)}<button type="button" data-ui-action="text" className="catalog-text-action" onClick={() => updateQuery({ ...emptyQuery })}>Clear all</button></div>}
        {pagination.items.length ? <div className="catalog-record-grid">{pagination.items.map((record) => {
          const facts = getRecordPreviewFacts(record);
          return <article className="catalog-record-card" key={record.slug}>
            <div className="catalog-record-image">{record.image.src ? <Image src={record.image.src} alt={record.image.alt} fill sizes="(max-width: 460px) 100vw, (max-width: 820px) 50vw, (max-width: 1944px) 33vw, 640px" /> : <span className="catalog-media-placeholder"><GeoArchiveIcon aria-hidden="true" /><small>No image</small></span>}</div>
            <div className="catalog-record-card-copy"><p className="catalog-record-type">{record.recordType}</p><h3>{record.name}</h3><p>{record.summary}</p><dl>{facts.slice(0, 3).map((fact) => <div key={`${fact.label}-${fact.value}`}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl></div>
            <button type="button" className="catalog-record-open" onClick={() => openRecord(record)}><span>Open record</span><em><ArrowRight aria-hidden="true" /></em></button>
          </article>;
        })}</div> : <div className="catalog-empty-results"><GeoArchiveIcon aria-hidden="true" /><h3>{hasRefinements ? "No records match this view." : "No published records yet."}</h3><p>{hasRefinements ? "Remove a refinement or use a broader term." : "This collection is ready for future published records."}</p>{hasRefinements && <button type="button" data-ui-action="primary" className="catalog-action catalog-action--primary" onClick={() => updateQuery({ ...emptyQuery })}>Clear refinements</button>}</div>}

        {pagination.totalPages > 1 && <footer className="catalog-pagination-footer">
          <nav className="catalog-record-pagination" aria-label="Record pages">
            <div className="catalog-pagination-controls">
              <button type="button" data-ui-action="pagination" aria-label="Previous page" onClick={() => updateQuery({ page: pagination.page - 1 })} disabled={pagination.page === 1}><ChevronLeft aria-hidden="true" /><span>Previous</span></button>
              <div className="catalog-pagination-pages">{Array.from({ length: pagination.totalPages }, (_, index) => index + 1).map((number) => <button type="button" data-ui-action="pagination" data-ui-size="icon" className={number === pagination.page ? "active" : ""} aria-label={`Page ${number}${number === pagination.page ? ", current page" : ""}`} aria-current={number === pagination.page ? "page" : undefined} onClick={() => updateQuery({ page: number })} key={number}>{String(number).padStart(2, "0")}</button>)}</div>
              <button type="button" data-ui-action="pagination" aria-label="Next page" onClick={() => updateQuery({ page: pagination.page + 1 })} disabled={pagination.page === pagination.totalPages}><span>Next</span><ChevronRight aria-hidden="true" /></button>
            </div>
          </nav>
        </footer>}
      </section>}
    </div>

  </main>;
}
