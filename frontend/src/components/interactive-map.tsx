"use client";

import Image from "next/image";
import { MapPin } from "lucide-react";
import { useMemo, useState } from "react";
import type { GeologicalLocation } from "@/content/types";

function mapUrl(location: GeologicalLocation) {
  const [lat, lon] = location.coordinates;
  const dLon = 1.65;
  const dLat = 1.05;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${lon-dLon}%2C${lat-dLat}%2C${lon+dLon}%2C${lat+dLat}&layer=mapnik&marker=${lat}%2C${lon}`;
}

export function InteractiveMap({ locations, compact = false, variant = "default" }: { locations: GeologicalLocation[]; compact?: boolean; variant?: "default" | "observatory" }) {
  const categories = useMemo(() => ["All", ...Array.from(new Set(locations.map((item) => item.category)))], [locations]);
  const [filter, setFilter] = useState("All");
  const filtered = filter === "All" ? locations : locations.filter((item) => item.category === filter);
  const [selectedSlug, setSelectedSlug] = useState(locations[0]?.slug);
  const selected = locations.find((item) => item.slug === selectedSlug) ?? filtered[0] ?? locations[0];
  if (!selected) return null;

  if (variant === "observatory") return <div className="geo-map-board">
    <aside className="geo-map-index" aria-label="Select a mapped locality">
      <header><span><MapPin aria-hidden="true" /> Mapped places</span><b>{locations.length}</b></header>
      {locations.map((item) => <button className={item.slug === selected.slug ? "active" : ""} type="button" key={item.slug} onClick={() => setSelectedSlug(item.slug)}><strong>{item.name}</strong><small>{item.category}</small></button>)}
    </aside>
    <div className="geo-map-canvas">
      <iframe key={selected.slug} title={`Map centered on ${selected.name}`} src={mapUrl(selected)} loading="lazy" />
      <div className="geo-map-ticket">
        <span>{selected.category}</span>
        <h3>{selected.name}</h3>
        <p>{selected.region} · {selected.coordinates[0].toFixed(3)}° N, {selected.coordinates[1].toFixed(3)}° E</p>
      </div>
      <div className="geo-map-key"><span><i className="map-dot" /> Selected coordinate</span><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a></div>
    </div>
  </div>;

  return <div className={`map-experience${compact ? " map-compact" : ""}`}>
    <div className="map-stage"><iframe key={selected.slug} title={`Map centered on ${selected.name}`} src={mapUrl(selected)} loading="lazy" /><div className="map-key"><span><i className="map-dot" /> Selected locality</span><span>OpenStreetMap base</span></div></div>
    <div className="map-panel">
      {!compact && <div className="map-filters" aria-label="Filter map locations">{categories.map((category) => <button className={filter === category ? "active" : ""} type="button" key={category} onClick={() => { setFilter(category); const first = category === "All" ? locations[0] : locations.find((item) => item.category === category); if (first) setSelectedSlug(first.slug); }}>{category}</button>)}</div>}
      <div className="selected-location"><div className="location-image"><Image src={selected.image.src} alt={selected.image.alt} fill sizes="380px" /></div><span className="micro-label">{selected.category}</span><h3>{selected.name}</h3><p>{selected.description}</p><dl><div><dt>Region</dt><dd>{selected.region}</dd></div><div><dt>Coordinates</dt><dd>{selected.coordinates[0].toFixed(3)}° N<br />{selected.coordinates[1].toFixed(3)}° E</dd></div>{selected.geologicalAge && <div><dt>Context</dt><dd>{selected.geologicalAge}</dd></div>}</dl></div>
      <div className="location-list">{filtered.map((item) => <button className={item.slug === selected.slug ? "active" : ""} type="button" key={item.slug} onClick={() => setSelectedSlug(item.slug)}><span>{item.name}</span><small>{item.region}</small></button>)}</div>
      <a className="map-credit" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a>
    </div>
  </div>;
}
