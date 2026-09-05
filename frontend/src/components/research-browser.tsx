"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, BookOpenText, ChevronDown, ChevronLeft, ChevronRight, FileText, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ResearchEntry } from "@/content/research-library";
import { parseResearchView, researchHref, type ResearchView } from "@/lib/research-view";
import styles from "./research-browser.module.css";

type Navigate = (view: ResearchView, replace?: boolean) => void;
type EntryProps = { entry: ResearchEntry; view: ResearchView; navigate: Navigate };

function Action({ children, view, navigate, className = "", id }: { children: ReactNode; view: ResearchView; navigate: Navigate; className?: string; id?: string }) {
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate(view);
  };
  return <a id={id} aria-current={className === styles.selected ? "page" : undefined} className={`${styles.action} ${className}`} href={researchHref(view)} onClick={onClick}>{children}</a>;
}

function References({ entry }: { entry: ResearchEntry }) {
  return <ol className={styles.references}>{entry.document.references.map((reference) => <li key={reference.label}><strong>{reference.href ? <a href={reference.href}>{reference.label}</a> : reference.label}</strong><p>{reference.detail}</p></li>)}</ol>;
}

function Library({ entries, view, navigate }: { entries: ResearchEntry[]; view: ResearchView; navigate: Navigate }) {
  const [draft, setDraft] = useState(view.q);
  const [searchOpen, setSearchOpen] = useState(Boolean(view.q));
  const types = Array.from(new Set(entries.map(({ publication }) => publication.type)));
  const query = view.q.toLocaleLowerCase().trim();
  const filtered = entries.filter(({ publication: p }) => (!view.type || p.type === view.type) && `${p.title} ${p.authors} ${p.topic} ${p.location} ${p.abstract}`.toLocaleLowerCase().includes(query));
  return <>
    <header className={styles.libraryHeader}>
      <div className={styles.mastheadIdentity}><span className={styles.mastheadMark}><BookOpenText aria-hidden="true" /></span><div className={styles.mastheadTitle}><p>Research library</p><h1 tabIndex={-1} id="research-heading">Research</h1></div></div>
      <p className={styles.mastheadDescription}>Regional studies, field methods and public-geoscience notes prepared for review.</p>
      <dl className={styles.libraryStamp}><div><dt>Edition</dt><dd>2026</dd></div><div><dt>Papers</dt><dd>{String(entries.length).padStart(2, "0")}</dd></div></dl>
    </header>
    <section aria-label="Find publications" className={styles.tools}>
      <div><span className={styles.eyebrow}>Current publications</span><strong>{filtered.length} available</strong></div>
      <div className={styles.toolActions}>
        <DropdownMenu open={searchOpen} onOpenChange={setSearchOpen}>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                className={styles.typeFilterTrigger}
                data-active={Boolean(view.q)}
                aria-label="Search publications"
              />
            }
          >
            <Search aria-hidden="true" />
            <span>Search</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className={styles.searchPopover}>
            <form id="research-search-form" className={styles.searchPopoverForm} onSubmit={(event) => { event.preventDefault(); navigate({ ...view, q: draft.trim() }); setSearchOpen(false); }}>
              <label className={styles.search}>
                <Search aria-hidden="true" />
                <span className="sr-only">Search publications by title, author or topic</span>
                <input
                  autoFocus
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key !== "Escape") event.stopPropagation();
                  }}
                  placeholder="Title, author or topic"
                />
              </label>
              <div className={styles.searchPopoverActions}>
                <button className={styles.action} type="submit">Apply</button>
                {view.q && <button className={styles.action} type="button" onClick={() => { setDraft(""); navigate({ ...view, q: "" }); setSearchOpen(false); }}>Clear</button>}
              </div>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                className={styles.typeFilterTrigger}
                data-active={Boolean(view.type)}
                aria-label="Publication type filter"
              />
            }
          >
            <FileText aria-hidden="true" />
            <span>{view.type || "All publication types"}</span>
            <ChevronDown aria-hidden="true" className={styles.filterChevron} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Publication type</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={view.type || ""}
                onValueChange={(val: string) => navigate({ ...view, type: val })}
              >
                <DropdownMenuRadioItem value="">
                  All publication types
                </DropdownMenuRadioItem>
                <DropdownMenuSeparator />
                {types.map((type) => (
                  <DropdownMenuRadioItem key={type} value={type}>
                    {type}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuGroup>
            {view.type && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => navigate({ ...view, type: "" })}
                >
                  <X aria-hidden="true" /> Reset filter
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </section>
    <div className={styles.resultLine} aria-live="polite"><p>{view.q ? `${filtered.length} matching “${view.q}”` : view.type ? `${filtered.length} ${view.type}` : "Browse the complete 2026 showcase edition"}</p>{(view.q || view.type) && <button className={styles.action} onClick={() => { setDraft(""); navigate({ ...view, q: "", type: "" }); }}><X aria-hidden="true" /> Reset</button>}<span>Teacher review edition</span></div>
    <div className={styles.publications}>{filtered.map(({ publication: p, document }, index) => <article className={styles.publication} key={p.slug}>
      <div className={styles.paperLabel}><FileText aria-hidden="true" /><span>{p.type}</span><strong>{p.year}</strong></div>
      <div className={styles.publicationBody}><p className={styles.topic}>{p.topic}</p><h2>{p.title}</h2><p className={styles.authors}>{p.authors}</p><div className={styles.abstract}><span className={styles.eyebrow}>Abstract</span><p>{p.abstract}</p></div><dl className={styles.cardFacts}><div><dt>Study area</dt><dd>{p.location}</dd></div><div><dt>Reading</dt><dd>{document.readingTime}</dd></div></dl></div>
      <footer><span className={styles.edition}>Showcase / {String(index + 1).padStart(2, "0")}</span><Action id={`publication-${p.slug}`} view={{ ...view, slug: p.slug, mode: "detail", section: 0, pdf: false }} navigate={navigate}>Open publication <ArrowRight aria-hidden="true" /></Action></footer>
    </article>)}</div>
    {!filtered.length && <div className={styles.empty}><Search aria-hidden="true" /><h2>No publications found</h2><p>Try another title, author or topic, or clear the selected publication type.</p></div>}
    <p className={styles.disclosure}>These sample publications are editorial mock content for teacher feedback, not peer-reviewed research.</p>
  </>;
}

function Publication({ entry, view, navigate }: EntryProps) {
  const { publication: p, document: doc } = entry;
  return <>
    <header className={styles.publicationHeader}><div className={styles.publicationIdentity}><div className={styles.publicationMeta}><span>{p.type}</span><span>{p.year}</span><span>{p.status}</span></div><h1 id="research-heading" tabIndex={-1}>{p.title}</h1><div className={styles.byline}><strong>{p.authors}</strong><span>{p.topic}</span><span>{p.location}</span></div></div><div className={styles.readAccess}><div><BookOpenText aria-hidden="true" /><span><strong>Publication reader</strong><small>{doc.sections.length} sections · {doc.readingTime}</small></span></div><Action view={{ ...view, mode: "read", pdf: false }} navigate={navigate}>Read online <ArrowRight aria-hidden="true" /></Action>{entry.pdf && <Action view={{ ...view, mode: "read", pdf: true }} navigate={navigate}><FileText aria-hidden="true" /> Read PDF</Action>}</div></header>
    <div className={styles.detailGrid}><article><section className={styles.abstractSection}><p className={styles.eyebrow}>Publication summary</p><h2>Abstract</h2><p>{p.abstract}</p></section><section className={styles.contents}><h2>In this publication</h2><ol>{doc.sections.map((section, index) => <li key={section.id}><span>{String(index + 1).padStart(2, "0")}</span><Action view={{ ...view, mode: "read", section: index, pdf: false }} navigate={navigate}>{section.title}<ArrowRight aria-hidden="true" /></Action></li>)}</ol></section><section className={styles.sources}><h2>References & source notes</h2><References entry={entry} /></section></article>
      <aside className={styles.context}><figure><div><Image src={p.image.src} alt={p.image.alt} fill sizes="(max-width: 800px) 100vw, 380px" /></div><figcaption>{p.image.caption}</figcaption></figure><dl><div><dt>Publication type</dt><dd>{p.type}</dd></div><div><dt>Topic</dt><dd>{p.topic}</dd></div><div><dt>Review status</dt><dd>{p.status}</dd></div></dl><p className={styles.disclosure}>A sample publication prepared for the Geo–Kurdistan showcase. Scientific wording remains subject to review.</p></aside></div>
    {entry.related.length > 0 && <section className={styles.related}><p className={styles.eyebrow}>Connect the reading to the evidence</p><h2>Related geological records</h2><div>{entry.related.map((record) => <Link key={record.slug} href={`/explore/${record.category}/${record.slug}`}><span>{record.recordType}</span><strong>{record.name}</strong><ArrowRight aria-hidden="true" /></Link>)}</div></section>}
  </>;
}

function Reader({ entry, view, navigate }: EntryProps) {
  const { publication: p, document: doc } = entry;
  const sectionIndex = Math.min(view.section, doc.sections.length);
  const section = doc.sections[sectionIndex];
  return <>
    <header className={styles.readerHeading}><div><p>{p.type} · {p.year} · {doc.readingTime}</p><h1 id="research-heading" tabIndex={-1}>{p.title}</h1><span>{p.authors}</span></div><div className={styles.formatSwitch}><Action view={{ ...view, pdf: false }} navigate={navigate} className={!view.pdf ? styles.selected : ""}>Read online</Action>{entry.pdf && <Action view={{ ...view, pdf: true }} navigate={navigate} className={view.pdf ? styles.selected : ""}><FileText aria-hidden="true" /> PDF</Action>}</div></header>
    {view.pdf && entry.pdf ? <section className={styles.pdfPane} aria-label="Publication PDF"><div className={styles.pdfBar}><span>Sample publication · PDF</span><a className={styles.action} href={entry.pdf} target="_blank" rel="noreferrer">Open PDF in new tab <ArrowRight aria-hidden="true" /></a></div><object data={entry.pdf} type="application/pdf" aria-label={`PDF: ${p.title}`}><p>Your browser cannot display this PDF here. <a href={entry.pdf}>Open the PDF</a> or use the online reader.</p></object></section> : <div className={styles.readerGrid}><aside className={styles.toc}><p className={styles.eyebrow}>Contents</p><nav aria-label="Publication sections">{doc.sections.map((item, index) => <Action key={item.id} view={{ ...view, section: index, pdf: false }} navigate={navigate} className={index === sectionIndex ? styles.selected : ""}><span>{String(index + 1).padStart(2, "0")}</span>{item.title}</Action>)}<Action view={{ ...view, section: doc.sections.length, pdf: false }} navigate={navigate} className={!section ? styles.selected : ""}>References</Action></nav><small>{doc.readingTime}<br />{p.status}</small></aside><article className={styles.readingPaper}><div className={styles.paperMasthead}><span>Geo–Kurdistan / Research</span><span>{sectionIndex + 1} / {doc.sections.length + 1}</span></div>{section ? <section key={section.id}><div className={styles.sectionHeading}><p className={styles.eyebrow}>Section {String(sectionIndex + 1).padStart(2, "0")}</p><h2 id="research-section-heading" tabIndex={-1}>{section.title}</h2></div><div className={styles.sectionText}>{section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>{section.figure && <figure><div><Image src={section.figure.src} alt={section.figure.alt} fill sizes="(max-width: 800px) 100vw, 900px" /></div><figcaption>{section.figure.caption}<small>{section.figure.credit}</small></figcaption></figure>}</section> : <section><div className={styles.sectionHeading}><p className={styles.eyebrow}>Sources</p><h2 id="research-section-heading" tabIndex={-1}>References & editorial limits</h2></div><References entry={entry} /></section>}<nav className={styles.sectionNav} aria-label="Reading navigation"><button className={styles.action} disabled={sectionIndex === 0} onClick={() => navigate({ ...view, section: sectionIndex - 1 })}><ChevronLeft aria-hidden="true" /> Previous section</button><button className={styles.action} disabled={sectionIndex === doc.sections.length} onClick={() => navigate({ ...view, section: sectionIndex + 1 })}>Next section <ChevronRight aria-hidden="true" /></button></nav></article></div>}
  </>;
}

export function ResearchBrowser({ entries, initialView }: { entries: ResearchEntry[]; initialView: ResearchView }) {
  const [view, setView] = useState(initialView);
  const scrollPositions = useRef(new Map<string, number>());
  const viewRef = useRef(view);
  const entry = entries.find(({ publication }) => publication.slug === view.slug);
  const navigate = useCallback<Navigate>((next, replace = false) => {
    const current = viewRef.current;
    if (researchHref(next) === researchHref(current)) return;
    const replaceEntry = replace || (current.mode === "read" && next.mode === "read" && current.slug === next.slug);
    scrollPositions.current.set(researchHref(current), window.scrollY);
    window.history[replaceEntry ? "replaceState" : "pushState"]({ ...window.history.state, researchParent: replaceEntry ? window.history.state?.researchParent : researchHref(current) }, "", researchHref(next));
    viewRef.current = next;
    setView(next);
    requestAnimationFrame(() => {
      document.getElementById(next.mode === "library" && current.slug ? `publication-${current.slug}` : next.mode === "read" && !next.pdf ? "research-section-heading" : "research-heading")?.focus({ preventScroll: true });
      window.scrollTo({ top: scrollPositions.current.get(researchHref(next)) ?? 0, behavior: "instant" });
    });
  }, []);
  const close = useCallback(() => {
    const current = viewRef.current;
    if (current.mode === "library") return;
    const next: ResearchView = current.mode === "read" ? { ...current, mode: "detail", pdf: false } : { ...current, mode: "library", slug: undefined, section: 0, pdf: false };
    if (window.history.state?.researchParent === researchHref(next)) window.history.back();
    else navigate(next, true);
  }, [navigate]);
  useEffect(() => {
    const pop = () => {
      const previous = viewRef.current;
      scrollPositions.current.set(researchHref(previous), window.scrollY);
      const next = parseResearchView(window.location.pathname, new URLSearchParams(window.location.search));
      viewRef.current = next;
      setView(next);
      requestAnimationFrame(() => { document.getElementById(next.mode === "library" && previous.slug ? `publication-${previous.slug}` : "research-heading")?.focus({ preventScroll: true }); window.scrollTo({ top: scrollPositions.current.get(researchHref(next)) ?? 0, behavior: "instant" }); });
    };
    const key = (event: KeyboardEvent) => {
      const isMenu = event.target instanceof HTMLElement && event.target.closest('[role="menu"], [role="menuitem"], [data-slot^="dropdown-menu"]');
      if (event.key !== "Escape" || event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement || isMenu) return;
      if (viewRef.current.pdf) navigate({ ...viewRef.current, pdf: false }, true);
      else close();
    };
    window.addEventListener("popstate", pop);
    window.addEventListener("keydown", key);
    return () => { window.removeEventListener("popstate", pop); window.removeEventListener("keydown", key); };
  }, [close, navigate]);
  useEffect(() => { document.title = `${entry ? `${view.mode === "read" ? "Read: " : ""}${entry.publication.title}` : "Research"} | Geo-Kurdistan`; }, [entry, view.mode]);
  return <main className={styles.page}>
    {view.mode !== "library" && <nav className={styles.toolbar} aria-label="Research navigation"><button className={styles.action} onClick={close}><ArrowLeft aria-hidden="true" />{view.mode === "read" ? "Close reader" : "Back to research"}</button><span>{view.mode === "read" ? "Publication reader" : "Publication details"}</span>{view.mode === "read" && <Action view={{ ...view, mode: "library", slug: undefined, pdf: false }} navigate={navigate}>Research library <BookOpenText aria-hidden="true" /></Action>}</nav>}
    {view.mode === "library" ? <Library key={`${view.q}:${view.type}`} entries={entries} view={view} navigate={navigate} /> : entry ? view.mode === "read" ? <Reader entry={entry} view={view} navigate={navigate} /> : <Publication entry={entry} view={view} navigate={navigate} /> : <div className={styles.empty}><h1>Publication not found</h1><Action view={{ ...view, mode: "library" }} navigate={navigate}>Back to research</Action></div>}
  </main>;
}
