"use client";

import { useId, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronRight, Edit3, Save } from "lucide-react";
import type { ActiveScientificTemplate } from "@/lib/dashboard-api";
import {
  formatFieldValueForSubmit,
  sortTemplateFields,
  validateFieldInput,
  validateSlug,
} from "./record-editor-utils";
import styles from "./record-editor.module.css";

type RecordTemplateFormProps = {
  template: ActiveScientificTemplate;
  categoryName: string;
  subcategoryName?: string | null;
  recordTypeName: string;
  initialSlug?: string | null;
  initialAttributes?: Record<string, unknown>;
  mode: "create" | "edit";
  isSaving: boolean;
  serverError?: string | null;
  serverValidationIssues?: Array<{ field?: string; message: string }>;
  saveSuccessMessage?: string | null;
  onChangeClassification?: () => void;
  onSubmit: (data: { slug?: string; attributes: Record<string, unknown> }) => void;
  onCancel: () => void;
  onDirtyChange?: (dirty: boolean) => void;
};

export function RecordTemplateForm({
  template,
  categoryName,
  subcategoryName,
  recordTypeName,
  initialSlug = "",
  initialAttributes = {},
  mode,
  isSaving,
  serverError,
  serverValidationIssues = [],
  saveSuccessMessage,
  onChangeClassification,
  onSubmit,
  onCancel,
  onDirtyChange,
}: RecordTemplateFormProps) {
  const formId = useId();
  const sortedFields = sortTemplateFields(template.fields);

  const [slug, setSlug] = useState<string>(initialSlug ?? "");
  const [slugTouched, setSlugTouched] = useState(false);

  const [attributes, setAttributes] = useState<Record<string, unknown>>(() => {
    const initial: Record<string, unknown> = {};
    for (const field of template.fields) {
      if (initialAttributes[field.stableKey] !== undefined) {
        initial[field.stableKey] = initialAttributes[field.stableKey];
      } else if (field.dataType === "boolean") {
        initial[field.stableKey] = false;
      } else if (field.dataType === "multi_choice") {
        initial[field.stableKey] = [];
      } else {
        initial[field.stableKey] = "";
      }
    }
    return initial;
  });

  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

  function setDirty() {
    if (onDirtyChange) onDirtyChange(true);
  }

  function handleAttributeChange(key: string, value: unknown) {
    setAttributes((prev) => ({ ...prev, [key]: value }));
    setTouchedFields((prev) => ({ ...prev, [key]: true }));
    setDirty();
  }

  function handleMultiChoiceToggle(key: string, option: string) {
    const currentList = Array.isArray(attributes[key]) ? (attributes[key] as string[]) : [];
    const nextList = currentList.includes(option)
      ? currentList.filter((item) => item !== option)
      : [...currentList, option];
    handleAttributeChange(key, nextList);
  }

  // Client-side validation calculation
  const clientValidationErrors: Record<string, string> = {};

  const slugError = slugTouched ? validateSlug(slug) : null;
  if (slugError) clientValidationErrors["slug"] = slugError;

  for (const field of sortedFields) {
    if (touchedFields[field.stableKey]) {
      const error = validateFieldInput(field, attributes[field.stableKey]);
      if (error) {
        clientValidationErrors[field.stableKey] = error;
      }
    }
  }

  function getFieldError(fieldKey: string): string | null {
    // Client error takes priority
    if (clientValidationErrors[fieldKey]) {
      return clientValidationErrors[fieldKey];
    }
    // Match server issues
    const serverIssue = serverValidationIssues.find((i) => i.field === fieldKey);
    return serverIssue ? serverIssue.message : null;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Mark all as touched to display client validation
    setSlugTouched(true);
    const allTouched: Record<string, boolean> = {};
    let hasClientErrors = false;

    const validatedSlugError = validateSlug(slug);
    if (validatedSlugError) hasClientErrors = true;

    for (const field of sortedFields) {
      allTouched[field.stableKey] = true;
      const error = validateFieldInput(field, attributes[field.stableKey]);
      if (error) hasClientErrors = true;
    }
    setTouchedFields(allTouched);

    if (hasClientErrors) return;

    // Format attributes for API submission
    const formattedAttributes: Record<string, unknown> = {};
    for (const field of sortedFields) {
      const rawVal = attributes[field.stableKey];
      const formatted = formatFieldValueForSubmit(field, rawVal);
      if (formatted !== undefined) {
        formattedAttributes[field.stableKey] = formatted;
      }
    }

    const trimmedSlug = slug.trim();
    onSubmit({
      slug: trimmedSlug || undefined,
      attributes: formattedAttributes,
    });
  }

  return (
    <form id={formId} onSubmit={handleSubmit} className={styles.container} noValidate>
      {/* Classification summary banner */}
      <section
        className={styles.classificationSummary}
        aria-label="Active scientific classification"
      >
        <div className={styles.summaryBadges}>
          <span className={styles.summaryLabel}>Classification:</span>
          <span className={styles.badgePrimary}>{categoryName}</span>
          {subcategoryName && (
            <>
              <ChevronRight size={14} aria-hidden="true" />
              <span className={styles.badgePrimary}>{subcategoryName}</span>
            </>
          )}
          <ChevronRight size={14} aria-hidden="true" />
          <span className={styles.badgeAccent}>{recordTypeName}</span>
        </div>

        {onChangeClassification && mode === "create" && (
          <button
            type="button"
            className={styles.buttonGhost}
            onClick={onChangeClassification}
            disabled={isSaving}
          >
            <Edit3 size={14} aria-hidden="true" />
            <span>Change classification</span>
          </button>
        )}
      </section>

      {/* Success notification banner */}
      {saveSuccessMessage && (
        <div className={styles.bannerSuccess} role="status" aria-live="polite">
          <CheckCircle2 className={styles.bannerIcon} aria-hidden="true" />
          <div className={styles.bannerContent}>
            <span className={styles.bannerTitle}>Changes saved</span>
            <p className={styles.bannerText}>{saveSuccessMessage}</p>
          </div>
        </div>
      )}

      {/* Server error banner */}
      {serverError && (
        <div className={styles.bannerError} role="alert">
          <AlertTriangle className={styles.bannerIcon} aria-hidden="true" />
          <div className={styles.bannerContent}>
            <span className={styles.bannerTitle}>Could not save draft</span>
            <p className={styles.bannerText}>{serverError}</p>
            {serverValidationIssues.length > 0 && (
              <ul className={styles.errorList}>
                {serverValidationIssues.map((issue, idx) => (
                  <li key={idx}>
                    {issue.field ? <strong>{issue.field}: </strong> : null}
                    {issue.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Attributes Form Card */}
      <section className={styles.stepCard} aria-labelledby="scientific-attributes-heading">
        <header className={styles.stepHeader}>
          <span className={styles.stepNumber}>Scientific attributes</span>
          <h2 id="scientific-attributes-heading" className={styles.stepTitle}>
            {template.name}
          </h2>
          <p className={styles.stepDescription}>
            Complete the scientific facts for this draft record. Required fields are flagged and
            displayed first. Additional attributes can be updated at any time before review.
          </p>
        </header>

        <div className={styles.formSection}>
          {/* Optional Identifier slug */}
          <div className={styles.formGridFull}>
            <div className={styles.fieldGroup}>
              <div className={styles.fieldLabelRow}>
                <label htmlFor={`${formId}-slug`} className={styles.fieldLabel}>
                  Identifier slug (optional)
                </label>
              </div>
              <input
                id={`${formId}-slug`}
                type="text"
                className={slugError ? styles.inputError : styles.input}
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setSlugTouched(true);
                  setDirty();
                }}
                onBlur={() => setSlugTouched(true)}
                placeholder="e.g. zagros-ammonite-specimen-1"
                aria-describedby={`${formId}-slug-help`}
                aria-invalid={Boolean(slugError)}
                disabled={isSaving}
              />
              <span id={`${formId}-slug-help`} className={styles.fieldHelp}>
                URL-friendly identifier using lowercase letters, numbers, and hyphens.
              </span>
              {slugError && (
                <span className={styles.fieldError} role="alert">
                  {slugError}
                </span>
              )}
            </div>
          </div>

          {/* Dynamic template fields grid */}
          <div className={styles.formGrid}>
            {sortedFields.map((field) => {
              const fieldError = getFieldError(field.stableKey);
              const fieldId = `${formId}-field-${field.stableKey}`;
              const helpId = `${fieldId}-help`;
              const value = attributes[field.stableKey];

              return (
                <div
                  key={field.id}
                  className={field.dataType === "long_text" ? styles.formGridFull : undefined}
                >
                  <div className={styles.fieldGroup}>
                    <div className={styles.fieldLabelRow}>
                      <label htmlFor={fieldId} className={styles.fieldLabel}>
                        {field.label}
                        {field.required && (
                          <span className={styles.requiredTag} aria-label="Required field">
                            Required *
                          </span>
                        )}
                      </label>
                      {field.unit && <span className={styles.unitBadge}>{field.unit}</span>}
                    </div>

                    {/* text */}
                    {field.dataType === "text" && (
                      <input
                        id={fieldId}
                        type="text"
                        className={fieldError ? styles.inputError : styles.input}
                        value={typeof value === "string" ? value : ""}
                        onChange={(e) => handleAttributeChange(field.stableKey, e.target.value)}
                        onBlur={() =>
                          setTouchedFields((prev) => ({ ...prev, [field.stableKey]: true }))
                        }
                        aria-describedby={field.helpText ? helpId : undefined}
                        aria-invalid={Boolean(fieldError)}
                        disabled={isSaving}
                      />
                    )}

                    {/* long_text */}
                    {field.dataType === "long_text" && (
                      <textarea
                        id={fieldId}
                        rows={4}
                        className={fieldError ? styles.textareaError : styles.textarea}
                        value={typeof value === "string" ? value : ""}
                        onChange={(e) => handleAttributeChange(field.stableKey, e.target.value)}
                        onBlur={() =>
                          setTouchedFields((prev) => ({ ...prev, [field.stableKey]: true }))
                        }
                        aria-describedby={field.helpText ? helpId : undefined}
                        aria-invalid={Boolean(fieldError)}
                        disabled={isSaving}
                      />
                    )}

                    {/* integer */}
                    {field.dataType === "integer" && (
                      <input
                        id={fieldId}
                        type="number"
                        step="1"
                        className={fieldError ? styles.inputError : styles.input}
                        value={value !== undefined && value !== null ? String(value) : ""}
                        onChange={(e) => handleAttributeChange(field.stableKey, e.target.value)}
                        onBlur={() =>
                          setTouchedFields((prev) => ({ ...prev, [field.stableKey]: true }))
                        }
                        aria-describedby={field.helpText ? helpId : undefined}
                        aria-invalid={Boolean(fieldError)}
                        disabled={isSaving}
                      />
                    )}

                    {/* decimal */}
                    {field.dataType === "decimal" && (
                      <input
                        id={fieldId}
                        type="number"
                        step="any"
                        className={fieldError ? styles.inputError : styles.input}
                        value={value !== undefined && value !== null ? String(value) : ""}
                        onChange={(e) => handleAttributeChange(field.stableKey, e.target.value)}
                        onBlur={() =>
                          setTouchedFields((prev) => ({ ...prev, [field.stableKey]: true }))
                        }
                        aria-describedby={field.helpText ? helpId : undefined}
                        aria-invalid={Boolean(fieldError)}
                        disabled={isSaving}
                      />
                    )}

                    {/* boolean */}
                    {field.dataType === "boolean" && (
                      <label className={styles.checkboxLabel}>
                        <input
                          id={fieldId}
                          type="checkbox"
                          checked={Boolean(value)}
                          onChange={(e) => handleAttributeChange(field.stableKey, e.target.checked)}
                          className={styles.checkboxInput}
                          disabled={isSaving}
                        />
                        <span className={styles.checkboxText}>
                          {field.label}: {Boolean(value) ? "Yes / Confirmed" : "No / Unconfirmed"}
                        </span>
                      </label>
                    )}

                    {/* date */}
                    {field.dataType === "date" && (
                      <input
                        id={fieldId}
                        type="date"
                        className={fieldError ? styles.inputError : styles.input}
                        value={typeof value === "string" ? value : ""}
                        onChange={(e) => handleAttributeChange(field.stableKey, e.target.value)}
                        onBlur={() =>
                          setTouchedFields((prev) => ({ ...prev, [field.stableKey]: true }))
                        }
                        aria-describedby={field.helpText ? helpId : undefined}
                        aria-invalid={Boolean(fieldError)}
                        disabled={isSaving}
                      />
                    )}

                    {/* choice */}
                    {field.dataType === "choice" && (
                      <select
                        id={fieldId}
                        className={fieldError ? styles.selectError : styles.select}
                        value={typeof value === "string" ? value : ""}
                        onChange={(e) => handleAttributeChange(field.stableKey, e.target.value)}
                        onBlur={() =>
                          setTouchedFields((prev) => ({ ...prev, [field.stableKey]: true }))
                        }
                        aria-describedby={field.helpText ? helpId : undefined}
                        aria-invalid={Boolean(fieldError)}
                        disabled={isSaving}
                      >
                        <option value="">Select an option…</option>
                        {Array.isArray(field.validation.options) &&
                          field.validation.options
                            .filter((o): o is string => typeof o === "string")
                            .map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                      </select>
                    )}

                    {/* multi_choice */}
                    {field.dataType === "multi_choice" && (
                      <fieldset className={styles.fieldset} aria-describedby={field.helpText ? helpId : undefined}>
                        <legend className={styles.legend}>{field.label} selections</legend>
                        <div className={styles.multiChoiceGrid}>
                          {Array.isArray(field.validation.options) &&
                            field.validation.options
                              .filter((o): o is string => typeof o === "string")
                              .map((opt) => {
                                const selectedList = Array.isArray(value) ? (value as string[]) : [];
                                const isChecked = selectedList.includes(opt);
                                return (
                                  <label key={opt} className={styles.checkboxLabel}>
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => handleMultiChoiceToggle(field.stableKey, opt)}
                                      className={styles.checkboxInput}
                                      disabled={isSaving}
                                    />
                                    <span className={styles.checkboxText}>{opt}</span>
                                  </label>
                                );
                              })}
                        </div>
                      </fieldset>
                    )}

                    {/* Help text */}
                    {field.helpText && (
                      <span id={helpId} className={styles.fieldHelp}>
                        {field.helpText}
                      </span>
                    )}

                    {/* Field error */}
                    {fieldError && (
                      <span className={styles.fieldError} role="alert">
                        {fieldError}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Form Actions */}
          <div className={styles.actionsBar}>
            <div className={styles.actionGroup}>
              <button
                type="button"
                className={styles.buttonGhost}
                onClick={onCancel}
                disabled={isSaving}
              >
                Cancel and return
              </button>
            </div>

            <div className={styles.actionGroup}>
              <button type="submit" className={styles.buttonPrimary} disabled={isSaving}>
                <Save aria-hidden="true" />
                <span>{isSaving ? "Saving draft…" : mode === "create" ? "Save draft record" : "Save changes"}</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </form>
  );
}
