"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, FileText, Lock, ShieldAlert } from "lucide-react";
import Link from "@/components/safe-link";
import {
  createRecord,
  getActiveTemplate,
  getRecord,
  getTemplateVersion,
  listCategoryRecordTypes,
  listStructureCategories,
  updateRecord,
  DashboardApiError,
  type ActiveScientificTemplate,
  type CategoryRecordType,
  type ScientificRecordDetail,
  type StructureCategory,
  type UpdateRecordPayload,
} from "@/lib/dashboard-api";
import { RecordStructureSelector } from "./record-structure-selector";
import { RecordTemplateForm } from "./record-template-form";
import { canChangeClassification } from "./record-editor-utils";
import type { RecordEditorMode, StructureSelection } from "./record-editor-types";
import styles from "./record-editor.module.css";

type RecordEditorProps = {
  mode: RecordEditorMode;
  recordId?: string;
};

export function RecordEditor({ mode, recordId }: RecordEditorProps) {
  const router = useRouter();

  const [step, setStep] = useState<"structure" | "fields">(
    mode === "create" ? "structure" : "fields",
  );

  const [categories, setCategories] = useState<StructureCategory[]>([]);
  const [recordTypes, setRecordTypes] = useState<CategoryRecordType[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<ActiveScientificTemplate | null>(null);
  const [recordDetail, setRecordDetail] = useState<ScientificRecordDetail | null>(null);

  const [selection, setSelection] = useState<StructureSelection>({
    parentCategoryId: null,
    categoryId: null,
    isDirectAttachment: false,
    recordTypeId: null,
  });

  const [initialAttributes, setInitialAttributes] = useState<Record<string, unknown>>({});
  const [initialSlug, setInitialSlug] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<DashboardApiError | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveValidationIssues, setSaveValidationIssues] = useState<
    Array<{ field?: string; message: string }>
  >([]);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  const [isDirty, setIsDirty] = useState(false);

  // Warn on navigation or tab close if form has unsaved edits
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (isDirty) {
        e.preventDefault();
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isDirty]);

  // Initial data loading
  useEffect(() => {
    let ignore = false;

    async function loadData() {
      try {
        const catRes = await listStructureCategories();
        if (ignore) return;
        setCategories(catRes.items);

        if (mode === "edit") {
          if (!recordId) {
            setLoading(false);
            return;
          }

          const record = await getRecord(recordId);
          if (ignore) return;
          setRecordDetail(record);
          setInitialAttributes(record.attributes ?? {});
          setInitialSlug(record.slug ?? "");

          // Check if record is non-editable (published, archived, or in_review)
          if (
            record.status === "published" ||
            record.status === "archived" ||
            record.status === "in_review"
          ) {
            setLoading(false);
            return;
          }

          if (record.categoryId && record.recordTypeId) {
            let tmpl: ActiveScientificTemplate;
            if (record.templateVersionId) {
              tmpl = await getTemplateVersion(record.templateVersionId);
            } else {
              tmpl = await getActiveTemplate(record.categoryId, record.recordTypeId);
            }
            if (ignore) return;
            setActiveTemplate(tmpl);

            // Determine if category is root or child
            const categoryObj = catRes.items.find((c) => c.id === record.categoryId);
            const parentId = categoryObj?.parentId ?? null;

            setSelection({
              parentCategoryId: parentId ?? record.categoryId,
              categoryId: record.categoryId,
              isDirectAttachment: parentId === null,
              recordTypeId: record.recordTypeId,
            });

            const rtRes = await listCategoryRecordTypes(record.categoryId);
            if (ignore) return;
            setRecordTypes(rtRes.items);
            setStep("fields");
          } else {
            // Unclassified draft: open guided classification selector!
            setStep("structure");
          }
        }

        setLoading(false);
      } catch (err) {
        if (!ignore) {
          setError(
            err instanceof DashboardApiError
              ? err
              : new DashboardApiError("Could not load scientific data.", 0, "server"),
          );
          setLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      ignore = true;
    };
  }, [mode, recordId]);


  // Handle classification confirmation from Step 1 & 2
  async function handleConfirmStructure(sel: StructureSelection) {
    if (!sel.categoryId || !sel.recordTypeId) return;

    setLoading(true);
    setSaveError(null);
    setSaveValidationIssues([]);

    try {
      const tmpl = await getActiveTemplate(sel.categoryId, sel.recordTypeId);
      const rtRes = await listCategoryRecordTypes(sel.categoryId);
      setRecordTypes(rtRes.items);
      setActiveTemplate(tmpl);
      setSelection(sel);
      setStep("fields");
      setLoading(false);
    } catch (err) {
      setError(
        err instanceof DashboardApiError
          ? err
          : new DashboardApiError("Failed to load active template.", 0, "server"),
      );
      setLoading(false);
    }
  }

  function handleChangeClassification() {
    if (isDirty) {
      const confirmed = window.confirm(
        "You have unsaved changes in this record. Changing classification may reset attribute fields. Continue?",
      );
      if (!confirmed) return;
    }
    setStep("structure");
    setIsDirty(false);
  }

  function handleCancel() {
    if (isDirty) {
      const confirmed = window.confirm(
        "You have unsaved changes. Are you sure you want to return to the records list?",
      );
      if (!confirmed) return;
    }
    router.push("/dashboard/records");
  }

  async function handleFormSubmit(data: {
    slug?: string | null;
    attributes: Record<string, unknown>;
  }) {
    setIsSaving(true);
    setSaveError(null);
    setSaveValidationIssues([]);
    setSaveSuccessMessage(null);

    try {
      if (mode === "create") {
        if (!selection.categoryId || !selection.recordTypeId) {
          throw new DashboardApiError(
            "Category and record type must be selected before saving.",
            400,
            "validation",
          );
        }

        const newRecord = await createRecord({
          categoryId: selection.categoryId,
          recordTypeId: selection.recordTypeId,
          slug: data.slug ?? undefined,
          attributes: data.attributes,
        });

        setIsDirty(false);
        setIsSaving(false);
        // Navigate to the saved draft via query-parameter edit route
        router.push(`/dashboard/records/edit?recordId=${encodeURIComponent(newRecord.id)}`);
      } else if (mode === "edit" && recordId) {
        const payload: UpdateRecordPayload = {
          slug: data.slug,
          attributes: data.attributes,
        };

        if (
          recordDetail?.status === "unclassified_draft" &&
          selection.categoryId &&
          selection.recordTypeId
        ) {
          payload.categoryId = selection.categoryId;
          payload.recordTypeId = selection.recordTypeId;
        }

        const updated = await updateRecord(recordId, payload);

        setIsDirty(false);
        setIsSaving(false);
        setRecordDetail(updated);
        setInitialAttributes(updated.attributes ?? {});
        setInitialSlug(updated.slug ?? "");
        setSaveSuccessMessage(`Draft saved successfully at ${new Date().toLocaleTimeString()}.`);
      }
    } catch (err) {
      setIsSaving(false);
      if (err instanceof DashboardApiError) {
        setSaveError(err.message);
        setSaveValidationIssues(err.issues);
      } else {
        setSaveError(err instanceof Error ? err.message : "Failed to save draft record.");
      }
    }
  }

  // Find readable names for active selection
  const selectedCat = categories.find((c) => c.id === selection.categoryId);
  const selectedParentCat = categories.find((c) => c.id === selection.parentCategoryId);
  const selectedRt = recordTypes.find((rt) => rt.id === selection.recordTypeId);

  const categoryName = selection.isDirectAttachment
    ? selectedCat?.name ?? "Selected Category"
    : selectedParentCat?.name ?? "Selected Category";

  const subcategoryName = selection.isDirectAttachment ? null : selectedCat?.name ?? null;

  const recordTypeName = selectedRt?.name ?? activeTemplate?.name ?? "Selected Record Type";

  const isNonEditable =
    recordDetail !== null &&
    (recordDetail.status === "published" ||
      recordDetail.status === "archived" ||
      recordDetail.status === "in_review");

  return (
    <div className={styles.container}>
      {/* Page Header */}
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <div className={styles.titleMark} aria-hidden="true">
            <FileText />
          </div>
          <h1 className={styles.title}>
            {mode === "create" ? "Add scientific record" : "Edit draft record"}
          </h1>
          {recordDetail && (
            <span className={styles.badge} aria-label={`Record status: ${recordDetail.status}`}>
              {recordDetail.status === "unclassified_draft"
                ? "Unclassified Draft"
                : recordDetail.status === "draft"
                  ? "Draft"
                  : recordDetail.status === "published"
                    ? "Published"
                    : recordDetail.status === "archived"
                      ? "Archived"
                      : "In Review"}
            </span>
          )}
        </div>
        <p className={styles.subtitle}>
          {mode === "create"
            ? "Choose a scientific category and record type to open the data-entry form. You can save the record as a draft from that form."
            : "Update scientific attributes and identifier slug for this draft record."}
        </p>
      </header>

      {/* Loading state */}
      {loading && (
        <div className={styles.loadingState} role="status" aria-live="polite">
          <div className={styles.loadingDot} aria-hidden="true" />
          <div className={styles.loadingDot} aria-hidden="true" />
          <div className={styles.loadingDot} aria-hidden="true" />
          <span>Loading scientific workspace…</span>
        </div>
      )}

      {/* Load error states */}
      {!loading && error && (
        <div className={styles.bannerError} role="alert">
          {error.kind === "unauthorized" ? (
            <>
              <Lock className={styles.bannerIcon} aria-hidden="true" />
              <div className={styles.bannerContent}>
                <span className={styles.bannerTitle}>Session expired</span>
                <p className={styles.bannerText}>{error.message}</p>
                <div style={{ marginTop: "12px" }}>
                  <Link href="/account" className={styles.button}>
                    Sign in to continue
                  </Link>
                </div>
              </div>
            </>
          ) : error.kind === "forbidden" ? (
            <>
              <ShieldAlert className={styles.bannerIcon} aria-hidden="true" />
              <div className={styles.bannerContent}>
                <span className={styles.bannerTitle}>Access restricted</span>
                <p className={styles.bannerText}>{error.message}</p>
                <div style={{ marginTop: "12px" }}>
                  <Link href="/dashboard" className={styles.button}>
                    Return to dashboard
                  </Link>
                </div>
              </div>
            </>
          ) : (
            <>
              <AlertTriangle className={styles.bannerIcon} aria-hidden="true" />
              <div className={styles.bannerContent}>
                <span className={styles.bannerTitle}>Could not load scientific data</span>
                <p className={styles.bannerText}>{error.message}</p>
                <div style={{ marginTop: "12px" }}>
                  <Link href="/dashboard/records" className={styles.button}>
                    Return to records list
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Missing record ID state in edit mode */}
      {!loading && !error && mode === "edit" && !recordId && (
        <div className={styles.bannerError} role="status">
          <AlertTriangle className={styles.bannerIcon} aria-hidden="true" />
          <div className={styles.bannerContent}>
            <span className={styles.bannerTitle}>No record specified</span>
            <p className={styles.bannerText}>
              Select a draft record from the records list to edit its scientific details.
            </p>
            <div style={{ marginTop: "12px" }}>
              <Link href="/dashboard/records" className={styles.button}>
                Return to records list
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Non-editable record state for published, archived, or in-review records */}
      {!loading && !error && isNonEditable && recordDetail && (
        <div className={styles.bannerError} role="status">
          <ShieldAlert className={styles.bannerIcon} aria-hidden="true" />
          <div className={styles.bannerContent}>
            <span className={styles.bannerTitle}>
              {recordDetail.status === "published"
                ? "This scientific record is published"
                : recordDetail.status === "archived"
                  ? "This scientific record is archived"
                  : "This scientific record is in review"}
            </span>
            <p className={styles.bannerText}>
              {recordDetail.status === "published"
                ? "Published scientific records cannot be modified in the draft editor."
                : recordDetail.status === "archived"
                  ? "Archived records are preserved in read-only state and cannot be modified."
                  : "Records currently under peer review cannot be modified as drafts."}
            </p>
            <div style={{ marginTop: "12px" }}>
              <Link href="/dashboard/records" className={styles.button}>
                Return to records list
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Step 1 & 2: Guided Structure Selection (Create mode or Unclassified draft) */}
      {!loading && !error && !isNonEditable && step === "structure" && (
        <RecordStructureSelector
          categories={categories}
          initialSelection={selection}
          onConfirm={handleConfirmStructure}
        />
      )}

      {/* Step 3: Template form */}
      {!loading && !error && !isNonEditable && step === "fields" && activeTemplate && (
        <RecordTemplateForm
          template={activeTemplate}
          categoryName={categoryName}
          subcategoryName={subcategoryName}
          recordTypeName={recordTypeName}
          initialSlug={initialSlug}
          initialAttributes={initialAttributes}
          mode={mode}
          isSaving={isSaving}
          serverError={saveError}
          serverValidationIssues={saveValidationIssues}
          saveSuccessMessage={saveSuccessMessage}
          onChangeClassification={
            canChangeClassification(mode, recordDetail?.status)
              ? handleChangeClassification
              : undefined
          }
          onSubmit={handleFormSubmit}
          onCancel={handleCancel}
          onDirtyChange={setIsDirty}
        />
      )}
    </div>
  );
}
