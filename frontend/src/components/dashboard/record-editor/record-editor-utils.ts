import type {
  CategoryTreeNode,
  StructureCategory,
  TemplateField,
} from "./record-editor-types";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const numericPattern = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/;

export type NumericParseResult =
  | { success: true; value: number }
  | { success: false; error: string };

/**
 * Parses and validates numeric inputs (both strings and numbers) consistently
 * for integers and decimals, supporting exponents, negative values, and
 * safe integer bounds while rejecting fractions, unsafe integers, and malformed strings.
 */
export function parseNumericValue(
  rawValue: unknown,
  type: "integer" | "decimal",
): NumericParseResult {
  if (rawValue === undefined || rawValue === null || rawValue === "") {
    return {
      success: false,
      error:
        type === "integer"
          ? "Please enter a valid whole number."
          : "Please enter a valid number.",
    };
  }

  let num: number;

  if (typeof rawValue === "number") {
    num = rawValue;
  } else if (typeof rawValue === "string") {
    const trimmed = rawValue.trim();
    if (trimmed === "" || !numericPattern.test(trimmed)) {
      return {
        success: false,
        error:
          type === "integer"
            ? "Please enter a valid whole number."
            : "Please enter a valid number.",
      };
    }
    num = Number(trimmed);
  } else {
    return {
      success: false,
      error:
        type === "integer"
          ? "Please enter a valid whole number."
          : "Please enter a valid number.",
    };
  }

  if (Number.isNaN(num) || !Number.isFinite(num)) {
    return {
      success: false,
      error:
        type === "integer"
          ? "Please enter a valid whole number."
          : "Please enter a valid number.",
    };
  }

  if (type === "integer") {
    if (!Number.isInteger(num)) {
      return {
        success: false,
        error: "Please enter a valid whole number.",
      };
    }
    if (!Number.isSafeInteger(num)) {
      return {
        success: false,
        error: "Value is outside the supported safe integer range.",
      };
    }
  }

  return { success: true, value: num };
}

/**
 * Builds a hierarchical tree from a flat list of scientific categories.
 * Separates top-level root categories and their child subcategories.
 */
export function buildCategoryTree(categories: StructureCategory[]): CategoryTreeNode[] {
  const rootCategories = categories
    .filter((c) => c.parentId === null)
    .sort((a, b) => a.position - b.position || a.stableKey.localeCompare(b.stableKey));

  return rootCategories.map((root) => {
    const children = categories
      .filter((c) => c.parentId === root.id)
      .sort((a, b) => a.position - b.position || a.stableKey.localeCompare(b.stableKey));

    return {
      category: root,
      children,
      allowsDirectRecords: root.recordsAllowed,
      hasChildren: children.length > 0,
    };
  });
}

/**
 * Orders template fields so required fields appear first,
 * ordered by position and stableKey, followed by optional fields.
 */
export function sortTemplateFields(fields: TemplateField[]): TemplateField[] {
  const activeFields = fields.filter((f) => f.status === "active");

  const requiredFields = activeFields
    .filter((f) => f.required)
    .sort((a, b) => a.position - b.position || a.stableKey.localeCompare(b.stableKey));

  const optionalFields = activeFields
    .filter((f) => !f.required)
    .sort((a, b) => a.position - b.position || a.stableKey.localeCompare(b.stableKey));

  return [...requiredFields, ...optionalFields];
}

/**
 * Validates a single field value against its data type and validation rules.
 * Returns null if valid, or a plain-language error message if invalid.
 */
export function validateFieldInput(field: TemplateField, value: unknown): string | null {
  const isValueEmpty =
    value === undefined || value === null || (typeof value === "string" && value.trim() === "");

  if (isValueEmpty) {
    return null;
  }

  const rules = field.validation ?? {};

  switch (field.dataType) {
    case "text":
    case "long_text": {
      if (typeof value !== "string") {
        return "Must be text.";
      }
      const trimmed = value.trim();
      if (typeof rules.minLength === "number" && trimmed.length < rules.minLength) {
        return `Use at least ${rules.minLength} characters.`;
      }
      if (typeof rules.maxLength === "number" && trimmed.length > rules.maxLength) {
        return `Use no more than ${rules.maxLength} characters.`;
      }
      if (typeof rules.pattern === "string" && rules.pattern.length <= 200) {
        try {
          const regex = new RegExp(rules.pattern, "u");
          if (!regex.test(trimmed)) {
            return "Value does not match the required format.";
          }
        } catch {
          // Ignore invalid regex in template
        }
      }
      return null;
    }

    case "integer":
    case "decimal": {
      const parsed = parseNumericValue(value, field.dataType);
      if (!parsed.success) {
        return parsed.error;
      }
      const num = parsed.value;
      if (typeof rules.minimum === "number" && num < rules.minimum) {
        return `Value must be at least ${rules.minimum}.`;
      }
      if (typeof rules.maximum === "number" && num > rules.maximum) {
        return `Value must be no more than ${rules.maximum}.`;
      }
      return null;
    }

    case "boolean": {
      if (typeof value !== "boolean") {
        return "Must be true or false.";
      }
      return null;
    }

    case "date": {
      if (typeof value !== "string" || !datePattern.test(value) || !isRealDate(value)) {
        return "Please enter a valid date in YYYY-MM-DD format.";
      }
      return null;
    }

    case "choice": {
      if (typeof value !== "string") {
        return "Please select a valid option.";
      }
      const options = Array.isArray(rules.options)
        ? rules.options.filter((o): o is string => typeof o === "string")
        : null;
      if (options && !options.includes(value)) {
        return "Selected option is not allowed.";
      }
      return null;
    }

    case "multi_choice": {
      if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
        return "Must be a list of selections.";
      }
      const options = Array.isArray(rules.options)
        ? rules.options.filter((o): o is string => typeof o === "string")
        : null;
      if (options && value.some((item) => !options.includes(item))) {
        return "One or more selected options are not allowed.";
      }
      return null;
    }

    default:
      return null;
  }
}

/**
 * Validates a record slug string according to platform rules.
 */
export function validateSlug(slug: string): string | null {
  const trimmed = slug.trim();
  if (trimmed === "") {
    return null;
  }
  if (trimmed.length > 160) {
    return "Slug must be 160 characters or fewer.";
  }
  if (!slugPattern.test(trimmed)) {
    return "Slug must contain only lowercase letters, numbers, and hyphens (e.g. zagros-specimen-1).";
  }
  return null;
}

/**
 * Formats a raw form input value into its typed payload representation.
 */
export function formatFieldValueForSubmit(field: TemplateField, rawValue: unknown): unknown {
  if (rawValue === undefined || rawValue === null || rawValue === "") {
    return undefined;
  }

  switch (field.dataType) {
    case "text":
    case "long_text":
    case "choice":
    case "date":
      return typeof rawValue === "string" ? rawValue.trim() : String(rawValue);

    case "integer":
    case "decimal": {
      const parsed = parseNumericValue(rawValue, field.dataType);
      return parsed.success ? parsed.value : undefined;
    }

    case "boolean":
      return Boolean(rawValue);

    case "multi_choice":
      return Array.isArray(rawValue) ? rawValue.filter((item) => typeof item === "string") : [];

    default:
      return rawValue;
  }
}

export function isRealDate(value: string): boolean {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
