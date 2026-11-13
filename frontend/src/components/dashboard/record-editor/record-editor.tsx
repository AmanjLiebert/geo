"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronRight,
  Edit3,
  FileText,
  Lock,
  ShieldAlert,
} from "lucide-react";
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
import { RecordEnglishDetails } from "./record-english-details";
import { RecordRelationships } from "./record-relationships";
import { RecordMedia } from "./record-media";
import { RecordEvidence } from "./record-evidence";
import { RecordLocations } from "./record-locations";
import { RecordReviewPanel } from "./record-review-panel";
import { RecordScientificSummary } from "./record-scientific-summary";
import {
  buildNewRecordHref,
  buildRecordEditHref,
  buildRecordsSignInHref,
} from "@/lib/record-list-state";
import {
  getRecordWorkspaceSections,
  RecordWorkspaceNav,
  type RecordWorkspaceSectionId,
} from "./record-workspace-nav";
import {
  canChangeClassification,
  isRecordCategoryArchived,
  isRecordEditorReadOnly,
} from "./record-editor-utils";
import type {
  RecordEditorMode,
  StructureSelection,
} from "./record-editor-types";
import styles from "./record-editor.module.css";

type RecordEditorProps = {
  mode: RecordEditorMode;
  recordId?: string;
  returnTo?: string;
};

type RecordContentCountId = "sources" | "location" | "related" | "media";

export function RecordEditor({ mode, recordId, returnTo }: RecordEditorProps) {
  const router = useRouter();
  const recordsHref = returnTo ?? "/dashboard/records";
  const workspaceHref =
    mode === "edit"
      ? recordId
        ? buildRecordEditHref(recordId, returnTo)
        : recordsHref
      : buildNewRecordHref(returnTo);

  const [step, setStep] = useState<"structure" | "fields">(
    mode === "create" ? "structure" : "fields",
  );
  const [activeWorkspaceSection, setActiveWorkspaceSection] =
    useState<RecordWorkspaceSectionId>("record");

  const [categories, setCategories] = useState<StructureCategory[]>([]);
  const [recordTypes, setRecordTypes] = useState<CategoryRecordType[]>([]);
  const [activeTemplate, setActiveTemplate] =
    useState<ActiveScientificTemplate | null>(null);
  const [recordDetail, setRecordDetail] =
    useState<ScientificRecordDetail | null>(null);

  const [selection, setSelection] = useState<StructureSelection>({
    parentCategoryId: null,
    categoryId: null,
    isDirectAttachment: false,
    recordTypeId: null,
  });

  const [initialAttributes, setInitialAttributes] = useState<
    Record<string, unknown>
  >({});
  const [initialSlug, setInitialSlug] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<DashboardApiError | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveValidationIssues, setSaveValidationIssues] = useState<
    Array<{ field?: string; message: string }>
  >([]);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(
    null,
  );

  const [isDirty, setIsDirty] = useState(false);
  const [englishDetailsDirty, setEnglishDetailsDirty] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [sectionCounts, setSectionCounts] = useState<
    Partial<Record<RecordContentCountId, number>>
  >({});

  const updateSectionCount = useCallback(
    (section: RecordContentCountId, count: number) => {
      setSectionCounts((current) =>
        current[section] === count ? current : { ...current, [section]: count },
      );
    },
    [],
  );

  // Warn on navigation or tab close if form has unsaved edits
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (isDirty || englishDetailsDirty) {
        e.preventDefault();
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isDirty, englishDetailsDirty]);

  // Initial data loading
  useEffect(() => {
    let ignore = false;

    async function loadData() {
      setLoading(true);
      setError(null);
      setActiveTemplate(null);
      try {
        const [catRes, record] = await Promise.all([
          listStructureCategories(),
          mode === "edit" && recordId ? getRecord(recordId) : Promise.resolve(null),
        ]);
        if (ignore) return;
        setCategories(catRes.items);

        if (mode === "edit") {
          if (!recordId || !record) {
            setLoading(false);
            return;
          }

          setRecordDetail(record);
          setInitialAttributes(record.attributes ?? {});
          setInitialSlug(record.slug ?? "");

          if (record.categoryId && record.recordTypeId) {
            const [tmpl, rtRes] = await Promise.all([
              record.templateVersionId
                ? getTemplateVersion(record.templateVersionId)
                : getActiveTemplate(record.categoryId, record.recordTypeId),
              listCategoryRecordTypes(record.categoryId),
            ]);
            if (ignore) return;
            setActiveTemplate(tmpl);

            // Determine if category is root or child
            const categoryObj = catRes.items.find(
              (c) => c.id === record.categoryId,
            );
            const parentId = categoryObj?.parentId ?? null;

            setSelection({
              parentCategoryId: parentId ?? record.categoryId,
              categoryId: record.categoryId,
              isDirectAttachment: parentId === null,
              recordTypeId: record.recordTypeId,
            });

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
              : new DashboardApiError(
                  "Could not load scientific data.",
                  0,
                  "server",
                ),
          );
          setLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      ignore = true;
    };
  }, [mode, recordId, reloadKey]);

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
      setActiveWorkspaceSection("record");
      setLoading(false);
    } catch (err) {
      setError(
        err instanceof DashboardApiError
          ? err
          : new DashboardApiError(
              "Failed to load active template.",
              0,
              "server",
            ),
      );
      setLoading(false);
    }
  }

  function handleChangeClassification() {
    if (isDirty || englishDetailsDirty) {
      const confirmed = window.confirm(
        "You have unsaved changes in this record. Changing classification may reset attribute fields. Continue?",
      );
      if (!confirmed) return;
    }
    setStep("structure");
    setIsDirty(false);
  }

  function handleCancel() {
    if (isDirty || englishDetailsDirty) {
      const confirmed = window.confirm(
        "You have unsaved changes. Are you sure you want to return to the records list?",
      );
      if (!confirmed) return;
    }
    router.push(recordsHref);
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
        router.push(buildRecordEditHref(newRecord.id, returnTo));
      } else if (mode === "edit" && recordId) {
        if (isCategoryArchived) {
          throw new DashboardApiError(
            "The scientific category for this record has been archived. Restore the category to make changes.",
            409,
            "conflict",
          );
        }

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
        setSaveSuccessMessage(
          `Draft saved successfully at ${new Date().toLocaleTimeString()}.`,
        );
      }
    } catch (err) {
      setIsSaving(false);
      if (err instanceof DashboardApiError) {
        setSaveError(err.message);
        setSaveValidationIssues(err.issues);
      } else {
        setSaveError(
          err instanceof Error ? err.message : "Failed to save draft record.",
        );
      }
    }
  }

  // Find readable names for active selection
  const selectedCat = categories.find((c) => c.id === selection.categoryId);
  const selectedParentCat = categories.find(
    (c) => c.id === selection.parentCategoryId,
  );
  const selectedRt = recordTypes.find((rt) => rt.id === selection.recordTypeId);

  const categoryName = selection.isDirectAttachment
    ? (selectedCat?.name ?? "Selected Category")
    : (selectedParentCat?.name ?? "Selected Category");

  const subcategoryName = selection.isDirectAttachment
    ? null
    : (selectedCat?.name ?? null);

  const recordTypeName =
    selectedRt?.name ?? activeTemplate?.name ?? "Selected Record Type";

  const isNonEditable =
    recordDetail !== null &&
    (recordDetail.status === "published" ||
      recordDetail.status === "archived" ||
      recordDetail.status === "in_review");

  const isCategoryArchived =
    mode === "edit" &&
    isRecordCategoryArchived(recordDetail?.categoryId, categories);

  const isReadOnly = isRecordEditorReadOnly(
    recordDetail?.status,
    isCategoryArchived,
  );

  const recordTitle =
    recordDetail?.translations
      .find((item) => item.locale === "en")
      ?.title.trim() ||
    (mode === "create" ? "Add scientific record" : "Untitled record");

  const workspaceSections = getRecordWorkspaceSections(recordDetail?.status);

  const showWorkspace =
    !loading &&
    !error &&
    mode === "edit" &&
    step === "fields" &&
    activeTemplate !== null &&
    recordDetail !== null;

  const sectionSummaries = useMemo(() => {
    const translation = recordDetail?.translations.find(
      (item) => item.locale === "en",
    );
    const activeFields =
      activeTemplate?.fields.filter((field) => field.status === "active") ?? [];
    const completedFields = activeFields.filter((field) => {
      const value = recordDetail?.attributes?.[field.stableKey];
      return (
        value !== null &&
        value !== undefined &&
        value !== "" &&
        (!Array.isArray(value) || value.length > 0)
      );
    }).length;
    const countLabel = (
      section: RecordContentCountId,
      singular: string,
      plural: string,
    ) => {
      const count = sectionCounts[section];
      return count === undefined
        ? "Loading…"
        : count === 0
          ? "Not added"
          : `${count} ${count === 1 ? singular : plural}`;
    };
    return {
      record: translation?.title?.trim()
        ? activeFields.length
          ? `${completedFields} of ${activeFields.length} scientific facts`
          : "Details saved"
        : "Add title and explanation",
      evidence: `${countLabel("sources", "source", "sources")} · ${countLabel("media", "file", "files")}`,
      optional:
        sectionCounts.location === undefined &&
        sectionCounts.related === undefined
          ? "Add only when useful"
          : `${sectionCounts.location ?? 0} locations · ${sectionCounts.related ?? 0} connections`,
      review:
        recordDetail?.status === "published"
          ? "Published"
          : recordDetail?.status === "in_review"
            ? "Ready for decision"
            : "Check readiness",
    } satisfies Partial<Record<RecordWorkspaceSectionId, string>>;
  }, [activeTemplate, recordDetail, sectionCounts]);

  return (
    <div className={styles.container}>
      {/* Page Header */}
      <header className={styles.header}>
        <Link href={recordsHref} className={styles.backLink}>
          <ArrowLeft size={16} aria-hidden="true" /> Records
        </Link>
        <div className={styles.titleRow}>
          <div className={styles.titleMark} aria-hidden="true">
            <FileText />
          </div>
          <h1 className={styles.title}>{recordTitle}</h1>
          {recordDetail && (
            <span
              className={styles.badge}
              aria-label={`Record status: ${recordDetail.status}`}
            >
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
            ? "Choose where this record belongs, then save its scientific fields as a draft."
            : "Build the record one section at a time. Changes stay private until the record is reviewed and published."}
        </p>
      </header>

      {/* Category archived alert */}
      {!loading && !error && isCategoryArchived && (
        <div className={styles.bannerError} role="alert">
          <AlertTriangle className={styles.bannerIcon} aria-hidden="true" />
          <div className={styles.bannerContent}>
            <span className={styles.bannerTitle}>Category is archived</span>
            <p className={styles.bannerText}>
              The scientific category for this record has been archived. Restore
              the category in category management to edit or publish this draft.
            </p>
            <div style={{ marginTop: "12px" }}>
              <Link href={recordsHref} className={styles.button}>
                Return to records list
              </Link>
            </div>
          </div>
        </div>
      )}

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
                  <Link
                    href={buildRecordsSignInHref(workspaceHref)}
                    className={styles.button}
                  >
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
                <span className={styles.bannerTitle}>
                  Could not load scientific data
                </span>
                <p className={styles.bannerText}>{error.message}</p>
                <div style={{ marginTop: "12px" }}>
                  <Link href={recordsHref} className={styles.button}>
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
              Select a draft record from the records list to edit its scientific
              details.
            </p>
            <div style={{ marginTop: "12px" }}>
              <Link href={recordsHref} className={styles.button}>
                Return to records list
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Non-editable record state for published, archived, or in-review records */}
      {!loading && !error && isNonEditable && recordDetail && (
        <>
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
                  ? "To correct this record, choose Edit published record below. It will be hidden from visitors until you publish it again."
                  : recordDetail.status === "archived"
                    ? "Archived records are preserved in read-only state."
                    : "The draft is locked while its publication decision is pending."}
              </p>
              {recordDetail.status === "archived" && (
                <div style={{ marginTop: "12px" }}>
                  <Link href={recordsHref} className={styles.button}>
                    Return to records list
                  </Link>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Step 1 & 2: Guided Structure Selection (Create mode or Unclassified draft) */}
      {!loading && !error && !isReadOnly && step === "structure" && (
        <RecordStructureSelector
          categories={categories}
          initialSelection={selection}
          onConfirm={handleConfirmStructure}
        />
      )}

      {/* Create mode keeps the generated scientific form focused after classification. */}
      {!loading &&
        !error &&
        !isReadOnly &&
        mode === "create" &&
        step === "fields" &&
        activeTemplate && (
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
            showClassificationSummary
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

      {showWorkspace && (
        <>
          <section
            className={styles.workspaceContext}
            aria-label="Record classification"
          >
            <div>
              <span className={styles.workspaceEyebrow}>Classification</span>
              <div className={styles.workspaceClassification}>
                <strong>{categoryName}</strong>
                {subcategoryName && (
                  <>
                    <ChevronRight size={14} aria-hidden="true" />
                    <strong>{subcategoryName}</strong>
                  </>
                )}
                <ChevronRight size={14} aria-hidden="true" />
                <span>{recordTypeName}</span>
              </div>
            </div>
            {!isReadOnly &&
              canChangeClassification(mode, recordDetail.status) && (
                <button
                  type="button"
                  className={styles.buttonGhost}
                  onClick={handleChangeClassification}
                  disabled={isSaving}
                >
                  <Edit3 size={14} aria-hidden="true" /> Change
                </button>
              )}
          </section>

          <div className={styles.workspaceLayout}>
            <RecordWorkspaceNav
              sections={workspaceSections}
              activeSection={activeWorkspaceSection}
              onSelect={setActiveWorkspaceSection}
              summaries={sectionSummaries}
            />

            <div className={styles.workspacePanels}>
              {workspaceSections.some((section) => section.id === "record") && (
                <div
                  id="record-panel-record"
                  role="tabpanel"
                  aria-labelledby="record-tab-record"
                  hidden={activeWorkspaceSection !== "record"}
                  className={styles.workspacePanel}
                >
                  <div className={styles.stageStack}>
                    <RecordEnglishDetails
                      record={recordDetail}
                      onSaved={setRecordDetail}
                      onDirtyChange={setEnglishDetailsDirty}
                      readOnly={isReadOnly}
                    />
                    {isReadOnly ? (
                      <RecordScientificSummary
                        template={activeTemplate}
                        attributes={recordDetail.attributes ?? {}}
                      />
                    ) : (
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
                        showClassificationSummary={false}
                        onChangeClassification={undefined}
                        onSubmit={handleFormSubmit}
                        onCancel={handleCancel}
                        onDirtyChange={setIsDirty}
                      />
                    )}
                  </div>
                </div>
              )}

              <div
                id="record-panel-evidence"
                role="tabpanel"
                aria-labelledby="record-tab-evidence"
                hidden={activeWorkspaceSection !== "evidence"}
                className={styles.workspacePanel}
              >
                <div className={styles.stageStack}>
                  <div className={styles.stageIntro} role="note">
                    Add one source and one approved main image before review.
                  </div>
                  <RecordEvidence
                    recordId={recordDetail.id}
                    fields={activeTemplate.fields}
                    readOnly={isReadOnly}
                    onCountChange={(count) =>
                      updateSectionCount("sources", count)
                    }
                  />
                  <RecordMedia
                    recordId={recordDetail.id}
                    readOnly={isReadOnly}
                    onCountChange={(count) =>
                      updateSectionCount("media", count)
                    }
                  />
                </div>
              </div>

              <div
                id="record-panel-optional"
                role="tabpanel"
                aria-labelledby="record-tab-optional"
                hidden={activeWorkspaceSection !== "optional"}
                className={styles.workspacePanel}
              >
                <div className={styles.stageStack}>
                  <div className={styles.stageIntro} role="note">
                    These sections are optional. Add them only when they improve
                    the record.
                  </div>
                  <RecordLocations
                    recordId={recordDetail.id}
                    readOnly={isReadOnly}
                    onCountChange={(count) =>
                      updateSectionCount("location", count)
                    }
                  />
                  <RecordRelationships
                    recordId={recordDetail.id}
                    readOnly={isReadOnly}
                    loadCandidates={activeWorkspaceSection === "optional"}
                    onCountChange={(count) =>
                      updateSectionCount("related", count)
                    }
                  />
                </div>
              </div>

              {recordDetail.status !== "archived" &&
                activeWorkspaceSection === "review" && (
                  <div
                    id="record-panel-review"
                    role="tabpanel"
                    aria-labelledby="record-tab-review"
                    className={styles.workspacePanel}
                  >
                    <RecordReviewPanel
                      recordId={recordDetail.id}
                      status={recordDetail.status}
                      onRecordChanged={() => setReloadKey((value) => value + 1)}
                      onSelectSection={setActiveWorkspaceSection}
                    />
                  </div>
                )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
