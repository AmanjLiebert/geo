"use client";

import { useEffect, useState, type FormEvent } from "react";
import { DashboardApiError } from "@/lib/dashboard-api";
import {
  addRecordLocation,
  listRecordLocations,
  type NewRecordLocation,
  type RecordLocationItem,
} from "@/lib/record-trust-api";
import styles from "./record-editor.module.css";

function coordinate(raw: string, min: number, max: number): number | null {
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(raw.trim())) return null;
  const value = Number(raw);
  return Number.isFinite(value) && value >= min && value <= max ? value : null;
}

function formatCoordinate(value: number): string {
  return value.toFixed(6).replace(/\.?0+$/, "");
}

function visibilityLabel(visibility: RecordLocationItem["visibility"]): string {
  if (visibility === "restricted") return "Restricted";
  if (visibility === "embargoed") return "Embargoed";
  if (visibility === "approximate") return "Approximate public location";
  return "Public location";
}

export function buildLocationPayload(input: {
  label: string;
  region: string;
  exactLatitude: string;
  exactLongitude: string;
  visibility: NewRecordLocation["visibility"];
  publicLatitude: string;
  publicLongitude: string;
  precision: string;
  reason: string;
  embargoUntil: string;
}): { payload: NewRecordLocation } | { error: string } {
  const latitude = coordinate(input.exactLatitude, -90, 90);
  const longitude = coordinate(input.exactLongitude, -180, 180);
  if (latitude === null || longitude === null) {
    return { error: "Enter valid exact latitude and longitude." };
  }
  const isPublic =
    input.visibility === "public" || input.visibility === "approximate";
  const needsSeparatePublicPoint = input.visibility === "approximate";
  const shownLatitude = needsSeparatePublicPoint
    ? coordinate(input.publicLatitude, -90, 90)
    : input.visibility === "public"
      ? latitude
      : null;
  const shownLongitude = needsSeparatePublicPoint
    ? coordinate(input.publicLongitude, -180, 180)
    : input.visibility === "public"
      ? longitude
      : null;
  if (
    needsSeparatePublicPoint &&
    (shownLatitude === null || shownLongitude === null)
  ) {
    return {
      error: "Enter the separate coordinates you approve for public display.",
    };
  }
  const metres = Number(input.precision);
  if (
    input.visibility === "approximate" &&
    (!/^\d+$/.test(input.precision.trim()) ||
      !Number.isInteger(metres) ||
      metres < 10 ||
      metres > 1000000)
  ) {
    return {
      error: "Enter a public precision between 10 and 1,000,000 metres.",
    };
  }
  if (input.visibility !== "public" && !input.reason.trim()) {
    return { error: "Explain why the location is sensitive." };
  }
  if (input.visibility === "embargoed" && !input.embargoUntil) {
    return { error: "Choose an embargo end date." };
  }
  const payload: NewRecordLocation = {
    label: input.label.trim() || undefined,
    regionLabel: input.region.trim() || undefined,
    exactLatitude: latitude,
    exactLongitude: longitude,
    visibility: input.visibility,
    sensitivityReason:
      input.visibility === "public" ? undefined : input.reason.trim(),
    embargoUntil:
      input.visibility === "embargoed" ? input.embargoUntil : undefined,
  };
  if (isPublic) {
    payload.publicLatitude = shownLatitude!;
    payload.publicLongitude = shownLongitude!;
  }
  if (input.visibility === "approximate")
    payload.publicPrecisionMetres = metres;
  return { payload };
}

export function RecordLocations({
  recordId,
  readOnly = false,
  onCountChange,
}: {
  recordId: string;
  readOnly?: boolean;
  onCountChange?: (count: number) => void;
}) {
  const [items, setItems] = useState<RecordLocationItem[]>([]);
  const [label, setLabel] = useState("");
  const [region, setRegion] = useState("");
  const [exactLatitude, setExactLatitude] = useState("");
  const [exactLongitude, setExactLongitude] = useState("");
  const [visibility, setVisibility] =
    useState<NewRecordLocation["visibility"]>("restricted");
  const [publicLatitude, setPublicLatitude] = useState("");
  const [publicLongitude, setPublicLongitude] = useState("");
  const [precision, setPrecision] = useState("");
  const [reason, setReason] = useState("");
  const [embargoUntil, setEmbargoUntil] = useState("");
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    listRecordLocations(recordId)
      .then((loaded) => {
        if (active) {
          setItems(loaded);
          setAdding(loaded.length === 0);
        }
      })
      .catch(() => {
        if (active) setError("Locations could not be loaded.");
      });
    return () => {
      active = false;
    };
  }, [recordId]);

  useEffect(() => onCountChange?.(items.length), [items.length, onCountChange]);

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    const result = buildLocationPayload({
      label,
      region,
      exactLatitude,
      exactLongitude,
      visibility,
      publicLatitude,
      publicLongitude,
      precision,
      reason,
      embargoUntil,
    });
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setSaving(true);
    try {
      await addRecordLocation(recordId, result.payload);
      setItems(await listRecordLocations(recordId));
      setLabel("");
      setRegion("");
      setExactLatitude("");
      setExactLongitude("");
      setPublicLatitude("");
      setPublicLongitude("");
      setPrecision("");
      setReason("");
      setEmbargoUntil("");
      setVisibility("restricted");
      setMessage("Location added.");
      setAdding(false);
    } catch (cause) {
      setError(
        cause instanceof DashboardApiError
          ? cause.message
          : "Location could not be added.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      className={styles.stepCard}
      aria-labelledby="record-locations-title"
    >
      <div className={styles.stepHeader}>
        <h2 id="record-locations-title" className={styles.stepTitle}>
          Locations
        </h2>
        <p className={styles.stepDescription}>
          Add the place once, then choose how precisely visitors may see it.
        </p>
      </div>
      {items.length ? (
        <>
          <h3 className={styles.subsectionTitle}>Saved locations</h3>
        <ul className={styles.detailList}>
          {items.map((item) => (
            <li key={item.id} className={styles.savedLocation}>
              <div className={styles.savedLocationHeading}>
                <strong>{item.label || item.regionLabel || "Record location"}</strong>
                <span>{visibilityLabel(item.visibility)}</span>
              </div>
              {item.regionLabel && item.label && <p>{item.regionLabel}</p>}
              <dl className={styles.savedLocationFacts}>
                <div>
                  <dt>{item.visibility === "public" ? "Exact coordinates" : "Exact coordinates (private)"}</dt>
                  <dd>{formatCoordinate(item.exactLatitude)}, {formatCoordinate(item.exactLongitude)}</dd>
                </div>
                {item.publicLatitude !== null && item.publicLongitude !== null && item.visibility === "approximate" && (
                  <div>
                    <dt>Public map point</dt>
                    <dd>{formatCoordinate(item.publicLatitude)}, {formatCoordinate(item.publicLongitude)}{item.publicPrecisionMetres !== null ? ` · ${item.publicPrecisionMetres.toLocaleString()} m precision` : ""}</dd>
                  </div>
                )}
              </dl>
              {item.sensitivityReason && <p className={styles.savedLocationNote}><strong>Why it is protected:</strong> {item.sensitivityReason}</p>}
            </li>
          ))}
        </ul>
          {!readOnly && !adding && (
            <button className={styles.buttonSecondary} type="button" onClick={() => { setAdding(true); setMessage(null); }}>
              Add another location
            </button>
          )}
        </>
      ) : (
        <p className={styles.stepDescription}>No locations added yet.</p>
      )}
      {!readOnly && adding && (
        <form className={styles.formSection} onSubmit={add}>
          <h3 className={styles.subsectionTitle}>{items.length ? "Add another location" : "Add location"}</h3>
          <div className={styles.formGrid}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="location-label">
                Location label
              </label>
              <input
                id="location-label"
                className={styles.input}
                maxLength={240}
                value={label}
                onChange={(event) => setLabel(event.target.value)}
              />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="location-region">
                Region
              </label>
              <input
                id="location-region"
                className={styles.input}
                maxLength={240}
                value={region}
                onChange={(event) => setRegion(event.target.value)}
              />
            </div>
          </div>
          <div className={styles.formGrid}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="location-latitude">
                Exact latitude{" "}
                <span className={styles.requiredTag}>Required</span>
              </label>
              <input
                id="location-latitude"
                className={styles.input}
                inputMode="decimal"
                required
                value={exactLatitude}
                onChange={(event) => setExactLatitude(event.target.value)}
              />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="location-longitude">
                Exact longitude{" "}
                <span className={styles.requiredTag}>Required</span>
              </label>
              <input
                id="location-longitude"
                className={styles.input}
                inputMode="decimal"
                required
                value={exactLongitude}
                onChange={(event) => setExactLongitude(event.target.value)}
              />
            </div>
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="location-visibility">
              Visibility
            </label>
            <select
              id="location-visibility"
              className={styles.select}
              value={visibility}
              onChange={(event) =>
                setVisibility(
                  event.target.value as NewRecordLocation["visibility"],
                )
              }
            >
              <option value="restricted">
                Restricted — exact coordinates stay private
              </option>
              <option value="approximate">Approximate public location</option>
              <option value="public">Public location</option>
              <option value="embargoed">Embargoed</option>
            </select>
          </div>
          {visibility === "public" && (
            <p className={styles.fieldHelp}>
              Visitors will see the exact point entered above.
            </p>
          )}
          {visibility === "approximate" && (
            <>
              <p className={styles.fieldHelp}>
                Add a separate safe map point for visitors. The exact point
                above remains private.
              </p>
              <div className={styles.formGrid}>
                <div className={styles.fieldGroup}>
                  <label
                    className={styles.fieldLabel}
                    htmlFor="public-latitude"
                  >
                    Public latitude
                  </label>
                  <input
                    id="public-latitude"
                    className={styles.input}
                    inputMode="decimal"
                    required
                    value={publicLatitude}
                    onChange={(event) => setPublicLatitude(event.target.value)}
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label
                    className={styles.fieldLabel}
                    htmlFor="public-longitude"
                  >
                    Public longitude
                  </label>
                  <input
                    id="public-longitude"
                    className={styles.input}
                    inputMode="decimal"
                    required
                    value={publicLongitude}
                    onChange={(event) => setPublicLongitude(event.target.value)}
                  />
                </div>
              </div>
            </>
          )}
          {visibility === "approximate" && (
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="public-precision">
                Public precision in metres
              </label>
              <input
                id="public-precision"
                className={styles.input}
                inputMode="numeric"
                required
                value={precision}
                onChange={(event) => setPrecision(event.target.value)}
              />
            </div>
          )}
          {visibility !== "public" && (
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="location-reason">
                Reason for restricted visibility{" "}
                <span className={styles.requiredTag}>Required</span>
              </label>
              <textarea
                id="location-reason"
                className={styles.textarea}
                maxLength={2000}
                required
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </div>
          )}
          {visibility === "embargoed" && (
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="location-embargo">
                Embargo ends
              </label>
              <input
                id="location-embargo"
                className={styles.input}
                type="date"
                required
                value={embargoUntil}
                onChange={(event) => setEmbargoUntil(event.target.value)}
              />
            </div>
          )}
          {error && (
            <p className={styles.bannerError} role="alert">
              {error}
            </p>
          )}
          {message && (
            <p className={styles.bannerSuccess} role="status">
              {message}
            </p>
          )}
          <div className={styles.actionsBar}>
            <button
              className={styles.buttonPrimary}
              type="submit"
              disabled={saving}
            >
              {saving ? "Saving…" : "Add location"}
            </button>
            {items.length > 0 && (
              <button className={styles.buttonSecondary} type="button" disabled={saving} onClick={() => setAdding(false)}>
                Cancel
              </button>
            )}
          </div>
        </form>
      )}
    </section>
  );
}
