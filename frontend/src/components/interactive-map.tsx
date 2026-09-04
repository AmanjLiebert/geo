"use client";

import Image from "next/image";
import Link from "next/link";
import { ExternalLink, MapPin, MousePointer2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import type { GeologicalLocation } from "@/content/types";

function mapUrl(location: GeologicalLocation) {
  const [lat, lon] = location.coordinates;
  const dLon = 1.65;
  const dLat = 1.05;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${lon-dLon}%2C${lat-dLat}%2C${lon+dLon}%2C${lat+dLat}&layer=mapnik&marker=${lat}%2C${lon}`;
}

function fullMapUrl(location: GeologicalLocation) {
  const [lat, lon] = location.coordinates;
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=10/${lat}/${lon}`;
}

function MapInteractionControls({
  active,
  location,
  onActivate,
  onDeactivate,
  exitButtonRef,
}: {
  active: boolean;
  location: GeologicalLocation;
  onActivate: () => void;
  onDeactivate: () => void;
  exitButtonRef: RefObject<HTMLButtonElement | null>;
}) {
  if (active) {
    return <button ref={exitButtonRef} className="map-interaction-exit" type="button" onClick={onDeactivate}>
      <X aria-hidden="true" />
      Exit map
      <kbd>Esc</kbd>
    </button>;
  }

  return <div className="map-interaction-guard">
    <div className="map-interaction-card">
      <span className="map-interaction-icon"><MousePointer2 aria-hidden="true" /></span>
      <div>
        <strong>Explore {location.name}</strong>
        <p>Page scrolling is on. Activate the map when you want to pan or zoom.</p>
      </div>
      <div className="map-interaction-actions">
        <button type="button" onClick={onActivate}>Activate map</button>
        <a href={fullMapUrl(location)} target="_blank" rel="noreferrer">
          Open full map <ExternalLink aria-hidden="true" />
        </a>
      </div>
    </div>
  </div>;
}

export function InteractiveMap({ locations, compact = false, variant = "default", initialSlug }: { locations: GeologicalLocation[]; compact?: boolean; variant?: "default" | "observatory"; initialSlug?: string }) {
  const categories = useMemo(() => ["All", ...Array.from(new Set(locations.map((item) => item.category)))], [locations]);
  const [filter, setFilter] = useState("All");
  const filtered = filter === "All" ? locations : locations.filter((item) => item.category === filter);
  const [selectedSlug, setSelectedSlug] = useState(initialSlug ?? locations[0]?.slug);
  const [mapInteractive, setMapInteractive] = useState(false);
  const exitButtonRef = useRef<HTMLButtonElement>(null);
  const selected = locations.find((item) => item.slug === selectedSlug) ?? filtered[0] ?? locations[0];

  useEffect(() => {
    if (!mapInteractive) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMapInteractive(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    exitButtonRef.current?.focus();
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mapInteractive]);

  if (!selected) return null;

  const selectLocation = (slug: string) => {
    setSelectedSlug(slug);
    setMapInteractive(false);
  };

  const interactionControls = <MapInteractionControls
    active={mapInteractive}
    location={selected}
    onActivate={() => setMapInteractive(true)}
    onDeactivate={() => setMapInteractive(false)}
    exitButtonRef={exitButtonRef}
  />;

  if (variant === "observatory") return <div className="geo-map-board">
    <aside className="geo-map-index" aria-label="Select a mapped locality">
      <header><span><MapPin aria-hidden="true" /> Mapped places</span><b>{locations.length}</b></header>
      {locations.map((item, index) => <button
        className={item.slug === selected.slug ? "active" : ""}
        type="button"
        key={item.slug}
        aria-pressed={item.slug === selected.slug}
        aria-controls="home-geological-map"
        onClick={() => selectLocation(item.slug)}
      >
        <i>{String(index + 1).padStart(2, "0")}</i>
        <span><strong>{item.name}</strong><small>{item.category}</small></span>
      </button>)}
    </aside>
    <div id="home-geological-map" className={`geo-map-canvas${mapInteractive ? " map-is-active" : ""}`}>
      <iframe key={selected.slug} title={`Map centered on ${selected.name}`} src={mapUrl(selected)} loading="lazy" tabIndex={mapInteractive ? 0 : -1} />
      {interactionControls}
      <div className="geo-map-ticket">
        <span>Selected locality · {selected.category}</span>
        <h3>{selected.name}</h3>
        <p>{selected.region} · {selected.coordinates[0].toFixed(3)}° N, {selected.coordinates[1].toFixed(3)}° E</p>
        <Link className="map-ticket-link" href={`/search?q=${encodeURIComponent(selected.name)}`}>Explore connected evidence <ExternalLink aria-hidden="true" /></Link>
      </div>
      <div className="geo-map-key"><span><i className="map-dot" /> Selected coordinate</span><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a></div>
    </div>
  </div>;

  return <div className={`map-experience${compact ? " map-compact" : ""}`}>
    <div className={`map-stage${mapInteractive ? " map-is-active" : ""}`}>
      <iframe key={selected.slug} title={`Map centered on ${selected.name}`} src={mapUrl(selected)} loading="lazy" tabIndex={mapInteractive ? 0 : -1} />
      {interactionControls}
      <div className="map-key"><span><i className="map-dot" /> Selected locality</span><span>OpenStreetMap base</span></div>
    </div>
    <div className="map-panel">
      {!compact && <div className="map-filters" aria-label="Filter map locations">{categories.map((category) => <button className={filter === category ? "active" : ""} type="button" key={category} aria-pressed={filter === category} onClick={() => { setFilter(category); const first = category === "All" ? locations[0] : locations.find((item) => item.category === category); if (first) selectLocation(first.slug); }}>{category}</button>)}</div>}
      <div className="selected-location"><div className="location-image"><Image src={selected.image.src} alt={selected.image.alt} fill sizes="380px" /></div><span className="micro-label">{selected.category}</span><h3>{selected.name}</h3><p>{selected.description}</p><dl><div><dt>Region</dt><dd>{selected.region}</dd></div><div><dt>Coordinates</dt><dd>{selected.coordinates[0].toFixed(3)}° N<br />{selected.coordinates[1].toFixed(3)}° E</dd></div>{selected.geologicalAge && <div><dt>Context</dt><dd>{selected.geologicalAge}</dd></div>}</dl><Link className="selected-location-link" href={`/search?q=${encodeURIComponent(selected.name)}`}>View connected evidence <ExternalLink aria-hidden="true" /></Link></div>
      <div className="location-list">{filtered.map((item) => <button className={item.slug === selected.slug ? "active" : ""} type="button" key={item.slug} aria-pressed={item.slug === selected.slug} onClick={() => selectLocation(item.slug)}><span>{item.name}</span><small>{item.region}</small></button>)}</div>
      <a className="map-credit" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a>
    </div>
  </div>;
}
