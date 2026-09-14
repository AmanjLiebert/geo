"use client";

import Link from "@/components/safe-link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { createPortal } from "react-dom";
import { GeoCloseIcon, GeoSearchIcon } from "@/components/geo-icons";
import { searchContent } from "@/content/repository";
import styles from "./navbar-search.module.css";

export function NavbarSearch() {
  const [open, setOpen] = useState(false);
  const [rendered, setRendered] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const results = query.trim().length > 1 ? searchContent({ q: query }).slice(0, 5) : [];

  const openSearch = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    setRendered(true);
    setOpen(true);
  };

  const closeSearch = useCallback(() => {
    setOpen(false);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => setRendered(false), 260);
  }, []);

  useEffect(() => {
    if (!rendered) return;
    const trigger = triggerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeSearch();
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('a, button:not([disabled]), input, [tabindex]:not([tabindex="-1"])'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      trigger?.focus();
    };
  }, [closeSearch, rendered]);

  useEffect(() => () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  }, []);

  return <div className={styles.root}>
    <button ref={triggerRef} className="brutal-search" type="button" aria-label="Search the archive" aria-expanded={open} aria-controls="navbar-search-panel" onClick={open ? closeSearch : openSearch}>
      {open ? <GeoCloseIcon className="navigation-search-icon" aria-hidden="true" /> : <GeoSearchIcon className="navigation-search-icon" aria-hidden="true" />}
    </button>
    {rendered && createPortal(<div className={`${styles.overlay} ${open ? styles.overlayOpen : styles.overlayClosing}`} onPointerDown={(event) => { if (event.target === event.currentTarget) closeSearch(); }}>
      <div ref={dialogRef} className={`${styles.dialog} ${open ? styles.dialogOpen : styles.dialogClosing}`} id="navbar-search-panel" role="dialog" aria-modal="true" aria-label="Search the geological archive">
        <form className={styles.form} action="/search" onSubmit={closeSearch}>
          <GeoSearchIcon aria-hidden="true" />
          <label className="sr-only" htmlFor="navbar-search-input">Search the geological archive</label>
          <input ref={inputRef} id="navbar-search-input" name="q" value={query} onChange={(event) => setQuery(event.target.value)} autoComplete="off" placeholder="Search" />
          <button className={styles.escape} type="button" onClick={closeSearch} aria-label="Close search">ESC</button>
        </form>
        {query.trim().length > 1 && <div className={styles.matches} aria-live="polite">
          {results.length ? results.map((result) => <Link href={result.href} key={`${result.kind}-${result.slug}`} onClick={closeSearch}><span>{result.title}</span><ArrowUpRight aria-hidden="true" /></Link>) : <p>No matches found</p>}
        </div>}
      </div>
    </div>, document.body)}
  </div>;
}
