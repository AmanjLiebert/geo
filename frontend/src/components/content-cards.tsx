import Image from "next/image";
import Link from "@/components/safe-link";
import { Archive, ArrowUpRight, Boxes, Gem, Layers3, MapPin, Mountain, Shell, type LucideIcon } from "lucide-react";
import { getCategoryRecordCount } from "@/content/mock-data";
import type { FieldObservation, GeologicalCategory, GeologicalRecord, ResearchPublication } from "@/content/types";

const recordIcons: Record<string, LucideIcon> = {
  "geological-items": Boxes,
  formations: Layers3,
  rocks: Mountain,
  minerals: Gem,
  fossils: Shell,
  other: Archive,
};

export function CategoryCard({ category, index }: { category: GeologicalCategory; index: number }) {
  return <Link className="category-card" href={`/explore/${category.slug}`}>
    <div className="card-image"><Image src={category.image.src} alt={category.image.alt} fill sizes="(max-width: 700px) 100vw, 50vw" /></div>
    <div className="category-copy"><div className="category-index">0{index + 1}</div><div><span className="micro-label">{category.eyebrow}</span><h3>{category.name}</h3><p>{category.description}</p><span className="card-meta">{getCategoryRecordCount(category.slug)} showcase records <b aria-hidden="true">↗</b></span></div></div>
  </Link>;
}

export function RecordCard({ record }: { record: GeologicalRecord }) {
  const RecordIcon = recordIcons[record.category] ?? Archive;
  return <Link className="record-card" href={`/explore/${record.category}/${record.slug}`}>
    {record.mediaStatus === "reference" ? <div className="record-identity" aria-label="Record image pending"><RecordIcon aria-hidden="true" /><span>{record.recordId}</span><b>{record.classification?.[0] ?? record.recordType}</b><small>Image pending review</small></div> : <div className="card-image"><Image src={record.image.src} alt={record.image.alt} fill sizes="(max-width: 700px) 100vw, 33vw" /><span>{record.recordId}</span></div>}
    <div className="record-copy"><span className="micro-label">{record.recordType}</span><h3>{record.name}</h3><dl className="inline-data"><div><dt>Locality</dt><dd>{record.locality}</dd></div>{record.geologicalAge && <div><dt>Age</dt><dd>{record.geologicalAge}</dd></div>}</dl><p>{record.summary}</p><span className="card-action">Open record <span aria-hidden="true">↗</span></span></div>
  </Link>;
}

export function ExplorerRecordCard({ record }: { record: GeologicalRecord }) {
  return <Link className="explorer-record-card" href={`/explore/${record.category}/${record.slug}`}>
    <div className="explorer-record-media">
      <Image src={record.image.src} alt={record.image.alt} fill sizes="(max-width: 720px) 100vw, 240px" />
      <span>{record.recordId}</span>
      {record.mediaStatus === "reference" && <small>Reference image</small>}
    </div>
    <article>
      <div className="explorer-record-kicker"><span>{record.recordType}</span><small>{record.status}</small></div>
      <h2>{record.name}</h2>
      <p>{record.summary}</p>
      <div className="explorer-record-place"><MapPin aria-hidden="true" /><span><strong>{record.locality}</strong><small>{record.region}</small></span></div>
      {record.classification?.length ? <ul aria-label="Classification">{record.classification.slice(0, 3).map((item) => <li key={item}>{item}</li>)}</ul> : null}
      <span className="explorer-record-action">View item <ArrowUpRight aria-hidden="true" /></span>
    </article>
  </Link>;
}

export function ResearchRow({ item, index }: { item: ResearchPublication; index: number }) {
  return <article className="research-row"><span className="row-index">0{index + 1}</span><div><div className="row-meta"><span>{item.type}</span><span>{item.year}</span><span>{item.topic}</span></div><h3>{item.title}</h3><p>{item.abstract}</p><span className="byline">{item.authors} · {item.location}</span></div><Link aria-label={`Read ${item.title}`} href="/research">↗</Link></article>;
}

export function FieldCard({ item, large = false }: { item: FieldObservation; large?: boolean }) {
  return <Link className={`field-card${large ? " field-card-large" : ""}`} href={`/field/${item.slug}`}><div className="field-image"><Image src={item.image.src} alt={item.image.alt} fill sizes={large ? "(max-width: 800px) 100vw, 60vw" : "(max-width: 800px) 100vw, 40vw"} /></div><div className="field-caption"><span className="micro-label">{item.type}</span><h3>{item.title}</h3><p>{item.location} · {item.coordinates[0].toFixed(3)}° N, {item.coordinates[1].toFixed(3)}° E</p><span>{item.date}</span></div></Link>;
}
