"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Search, X } from "lucide-react";
import { searchContent } from "@/content/repository";
import styles from "./navbar-search.module.css";

export function NavbarSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const results = query.trim().length > 1 ? searchContent({ q: query }).slice(0, 5) : [];

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return <div className={styles.root}>
    <button className="brutal-search" type="button" aria-label="Search the archive" aria-expanded={open} aria-controls="navbar-search-panel" onClick={() => setOpen((value) => !value)}>
      {open ? <X aria-hidden="true" /> : <Search aria-hidden="true" />}
    </button>
    {open && <div className={styles.overlay} onPointerDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <div className={styles.dialog} id="navbar-search-panel" role="dialog" aria-modal="true" aria-label="Search the geological archive">
        <form className={styles.form} action="/search" onSubmit={() => setOpen(false)}>
          <Search aria-hidden="true" />
          <label className="sr-only" htmlFor="navbar-search-input">Search the geological archive</label>
          <input ref={inputRef} id="navbar-search-input" name="q" value={query} onChange={(event) => setQuery(event.target.value)} autoComplete="off" placeholder="Search" />
          <button className={styles.escape} type="button" onClick={() => setOpen(false)} aria-label="Close search">ESC</button>
        </form>
        {query.trim().length > 1 && <div className={styles.matches} aria-live="polite">
          {results.length ? results.map((result) => <Link href={result.href} key={`${result.kind}-${result.slug}`} onClick={() => setOpen(false)}><span>{result.title}</span><ArrowUpRight aria-hidden="true" /></Link>) : <p>No matches found</p>}
        </div>}
      </div>
    </div>}
  </div>;
}
