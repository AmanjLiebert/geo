import { describe, expect, it } from "vitest";
import {
  buildCategoryTree,
  formatFieldValueForSubmit,
  sortTemplateFields,
  validateFieldInput,
  validateSlug,
} from "./record-editor-utils";
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
      expect(sorted.map((f) => f.id)).toEqual(["f-req-1", "f-req-2", "f-opt-1", "f-opt-2"]);
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
      expect(validateFieldInput(field, "Ab")).toBe("Use at least 3 characters.");
      expect(validateFieldInput(field, "Limestone Extra Long")).toBe("Use no more than 10 characters.");
      expect(validateFieldInput(field, "Rock123")).toBe("Value does not match the required format.");
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
      expect(validateFieldInput(field, "abc")).toBe("Please enter a valid whole number.");
      expect(validateFieldInput(field, 3.14)).toBe("Please enter a valid whole number.");
      expect(validateFieldInput(field, 0)).toBe("Value must be at least 1.");
      expect(validateFieldInput(field, 101)).toBe("Value must be no more than 100.");
      expect(validateFieldInput(field, 42)).toBeNull();
      expect(validateFieldInput(field, "42")).toBeNull();
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
      expect(validateFieldInput(field, "not-a-number")).toBe("Please enter a valid number.");
      expect(validateFieldInput(field, 0.5)).toBe("Value must be at least 1.");
      expect(validateFieldInput(field, 10.5)).toBe("Value must be no more than 10.");
      expect(validateFieldInput(field, 6.5)).toBeNull();
      expect(validateFieldInput(field, "6.5")).toBeNull();
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
      expect(validateFieldInput(field, "2024-13-45")).toBe("Please enter a valid date in YYYY-MM-DD format.");
      expect(validateFieldInput(field, "2024-02-30")).toBe("Please enter a valid date in YYYY-MM-DD format.");
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
      expect(validateFieldInput(field, "unknown")).toBe("Selected option is not allowed.");
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
      expect(validateSlug(longSlug)).toBe("Slug must be 160 characters or fewer.");
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
      const multiField: TemplateField = { ...textField, dataType: "multi_choice" };

      expect(formatFieldValueForSubmit(textField, "  trimmed text  ")).toBe("trimmed text");
      expect(formatFieldValueForSubmit(textField, "")).toBeUndefined();
      expect(formatFieldValueForSubmit(intField, "42")).toBe(42);
      expect(formatFieldValueForSubmit(intField, "")).toBeUndefined();
      expect(formatFieldValueForSubmit(decField, "3.1415")).toBe(3.1415);
      expect(formatFieldValueForSubmit(boolField, true)).toBe(true);
      expect(formatFieldValueForSubmit(boolField, false)).toBe(false);
      expect(formatFieldValueForSubmit(multiField, ["a", "b"])).toEqual(["a", "b"]);
    });
  });
});
