import Image from "next/image";
import Link from "@/components/safe-link";
import { ArrowUpRight, RotateCcw, Search } from "lucide-react";
import type { ReactNode } from "react";
import type { ContentReference, SearchResult } from "@/content/types";

export function Breadcrumbs({ items }: { items: Array<{ label: string; href?: string }> }) {
  return <nav className="breadcrumbs" aria-label="Breadcrumb">
    <ol>{items.map((item, index) => <li key={`${item.label}-${index}`}>{item.href ? <Link href={item.href}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}</li>)}</ol>
  </nav>;
}

export function PrototypeNotice({ title, children }: { title: string; children: ReactNode }) {
  return <aside className="prototype-notice"><span>Showcase note</span><div><strong>{title}</strong><p>{children}</p></div></aside>;
}

export function QueryForm({ action, value, placeholder, hidden = {} }: { action: string; value?: string; placeholder: string; hidden?: Record<string, string> }) {
  return <form className="query-form" action={action}>
    {Object.entries(hidden).filter(([, item]) => item).map(([name, item]) => <input type="hidden" name={name} value={item} key={name} />)}
    <label><span>Search</span><div><Search aria-hidden="true" /><input name="q" defaultValue={value} placeholder={placeholder} /><button type="submit">Search</button></div></label>
  </form>;
}

export function FilterChips({ label, basePath, values, active, params, paramKey }: { label: string; basePath: string; values: string[]; active?: string; params: Record<string, string>; paramKey: string }) {
  const buildHref = (value?: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(paramKey, value); else next.delete(paramKey);
    const query = next.toString();
    return `${basePath}${query ? `?${query}` : ""}`;
  };
  return <div className="filter-group"><span>{label}</span><div><Link className={!active ? "active" : ""} href={buildHref()}>All</Link>{values.map((value) => <Link className={active === value ? "active" : ""} href={buildHref(value)} key={value}>{value}</Link>)}</div></div>;
}

export function ResultsHeader({ count, label, resetHref, filtered }: { count: number; label: string; resetHref: string; filtered: boolean }) {
  return <div className="results-header"><p><strong>{count}</strong> {label}</p>{filtered && <Link href={resetHref}><RotateCcw aria-hidden="true" /> Reset filters</Link>}</div>;
}

export function EmptyState({ title, text, resetHref }: { title: string; text: string; resetHref: string }) {
  return <div className="empty-state"><span>0 results</span><h2>{title}</h2><p>{text}</p><Link href={resetHref}>Clear filters</Link></div>;
}

export function ReferenceList({ items }: { items: ContentReference[] }) {
  return <ol className="reference-list">{items.map((item, index) => <li key={`${item.label}-${index}`}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{item.label}</strong><p>{item.detail}</p>{item.href && <a href={item.href} target="_blank" rel="noreferrer">Open source <ArrowUpRight aria-hidden="true" /></a>}</div></li>)}</ol>;
}

export function SearchResultCard({ result }: { result: SearchResult }) {
  return <Link className="search-result-card" href={result.href}>
    <div><Image src={result.image.src} alt="" fill sizes="150px" /></div>
    <article><span>{result.kind} · {result.context}</span><h3>{result.title}</h3><p>{result.summary}</p></article>
    <ArrowUpRight aria-hidden="true" />
  </Link>;
}
