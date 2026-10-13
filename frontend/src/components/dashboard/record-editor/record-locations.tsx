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

export function RecordLocations({ recordId }: { recordId: string }) {
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
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    listRecordLocations(recordId)
      .then((loaded) => {
        if (active) setItems(loaded);
      })
      .catch(() => {
        if (active) setError("Locations could not be loaded.");
      });
    return () => {
      active = false;
    };
  }, [recordId]);

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    const latitude = coordinate(exactLatitude, -90, 90);
    const longitude = coordinate(exactLongitude, -180, 180);
    if (latitude === null || longitude === null) {
      setError("Enter valid exact latitude and longitude.");
      return;
    }
    const isPublic = visibility === "public" || visibility === "approximate";
    const shownLatitude = isPublic ? coordinate(publicLatitude, -90, 90) : null;
    const shownLongitude = isPublic
      ? coordinate(publicLongitude, -180, 180)
      : null;
    if (isPublic && (shownLatitude === null || shownLongitude === null)) {
      setError(
        "Enter the separate coordinates you approve for public display.",
      );
      return;
    }
    const metres = Number(precision);
    if (
      visibility === "approximate" &&
      (!/^\d+$/.test(precision.trim()) ||
        !Number.isInteger(metres) ||
        metres < 10 ||
        metres > 1000000)
    ) {
      setError("Enter a public precision between 10 and 1,000,000 metres.");
      return;
    }
    if (visibility !== "public" && !reason.trim()) {
      setError("Explain why the location is sensitive.");
      return;
    }
    if (visibility === "embargoed" && !embargoUntil) {
      setError("Choose an embargo end date.");
      return;
    }
    const payload: NewRecordLocation = {
      label: label.trim() || undefined,
      regionLabel: region.trim() || undefined,
      exactLatitude: latitude,
      exactLongitude: longitude,
      visibility,
      sensitivityReason: visibility === "public" ? undefined : reason.trim(),
      embargoUntil: visibility === "embargoed" ? embargoUntil : undefined,
    };
    if (isPublic) {
      payload.publicLatitude = shownLatitude!;
      payload.publicLongitude = shownLongitude!;
    }
    if (visibility === "approximate") payload.publicPrecisionMetres = metres;
    setSaving(true);
    try {
      await addRecordLocation(recordId, payload);
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
          Store exact coordinates privately. Public coordinates are optional and
          must be entered separately.
        </p>
      </div>
      {items.length ? (
        <ul className={styles.detailList}>
          {items.map((item) => (
            <li key={item.id} className={styles.detailListItem}>
              <span>
                {item.label || item.region_label || "Record location"}
              </span>
              <small>
                {item.visibility === "restricted"
                  ? "Restricted"
                  : item.visibility === "embargoed"
                    ? "Embargoed"
                    : item.visibility === "approximate"
                      ? "Approximate public location"
                      : "Public location"}
              </small>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.stepDescription}>No locations added yet.</p>
      )}
      <form className={styles.formSection} onSubmit={add}>
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
        {(visibility === "public" || visibility === "approximate") && (
          <>
            <p className={styles.fieldHelp}>
              Enter only the coordinates approved for public display. They are
              not copied from the exact location.
            </p>
            <div className={styles.formGrid}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="public-latitude">
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
                <label className={styles.fieldLabel} htmlFor="public-longitude">
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
        </div>
      </form>
    </section>
  );
}
