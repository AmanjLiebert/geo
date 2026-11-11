import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  buildCategoryTree,
  canChangeClassification,
  formatFieldValueForSubmit,
  formatSlugForSubmit,
  isRecordCategoryArchived,
  isRecordEditorReadOnly,
  sortTemplateFields,
  validateFieldInput,
  validateSlug,
} from "./record-editor-utils";
import { RecordTemplateForm } from "./record-template-form";
import { RecordStructureSelector } from "./record-structure-selector";
import type { StructureCategory, TemplateField } from "./record-editor-types";

describe("record-editor-utils", () => {
  const sampleCategories: StructureCategory[] = [
    {
      id: "cat-root-1",
      parentId: null,
      stableKey: "fossils",
      slug: "fossils",
      recordsAllowed: false,
      position: 1,
      name: "Fossils",
      description: "Fossils description",
      locale: "en",
      translationAvailable: true,
    },
    {
      id: "cat-child-1",
      parentId: "cat-root-1",
      stableKey: "invertebrates",
      slug: "invertebrates",
      recordsAllowed: true,
      position: 1,
      name: "Invertebrates",
      description: null,
      locale: "en",
      translationAvailable: true,
    },
    {
      id: "cat-root-2",
      parentId: null,
      stableKey: "formations",
      slug: "formations",
      recordsAllowed: true,
      position: 2,
      name: "Geological Formations",
      description: "Direct records allowed",
      locale: "en",
      translationAvailable: true,
    },
  ];

  describe("buildCategoryTree", () => {
    it("groups categories by parent and identifies direct records capability", () => {
      const tree = buildCategoryTree(sampleCategories);
      expect(tree).toHaveLength(2);

      const fossilsNode = tree.find((n) => n.category.id === "cat-root-1")!;
      expect(fossilsNode.allowsDirectRecords).toBe(false);
      expect(fossilsNode.hasChildren).toBe(true);
      expect(fossilsNode.children).toHaveLength(1);
      expect(fossilsNode.children[0].id).toBe("cat-child-1");

      const formationsNode = tree.find((n) => n.category.id === "cat-root-2")!;
      expect(formationsNode.allowsDirectRecords).toBe(true);
      expect(formationsNode.hasChildren).toBe(false);
      expect(formationsNode.children).toHaveLength(0);
    });
  });

  describe("sortTemplateFields", () => {
    it("places active required fields first, ordered by position, followed by optional fields", () => {
      const fields: TemplateField[] = [
        {
          id: "f-opt-2",
          stableKey: "b_opt",
          dataType: "text",
          required: false,
          validation: {},
          unit: null,
          searchable: false,
          filterable: false,
          position: 2,
          status: "active",
          label: "Optional Two",
          helpText: null,
          locale: "en",
          translationAvailable: true,
        },
        {
          id: "f-req-2",
          stableKey: "b_req",
          dataType: "text",
          required: true,
          validation: {},
          unit: null,
          searchable: false,
          filterable: false,
          position: 2,
          status: "active",
          label: "Required Two",
          helpText: null,
          locale: "en",
          translationAvailable: true,
        },
        {
          id: "f-opt-1",
          stableKey: "a_opt",
          dataType: "text",
          required: false,
          validation: {},
          unit: null,
          searchable: false,
          filterable: false,
          position: 1,
          status: "active",
          label: "Optional One",
          helpText: null,
          locale: "en",
          translationAvailable: true,
        },
        {
          id: "f-req-1",
          stableKey: "a_req",
          dataType: "text",
          required: true,
          validation: {},
          unit: null,
          searchable: false,
          filterable: false,
          position: 1,
          status: "active",
          label: "Required One",
          helpText: null,
          locale: "en",
          translationAvailable: true,
        },
        {
          id: "f-dep",
          stableKey: "dep_field",
          dataType: "text",
          required: false,
          validation: {},
          unit: null,
          searchable: false,
          filterable: false,
          position: 0,
          status: "deprecated",
          label: "Deprecated",
          helpText: null,
          locale: "en",
          translationAvailable: true,
        },
      ];

      const sorted = sortTemplateFields(fields);
      expect(sorted).toHaveLength(4);
      expect(sorted.map((f) => f.id)).toEqual([
        "f-req-1",
        "f-req-2",
        "f-opt-1",
        "f-opt-2",
      ]);
    });
  });

  describe("validateFieldInput", () => {
    it("validates text fields with minLength, maxLength, and pattern", () => {
      const field: TemplateField = {
        id: "f1",
        stableKey: "lithology",
        dataType: "text",
        required: false,
        validation: { minLength: 3, maxLength: 10, pattern: "^[A-Za-z ]+$" },
        unit: null,
        searchable: false,
        filterable: false,
        position: 1,
        status: "active",
        label: "Lithology",
        helpText: null,
        locale: "en",
        translationAvailable: true,
      };

      expect(validateFieldInput(field, "")).toBeNull();
      expect(validateFieldInput(field, "Ab")).toBe(
        "Use at least 3 characters.",
      );
      expect(validateFieldInput(field, "Limestone Extra Long")).toBe(
        "Use no more than 10 characters.",
      );
      expect(validateFieldInput(field, "Rock123")).toBe(
        "Value does not match the required format.",
      );
      expect(validateFieldInput(field, "Limestone")).toBeNull();
    });

    it("validates integer fields with whole number check, minimum, and maximum", () => {
      const field: TemplateField = {
        id: "f2",
        stableKey: "count",
        dataType: "integer",
        required: false,
        validation: { minimum: 1, maximum: 100 },
        unit: null,
        searchable: false,
        filterable: false,
        position: 1,
        status: "active",
        label: "Count",
        helpText: null,
        locale: "en",
        translationAvailable: true,
      };

      expect(validateFieldInput(field, "")).toBeNull();
      expect(validateFieldInput(field, "abc")).toBe(
        "Please enter a valid whole number.",
      );
      expect(validateFieldInput(field, 3.14)).toBe(
        "Please enter a valid whole number.",
      );
      expect(validateFieldInput(field, 0)).toBe("Value must be at least 1.");
      expect(validateFieldInput(field, 101)).toBe(
        "Value must be no more than 100.",
      );
      expect(validateFieldInput(field, 42)).toBeNull();
      expect(validateFieldInput(field, "42")).toBeNull();
    });

    it("handles integer exponent notation, fractions, negative values, and unsafe integers", () => {
      const field: TemplateField = {
        id: "f2-reg",
        stableKey: "depth",
        dataType: "integer",
        required: false,
        validation: { minimum: -500, maximum: 5000 },
        unit: "m",
        searchable: false,
        filterable: false,
        position: 1,
        status: "active",
        label: "Depth",
        helpText: null,
        locale: "en",
        translationAvailable: true,
      };

      // Exponent notation: whole number results
      expect(validateFieldInput(field, "1e2")).toBeNull(); // 100
      expect(validateFieldInput(field, "2.5e3")).toBeNull(); // 2500
      expect(validateFieldInput(field, "-1e2")).toBeNull(); // -100

      // Exponent notation: fractional result fails integer check
      expect(validateFieldInput(field, "1e-2")).toBe(
        "Please enter a valid whole number.",
      ); // 0.01

      // Fractions are rejected
      expect(validateFieldInput(field, "1/2")).toBe(
        "Please enter a valid whole number.",
      );
      expect(validateFieldInput(field, "3/4")).toBe(
        "Please enter a valid whole number.",
      );
      expect(validateFieldInput(field, "10/2")).toBe(
        "Please enter a valid whole number.",
      );

      // Negative values
      expect(validateFieldInput(field, "-250")).toBeNull();
      expect(validateFieldInput(field, -250)).toBeNull();
      expect(validateFieldInput(field, "-600")).toBe(
        "Value must be at least -500.",
      );
      expect(validateFieldInput(field, "6000")).toBe(
        "Value must be no more than 5000.",
      );

      // Unsafe integers (> Number.MAX_SAFE_INTEGER)
      expect(validateFieldInput(field, "9007199254740992")).toBe(
        "Value is outside the supported safe integer range.",
      );
      expect(validateFieldInput(field, "-9007199254740992")).toBe(
        "Value is outside the supported safe integer range.",
      );
      expect(validateFieldInput(field, "1e25")).toBe(
        "Value is outside the supported safe integer range.",
      );
    });

    it("validates decimal fields with finite number check, minimum, and maximum", () => {
      const field: TemplateField = {
        id: "f3",
        stableKey: "hardness",
        dataType: "decimal",
        required: false,
        validation: { minimum: 1.0, maximum: 10.0 },
        unit: "Mohs",
        searchable: false,
        filterable: false,
        position: 1,
        status: "active",
        label: "Hardness",
        helpText: null,
        locale: "en",
        translationAvailable: true,
      };

      expect(validateFieldInput(field, "")).toBeNull();
      expect(validateFieldInput(field, "not-a-number")).toBe(
        "Please enter a valid number.",
      );
      expect(validateFieldInput(field, 0.5)).toBe("Value must be at least 1.");
      expect(validateFieldInput(field, 10.5)).toBe(
        "Value must be no more than 10.",
      );
      expect(validateFieldInput(field, 6.5)).toBeNull();
      expect(validateFieldInput(field, "6.5")).toBeNull();
    });

    it("handles decimal exponent notation, fractions, negative values, and bounds", () => {
      const field: TemplateField = {
        id: "f3-reg",
        stableKey: "dip_angle",
        dataType: "decimal",
        required: false,
        validation: { minimum: -90.0, maximum: 90.0 },
        unit: "degrees",
        searchable: false,
        filterable: false,
        position: 1,
        status: "active",
        label: "Dip Angle",
        helpText: null,
        locale: "en",
        translationAvailable: true,
      };

      // Exponent notation: decimals
      expect(validateFieldInput(field, "1e1")).toBeNull(); // 10
      expect(validateFieldInput(field, "1.5e-1")).toBeNull(); // 0.15
      expect(validateFieldInput(field, "-4.5e1")).toBeNull(); // -45

      // Fractions are rejected
      expect(validateFieldInput(field, "1/2")).toBe(
        "Please enter a valid number.",
      );
      expect(validateFieldInput(field, "45/2")).toBe(
        "Please enter a valid number.",
      );

      // Negative values
      expect(validateFieldInput(field, "-45.5")).toBeNull();
      expect(validateFieldInput(field, -45.5)).toBeNull();
      expect(validateFieldInput(field, "-95.0")).toBe(
        "Value must be at least -90.",
      );
      expect(validateFieldInput(field, "95.0")).toBe(
        "Value must be no more than 90.",
      );

      // Infinity / NaN
      expect(validateFieldInput(field, "Infinity")).toBe(
        "Please enter a valid number.",
      );
      expect(validateFieldInput(field, "-Infinity")).toBe(
        "Please enter a valid number.",
      );
    });

    it("validates boolean fields", () => {
      const field: TemplateField = {
        id: "f4",
        stableKey: "is_fossiliferous",
        dataType: "boolean",
        required: false,
        validation: {},
        unit: null,
        searchable: false,
        filterable: false,
        position: 1,
        status: "active",
        label: "Fossiliferous",
        helpText: null,
        locale: "en",
        translationAvailable: true,
      };

      expect(validateFieldInput(field, true)).toBeNull();
      expect(validateFieldInput(field, false)).toBeNull();
    });

    it("validates date fields with ISO YYYY-MM-DD and calendar validity", () => {
      const field: TemplateField = {
        id: "f5",
        stableKey: "collected_date",
        dataType: "date",
        required: false,
        validation: {},
        unit: null,
        searchable: false,
        filterable: false,
        position: 1,
        status: "active",
        label: "Date Collected",
        helpText: null,
        locale: "en",
        translationAvailable: true,
      };

      expect(validateFieldInput(field, "")).toBeNull();
      expect(validateFieldInput(field, "2024-13-45")).toBe(
        "Please enter a valid date in YYYY-MM-DD format.",
      );
      expect(validateFieldInput(field, "2024-02-30")).toBe(
        "Please enter a valid date in YYYY-MM-DD format.",
      );
      expect(validateFieldInput(field, "2024-02-29")).toBeNull(); // leap year
      expect(validateFieldInput(field, "2024-05-15")).toBeNull();
    });

    it("validates choice fields against allowed options", () => {
      const field: TemplateField = {
        id: "f6",
        stableKey: "preservation",
        dataType: "choice",
        required: false,
        validation: { options: ["mold", "cast", "permineralized"] },
        unit: null,
        searchable: false,
        filterable: false,
        position: 1,
        status: "active",
        label: "Preservation",
        helpText: null,
        locale: "en",
        translationAvailable: true,
      };

      expect(validateFieldInput(field, "")).toBeNull();
      expect(validateFieldInput(field, "mold")).toBeNull();
      expect(validateFieldInput(field, "unknown")).toBe(
        "Selected option is not allowed.",
      );
    });

    it("validates multi_choice fields against allowed options", () => {
      const field: TemplateField = {
        id: "f7",
        stableKey: "minerals",
        dataType: "multi_choice",
        required: false,
        validation: { options: ["calcite", "quartz", "pyrite"] },
        unit: null,
        searchable: false,
        filterable: false,
        position: 1,
        status: "active",
        label: "Associated minerals",
        helpText: null,
        locale: "en",
        translationAvailable: true,
      };

      expect(validateFieldInput(field, [])).toBeNull();
      expect(validateFieldInput(field, ["calcite", "pyrite"])).toBeNull();
      expect(validateFieldInput(field, ["calcite", "gold"])).toBe(
        "One or more selected options are not allowed.",
      );
    });
  });

  describe("validateSlug", () => {
    it("accepts valid URL-friendly kebab-case slugs", () => {
      expect(validateSlug("")).toBeNull();
      expect(validateSlug("bekhme-limestone-occurrence-1")).toBeNull();
      expect(validateSlug("specimen-123")).toBeNull();
    });

    it("rejects invalid slugs with uppercase, spaces, or illegal punctuation", () => {
      expect(validateSlug("Bekhme-Limestone")).toBe(
        "Slug must contain only lowercase letters, numbers, and hyphens (e.g. zagros-specimen-1).",
      );
      expect(validateSlug("bekhme limestone")).toBe(
        "Slug must contain only lowercase letters, numbers, and hyphens (e.g. zagros-specimen-1).",
      );
      expect(validateSlug("bekhme_limestone")).toBe(
        "Slug must contain only lowercase letters, numbers, and hyphens (e.g. zagros-specimen-1).",
      );
      expect(validateSlug("-leading-hyphen")).toBe(
        "Slug must contain only lowercase letters, numbers, and hyphens (e.g. zagros-specimen-1).",
      );
    });

    it("rejects slugs exceeding 160 characters", () => {
      const longSlug = "a".repeat(161);
      expect(validateSlug(longSlug)).toBe(
        "Slug must be 160 characters or fewer.",
      );
    });
  });

  describe("formatFieldValueForSubmit", () => {
    it("converts raw inputs to appropriate JSON types", () => {
      const textField: TemplateField = {
        id: "f1",
        stableKey: "text",
        dataType: "text",
        required: false,
        validation: {},
        unit: null,
        searchable: false,
        filterable: false,
        position: 1,
        status: "active",
        label: "Text",
        helpText: null,
        locale: "en",
        translationAvailable: true,
      };
      const intField: TemplateField = { ...textField, dataType: "integer" };
      const decField: TemplateField = { ...textField, dataType: "decimal" };
      const boolField: TemplateField = { ...textField, dataType: "boolean" };
      const multiField: TemplateField = {
        ...textField,
        dataType: "multi_choice",
      };

      expect(formatFieldValueForSubmit(textField, "  trimmed text  ")).toBe(
        "trimmed text",
      );
      expect(formatFieldValueForSubmit(textField, "")).toBeUndefined();
      expect(formatFieldValueForSubmit(intField, "42")).toBe(42);
      expect(formatFieldValueForSubmit(intField, "1e2")).toBe(100); // Exponent converted to 100, not 1!
      expect(formatFieldValueForSubmit(intField, "-50")).toBe(-50);
      expect(formatFieldValueForSubmit(intField, "1/2")).toBeUndefined();
      expect(formatFieldValueForSubmit(intField, "")).toBeUndefined();
      expect(formatFieldValueForSubmit(decField, "3.1415")).toBe(3.1415);
      expect(formatFieldValueForSubmit(decField, "1e-3")).toBe(0.001);
      expect(formatFieldValueForSubmit(decField, "-2.5e2")).toBe(-250);
      expect(formatFieldValueForSubmit(boolField, true)).toBe(true);
      expect(formatFieldValueForSubmit(boolField, false)).toBe(false);
      expect(formatFieldValueForSubmit(multiField, ["a", "b"])).toEqual([
        "a",
        "b",
      ]);
    });
  });

  describe("canChangeClassification", () => {
    it("permits changing classification in create mode regardless of status", () => {
      expect(canChangeClassification("create")).toBe(true);
      expect(canChangeClassification("create", undefined)).toBe(true);
      expect(canChangeClassification("create", "unclassified_draft")).toBe(
        true,
      );
      expect(canChangeClassification("create", "draft")).toBe(true);
    });

    it("permits changing classification in edit mode ONLY for unclassified_draft", () => {
      expect(canChangeClassification("edit", "unclassified_draft")).toBe(true);
    });

    it("strictly forbids changing classification for already classified draft in edit mode", () => {
      expect(canChangeClassification("edit", "draft")).toBe(false);
    });

    it("strictly forbids changing classification for other terminal/review states in edit mode", () => {
      expect(canChangeClassification("edit", "published")).toBe(false);
      expect(canChangeClassification("edit", "archived")).toBe(false);
      expect(canChangeClassification("edit", "in_review")).toBe(false);
      expect(canChangeClassification("edit", null)).toBe(false);
      expect(canChangeClassification("edit", undefined)).toBe(false);
    });
  });

  describe("formatSlugForSubmit", () => {
    it("formats non-empty slug by trimming in both create and edit modes", () => {
      expect(formatSlugForSubmit("  rawandiz-chert  ", "create")).toBe(
        "rawandiz-chert",
      );
      expect(formatSlugForSubmit("  rawandiz-chert  ", "edit")).toBe(
        "rawandiz-chert",
      );
    });

    it("returns null in edit mode when slug is cleared or empty to explicitly clear in database", () => {
      expect(formatSlugForSubmit("", "edit")).toBeNull();
      expect(formatSlugForSubmit("   ", "edit")).toBeNull();
    });

    it("returns undefined in create mode when slug is omitted or empty", () => {
      expect(formatSlugForSubmit("", "create")).toBeUndefined();
      expect(formatSlugForSubmit("   ", "create")).toBeUndefined();
    });
  });

  describe("RecordTemplateForm button visibility", () => {
    const mockTemplate = {
      id: "tmpl-1",
      stableKey: "carbonate_rock",
      name: "Carbonate Rock",
      version: { id: "tv-1", number: 1, status: "active" as const },
      fields: [],
    };

    it("renders 'Change classification' button when onChangeClassification is provided in create mode", () => {
      const html = renderToStaticMarkup(
        createElement(RecordTemplateForm, {
          template: mockTemplate,
          categoryName: "Formations",
          recordTypeName: "Rock Unit",
          mode: "create",
          isSaving: false,
          onChangeClassification: () => {},
          onSubmit: () => {},
          onCancel: () => {},
        }),
      );
      expect(html).toContain("Change classification");
    });

    it("renders 'Change classification' button when onChangeClassification is provided in edit mode (unclassified draft)", () => {
      const html = renderToStaticMarkup(
        createElement(RecordTemplateForm, {
          template: mockTemplate,
          categoryName: "Formations",
          recordTypeName: "Rock Unit",
          mode: "edit",
          isSaving: false,
          onChangeClassification: () => {},
          onSubmit: () => {},
          onCancel: () => {},
        }),
      );
      expect(html).toContain("Change classification");
    });

    it("does NOT render 'Change classification' button when onChangeClassification is undefined (already classified draft in edit mode)", () => {
      const html = renderToStaticMarkup(
        createElement(RecordTemplateForm, {
          template: mockTemplate,
          categoryName: "Formations",
          recordTypeName: "Rock Unit",
          mode: "edit",
          isSaving: false,
          onChangeClassification: undefined,
          onSubmit: () => {},
          onCancel: () => {},
        }),
      );
      expect(html).not.toContain("Change classification");
    });

    it("renders helper notice for General geological record with no custom attributes", () => {
      const generalTemplate = {
        id: "tmpl-general",
        stableKey: "general_geological_record_template",
        name: "General geological record template",
        version: { id: "tv-gen-1", number: 1, status: "active" as const },
        fields: [],
      };
      const html = renderToStaticMarkup(
        createElement(RecordTemplateForm, {
          template: generalTemplate,
          categoryName: "Central Zagros",
          recordTypeName: "General geological record",
          mode: "create",
          isSaving: false,
          onSubmit: () => {},
          onCancel: () => {},
        }),
      );
      expect(html).toContain("General geological record template");
      expect(html).toContain(
        "This general geological record uses the common sections below",
      );
    });

    it("places save feedback after the save controls so it is visible where the action happened", () => {
      const html = renderToStaticMarkup(
        createElement(RecordTemplateForm, {
          template: mockTemplate,
          categoryName: "Formations",
          recordTypeName: "Rock Unit",
          mode: "edit",
          isSaving: false,
          saveSuccessMessage: "Your scientific fields are saved.",
          onSubmit: () => {},
          onCancel: () => {},
        }),
      );
      expect(html.indexOf("Save changes")).toBeGreaterThan(-1);
      expect(html.indexOf("Changes saved")).toBeGreaterThan(
        html.indexOf("Save changes"),
      );
    });
  });

  describe("RecordStructureSelector rendering", () => {
    const categories: StructureCategory[] = [
      {
        id: "cat-managed-root",
        parentId: null,
        stableKey: "managed_root",
        slug: "managed-root",
        recordsAllowed: true,
        position: 1,
        name: "Managed Region",
        description: "A newly managed geological category",
        locale: "en",
        translationAvailable: true,
      },
      {
        id: "cat-managed-child",
        parentId: "cat-managed-root",
        stableKey: "managed_child",
        slug: "managed-child",
        recordsAllowed: true,
        position: 1,
        name: "Managed District",
        description: "A managed subcategory",
        locale: "en",
        translationAvailable: true,
      },
      {
        id: "cat-specialist-root",
        parentId: null,
        stableKey: "fossils",
        slug: "fossils",
        recordsAllowed: false,
        position: 2,
        name: "Fossils",
        description: "Fossil collection",
        locale: "en",
        translationAvailable: true,
      },
      {
        id: "cat-specialist-child",
        parentId: "cat-specialist-root",
        stableKey: "invertebrates",
        slug: "invertebrates",
        recordsAllowed: true,
        position: 1,
        name: "Invertebrates",
        description: "Fossil invertebrates",
        locale: "en",
        translationAvailable: true,
      },
    ];

    it("renders direct attachment and subcategory choices when root allows direct records and has children", () => {
      const html = renderToStaticMarkup(
        createElement(RecordStructureSelector, {
          categories,
          initialSelection: {
            parentCategoryId: "cat-managed-root",
            categoryId: "cat-managed-root",
            isDirectAttachment: true,
            recordTypeId: null,
          },
          onConfirm: () => {},
        }),
      );
      expect(html).toContain("Managed Region");
      expect(html).toContain("Classification level");
      expect(html).toContain("Attach directly to general");
      expect(html).toContain("Select a specific");
    });

    it("renders subcategories directly without direct attachment radio when root forbids direct records", () => {
      const html = renderToStaticMarkup(
        createElement(RecordStructureSelector, {
          categories,
          initialSelection: {
            parentCategoryId: "cat-specialist-root",
            categoryId: "cat-specialist-child",
            isDirectAttachment: false,
            recordTypeId: null,
          },
          onConfirm: () => {},
        }),
      );
      expect(html).toContain("Fossils");
      expect(html).toContain("Select subcategory branch (required)");
      expect(html).toContain("Invertebrates");
      expect(html).not.toContain("Attach directly to general");
    });
  });

  describe("isRecordCategoryArchived", () => {
    it("returns false when categoryId is null or undefined", () => {
      expect(isRecordCategoryArchived(null, sampleCategories)).toBe(false);
      expect(isRecordCategoryArchived(undefined, sampleCategories)).toBe(false);
      expect(isRecordCategoryArchived("", sampleCategories)).toBe(false);
    });

    it("returns true when categories list is empty (edge case: all categories archived)", () => {
      expect(isRecordCategoryArchived("cat-child-1", [])).toBe(true);
    });

    it("returns true when categoryId is not in active categories (archived category)", () => {
      expect(
        isRecordCategoryArchived("cat-archived-999", sampleCategories),
      ).toBe(true);
    });

    it("returns false when categoryId is in active categories", () => {
      expect(isRecordCategoryArchived("cat-child-1", sampleCategories)).toBe(
        false,
      );
      expect(isRecordCategoryArchived("cat-root-2", sampleCategories)).toBe(
        false,
      );
    });
  });

  describe("isRecordEditorReadOnly", () => {
    it("returns true when category is archived even if record is draft", () => {
      expect(isRecordEditorReadOnly("draft", true)).toBe(true);
      expect(isRecordEditorReadOnly("unclassified_draft", true)).toBe(true);
    });

    it("returns true for non-editable record statuses", () => {
      expect(isRecordEditorReadOnly("published", false)).toBe(true);
      expect(isRecordEditorReadOnly("archived", false)).toBe(true);
      expect(isRecordEditorReadOnly("in_review", false)).toBe(true);
    });

    it("returns false for active drafts with active categories", () => {
      expect(isRecordEditorReadOnly("draft", false)).toBe(false);
      expect(isRecordEditorReadOnly("unclassified_draft", false)).toBe(false);
    });
  });
});
