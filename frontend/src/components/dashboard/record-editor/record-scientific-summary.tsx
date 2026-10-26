"use client";

import type { ActiveScientificTemplate } from "@/lib/dashboard-api";
import styles from "./record-editor.module.css";

function present(value: unknown): string {
  if (value === null || value === undefined || value === "") return "Not added";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value))
    return value.length ? value.join(", ") : "Not added";
  return String(value);
}

export function RecordScientificSummary({
  template,
  attributes,
}: {
  template: ActiveScientificTemplate;
  attributes: Record<string, unknown>;
}) {
  const fields = template.fields
    .filter((field) => field.status === "active")
    .sort(
      (a, b) =>
        Number(b.required) - Number(a.required) || a.position - b.position,
    );

  return (
    <section
      className={styles.stepCard}
      aria-labelledby="scientific-summary-title"
    >
      <div className={styles.stepHeader}>
        <span className={styles.stepNumber}>Scientific fields</span>
        <h2 id="scientific-summary-title" className={styles.stepTitle}>
          {template.name}
        </h2>
        <p className={styles.stepDescription}>
          Saved scientific information for this record.
        </p>
      </div>
      {fields.length ? (
        <dl className={styles.readOnlyGrid}>
          {fields.map((field) => (
            <div key={field.id} className={styles.readOnlyItem}>
              <dt>
                {field.label}
                {field.unit ? ` (${field.unit})` : ""}
              </dt>
              <dd>{present(attributes[field.stableKey])}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className={styles.stepDescription}>
          This record type has no additional scientific fields.
        </p>
      )}
    </section>
  );
}
