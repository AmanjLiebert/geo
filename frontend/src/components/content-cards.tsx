import Image from "next/image";
import Link from "next/link";
import type { FieldObservation, GeologicalCategory, GeologicalRecord, ResearchPublication } from "@/content/types";

export function CategoryCard({ category, index }: { category: GeologicalCategory; index: number }) {
  return <Link className="category-card" href={`/explore/${category.slug}`}>
    <div className="card-image"><Image src={category.image.src} alt={category.image.alt} fill sizes="(max-width: 700px) 100vw, 50vw" /></div>
    <div className="category-copy"><div className="category-index">0{index + 1}</div><div><span className="micro-label">{category.eyebrow}</span><h3>{category.name}</h3><p>{category.description}</p><span className="card-meta">{category.recordCount} showcase records <b aria-hidden="true">↗</b></span></div></div>
  </Link>;
}

export function RecordCard({ record }: { record: GeologicalRecord }) {
  return <Link className="record-card" href={`/explore/${record.category}/${record.slug}`}>
    <div className="card-image"><Image src={record.image.src} alt={record.image.alt} fill sizes="(max-width: 700px) 100vw, 33vw" /></div>
    <div className="record-copy"><span className="micro-label">{record.recordType}</span><h3>{record.name}</h3><dl className="inline-data"><div><dt>Locality</dt><dd>{record.locality}</dd></div><div><dt>Record</dt><dd>{record.recordId}</dd></div>{record.geologicalAge && <div><dt>Age</dt><dd>{record.geologicalAge}</dd></div>}</dl><p>{record.summary}</p><span className="card-action">Open record <span aria-hidden="true">↗</span></span></div>
  </Link>;
}

export function ResearchRow({ item, index }: { item: ResearchPublication; index: number }) {
  return <article className="research-row"><span className="row-index">0{index + 1}</span><div><div className="row-meta"><span>{item.type}</span><span>{item.year}</span><span>{item.topic}</span></div><h3>{item.title}</h3><p>{item.abstract}</p><span className="byline">{item.authors} · {item.location}</span></div><Link aria-label={`Read ${item.title}`} href="/research">↗</Link></article>;
}

export function FieldCard({ item, large = false }: { item: FieldObservation; large?: boolean }) {
  return <article className={`field-card${large ? " field-card-large" : ""}`}><div className="field-image"><Image src={item.image.src} alt={item.image.alt} fill sizes={large ? "(max-width: 800px) 100vw, 60vw" : "(max-width: 800px) 100vw, 40vw"} /></div><div className="field-caption"><span className="micro-label">{item.type}</span><h3>{item.title}</h3><p>{item.location} · {item.coordinates[0].toFixed(3)}° N, {item.coordinates[1].toFixed(3)}° E</p><span>{item.date}</span></div></article>;
}
