"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import {
  listCategoryRecordTypes,
  DashboardApiError,
  type CategoryRecordType,
  type StructureCategory,
} from "@/lib/dashboard-api";
import { buildCategoryTree } from "./record-editor-utils";
import type { CategoryTreeNode, StructureSelection } from "./record-editor-types";
import styles from "./record-editor.module.css";

type RecordStructureSelectorProps = {
  categories: StructureCategory[];
  initialSelection?: StructureSelection;
  onConfirm: (selection: StructureSelection) => void;
};

export function RecordStructureSelector({
  categories,
  initialSelection,
  onConfirm,
}: RecordStructureSelectorProps) {
  const tree = buildCategoryTree(categories);

  const [parentCategoryId, setParentCategoryId] = useState<string | null>(
    initialSelection?.parentCategoryId ?? null,
  );
  const [isDirectAttachment, setIsDirectAttachment] = useState<boolean>(
    initialSelection?.isDirectAttachment ?? false,
  );
  const [subcategoryId, setSubcategoryId] = useState<string | null>(
    initialSelection && !initialSelection.isDirectAttachment
      ? initialSelection.categoryId
      : null,
  );
  const [recordTypeId, setRecordTypeId] = useState<string | null>(
    initialSelection?.recordTypeId ?? null,
  );

  const [recordTypes, setRecordTypes] = useState<CategoryRecordType[]>([]);
  const [loadingRecordTypes, setLoadingRecordTypes] = useState(
    Boolean(initialSelection?.categoryId),
  );
  const [recordTypesError, setRecordTypesError] = useState<string | null>(null);

  // Active tree node for chosen root
  const activeRootNode: CategoryTreeNode | undefined = tree.find(
    (n) => n.category.id === parentCategoryId,
  );

  // Effective category that records attach to
  const effectiveCategoryId: string | null = isDirectAttachment
    ? parentCategoryId
    : subcategoryId;

  // Fetch record types whenever effective category changes
  useEffect(() => {
    if (!effectiveCategoryId) {
      return;
    }

    let ignore = false;
    const controller = new AbortController();

    listCategoryRecordTypes(effectiveCategoryId, "en", controller.signal)
      .then((res) => {
        if (!ignore) {
          setRecordTypes(res.items);
          setLoadingRecordTypes(false);
          setRecordTypeId((prev) => (prev && res.items.some((rt) => rt.id === prev) ? prev : null));
        }
      })
      .catch((err) => {
        if (!ignore) {
          if (err instanceof DashboardApiError && err.kind === "aborted") return;
          setRecordTypes([]);
          setRecordTypeId(null);
          setRecordTypesError(
            err instanceof Error ? err.message : "Failed to load permitted record types.",
          );
          setLoadingRecordTypes(false);
        }
      });

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [effectiveCategoryId]);

  function handleSelectRoot(node: CategoryTreeNode) {
    setParentCategoryId(node.category.id);
    setRecordTypeId(null);
    setRecordTypes([]);
    setLoadingRecordTypes(true);
    setRecordTypesError(null);

    if (node.allowsDirectRecords && !node.hasChildren) {
      setIsDirectAttachment(true);
      setSubcategoryId(null);
    } else if (node.allowsDirectRecords && node.hasChildren) {
      // Default to direct if allowed, user can change
      setIsDirectAttachment(true);
      setSubcategoryId(null);
    } else {
      // Must choose subcategory
      setIsDirectAttachment(false);
      setSubcategoryId(node.children[0]?.id ?? null);
    }
  }

  function handleSelectDirect() {
    setIsDirectAttachment(true);
    setSubcategoryId(null);
    setRecordTypeId(null);
    setRecordTypes([]);
    setLoadingRecordTypes(true);
    setRecordTypesError(null);
  }

  function handleSelectSubcategory(childId: string) {
    setIsDirectAttachment(false);
    setSubcategoryId(childId);
    setRecordTypeId(null);
    setRecordTypes([]);
    setLoadingRecordTypes(true);
    setRecordTypesError(null);
  }

  function handleConfirm() {
    if (!effectiveCategoryId || !recordTypeId) return;
    onConfirm({
      parentCategoryId,
      categoryId: effectiveCategoryId,
      isDirectAttachment,
      recordTypeId,
    });
  }

  const isComplete = Boolean(effectiveCategoryId && recordTypeId);

  return (
    <div className={styles.container}>
      {/* Step 1: Scientific Category */}
      <section className={styles.stepCard} aria-labelledby="step-1-heading">
        <header className={styles.stepHeader}>
          <span className={styles.stepNumber}>Step 1</span>
          <h2 id="step-1-heading" className={styles.stepTitle}>
            Choose scientific category
          </h2>
          <p className={styles.stepDescription}>
            Categories organize the broad geological discipline. Subcategories narrow the subject
            when specialized classification is needed.
          </p>
        </header>

        {tree.length === 0 ? (
          <div className={styles.bannerError} role="alert">
            <div className={styles.bannerContent}>
              <span className={styles.bannerTitle}>No categories available</span>
              <p className={styles.bannerText}>
                Record creation is not available yet. Please contact the project team.
              </p>
            </div>
          </div>
        ) : (
          <div className={styles.optionGrid} role="radiogroup" aria-label="Scientific categories">
            {tree.map((node) => {
              const isSelected = parentCategoryId === node.category.id;
              return (
                <button
                  key={node.category.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  className={isSelected ? styles.optionCardSelected : styles.optionCard}
                  onClick={() => handleSelectRoot(node)}
                >
                  <div className={styles.optionHeader}>
                    <span className={styles.optionTitle}>{node.category.name}</span>
                    {isSelected && <Check className={styles.bannerIcon} aria-hidden="true" />}
                  </div>
                  {node.category.description && (
                    <p className={styles.optionDescription}>{node.category.description}</p>
                  )}
                  <span className={styles.optionHint}>
                    {node.hasChildren
                      ? `${node.children.length} subcategory branch${node.children.length === 1 ? "" : "es"}`
                      : "Direct records allowed"}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Subcategory choice when active root has children */}
        {activeRootNode && activeRootNode.hasChildren && (
          <div className={styles.branchChooser}>
            <span className={styles.branchTitle}>
              {activeRootNode.allowsDirectRecords
                ? "Classification level"
                : "Select subcategory branch (required)"}
            </span>

            {activeRootNode.allowsDirectRecords && (
              <label className={styles.checkboxLabel}>
                <input
                  type="radio"
                  name="attachment-choice"
                  checked={isDirectAttachment}
                  onChange={handleSelectDirect}
                  className={styles.checkboxInput}
                />
                <span className={styles.checkboxText}>
                  Attach directly to general &ldquo;{activeRootNode.category.name}&rdquo; category
                </span>
              </label>
            )}

            <label className={styles.checkboxLabel}>
              <input
                type="radio"
                name="attachment-choice"
                checked={!isDirectAttachment}
                onChange={() => {
                  if (!subcategoryId && activeRootNode.children[0]) {
                    handleSelectSubcategory(activeRootNode.children[0].id);
                  } else {
                    setIsDirectAttachment(false);
                  }
                }}
                className={styles.checkboxInput}
              />
              <span className={styles.checkboxText}>
                Select a specific &ldquo;{activeRootNode.category.name}&rdquo; subcategory:
              </span>
            </label>

            {!isDirectAttachment && (
              <div
                className={styles.optionGrid}
                role="radiogroup"
                aria-label="Child subcategories"
              >
                {activeRootNode.children.map((child) => {
                  const isChildSelected = subcategoryId === child.id;
                  return (
                    <button
                      key={child.id}
                      type="button"
                      role="radio"
                      aria-checked={isChildSelected}
                      className={isChildSelected ? styles.optionCardSelected : styles.optionCard}
                      onClick={() => handleSelectSubcategory(child.id)}
                    >
                      <div className={styles.optionHeader}>
                        <span className={styles.optionTitle}>{child.name}</span>
                        {isChildSelected && (
                          <Check className={styles.bannerIcon} aria-hidden="true" />
                        )}
                      </div>
                      {child.description && (
                        <p className={styles.optionDescription}>{child.description}</p>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Step 2: Record Type */}
      {effectiveCategoryId && (
        <section className={styles.stepCard} aria-labelledby="step-2-heading">
          <header className={styles.stepHeader}>
            <span className={styles.stepNumber}>Step 2</span>
            <h2 id="step-2-heading" className={styles.stepTitle}>
              Select permitted record type
            </h2>
            <p className={styles.stepDescription}>
              Record types describe the nature of the stored evidence or scientific object (e.g.
              field occurrence, physical specimen, general reference).
            </p>
          </header>

          {loadingRecordTypes && (
            <div className={styles.loadingState} role="status" aria-live="polite">
              <div className={styles.loadingDot} aria-hidden="true" />
              <div className={styles.loadingDot} aria-hidden="true" />
              <div className={styles.loadingDot} aria-hidden="true" />
              <span>Loading permitted record types…</span>
            </div>
          )}

          {!loadingRecordTypes && recordTypesError && (
            <div className={styles.bannerError} role="alert">
              <div className={styles.bannerContent}>
                <span className={styles.bannerTitle}>Could not load record types</span>
                <p className={styles.bannerText}>{recordTypesError}</p>
              </div>
            </div>
          )}

          {!loadingRecordTypes && !recordTypesError && recordTypes.length === 0 && (
            <div className={styles.bannerError} role="alert">
              <div className={styles.bannerContent}>
                <span className={styles.bannerTitle}>No record types configured</span>
                <p className={styles.bannerText}>
                  This category does not have any permitted record types assigned.
                </p>
              </div>
            </div>
          )}

          {!loadingRecordTypes && !recordTypesError && recordTypes.length > 0 && (
            <div
              className={styles.optionGrid}
              role="radiogroup"
              aria-label="Permitted record types"
            >
              {recordTypes.map((rt) => {
                const isSelected = recordTypeId === rt.id;
                return (
                  <button
                    key={rt.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    className={isSelected ? styles.optionCardSelected : styles.optionCard}
                    onClick={() => setRecordTypeId(rt.id)}
                  >
                    <div className={styles.optionHeader}>
                      <span className={styles.optionTitle}>{rt.name}</span>
                      {isSelected && <Check className={styles.bannerIcon} aria-hidden="true" />}
                    </div>
                    {rt.description && (
                      <p className={styles.optionDescription}>{rt.description}</p>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Action button */}
          <div className={styles.actionsBar}>
            <div className={styles.actionGroup} />
            <div className={styles.actionGroup}>
              <button
                type="button"
                className={styles.buttonPrimary}
                disabled={!isComplete}
                onClick={handleConfirm}
              >
                <span>Continue to scientific attributes</span>
                <ArrowRight aria-hidden="true" />
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
