import { FieldDataType, FieldDefinition, ValidationIssue } from './scientific-content.types';

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export function validateAttributes(
  fields: readonly FieldDefinition[],
  attributes: Record<string, unknown>,
  requireComplete: boolean,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const byKey = new Map(fields.map((field) => [field.stableKey, field]));

  for (const key of Object.keys(attributes)) {
    if (!byKey.has(key)) {
      issues.push({ field: key, code: 'unknown', message: 'This field is not in the template.' });
    }
  }

  for (const field of fields) {
    const value = attributes[field.stableKey];
    const missing = value === undefined || value === null || value === '';
    if (missing) {
      if (requireComplete && field.required && field.status === 'active') {
        issues.push({
          field: field.stableKey,
          code: 'required',
          message: 'A value is required.',
        });
      }
      continue;
    }

    if (!matchesType(field.dataType, value)) {
      issues.push({
        field: field.stableKey,
        code: 'type',
        message: `Value must match ${field.dataType}.`,
      });
      continue;
    }

    issues.push(...validateRules(field, value));
  }

  return issues;
}

export function applyFieldMapping(
  attributes: Record<string, unknown>,
  targetFields: readonly FieldDefinition[],
  mapping: Record<string, string | null>,
): Record<string, unknown> {
  const targetKeys = new Set(targetFields.map((field) => field.stableKey));
  const mapped: Record<string, unknown> = {};

  for (const [sourceKey, value] of Object.entries(attributes)) {
    let targetKey: string | null = sourceKey;
    if (Object.prototype.hasOwnProperty.call(mapping, sourceKey)) {
      targetKey = mapping[sourceKey] ?? null;
    }
    if (targetKey !== null && targetKeys.has(targetKey)) mapped[targetKey] = value;
  }

  return mapped;
}

function matchesType(type: FieldDataType, value: unknown): boolean {
  switch (type) {
    case FieldDataType.TEXT:
    case FieldDataType.LONG_TEXT:
    case FieldDataType.CHOICE:
      return typeof value === 'string';
    case FieldDataType.INTEGER:
      return typeof value === 'number' && Number.isSafeInteger(value);
    case FieldDataType.DECIMAL:
      return typeof value === 'number' && Number.isFinite(value);
    case FieldDataType.BOOLEAN:
      return typeof value === 'boolean';
    case FieldDataType.DATE:
      return typeof value === 'string' && datePattern.test(value) && isRealDate(value);
    case FieldDataType.MULTI_CHOICE:
      return Array.isArray(value) && value.every((item) => typeof item === 'string');
  }
}

function validateRules(field: FieldDefinition, value: unknown): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const rules = field.validation;
  if (typeof value === 'string') {
    const minLength = numberRule(rules.minLength);
    const maxLength = numberRule(rules.maxLength);
    if (minLength !== null && value.length < minLength) {
      issues.push(issue(field, 'minLength', `Use at least ${minLength} characters.`));
    }
    if (maxLength !== null && value.length > maxLength) {
      issues.push(issue(field, 'maxLength', `Use no more than ${maxLength} characters.`));
    }
    const pattern = typeof rules.pattern === 'string' ? rules.pattern : null;
    if (pattern && pattern.length <= 200 && !safePatternMatches(pattern, value)) {
      issues.push(issue(field, 'pattern', 'Value does not match the required format.'));
    }
  }

  if (typeof value === 'number') {
    const minimum = numberRule(rules.minimum);
    const maximum = numberRule(rules.maximum);
    if (minimum !== null && value < minimum) {
      issues.push(issue(field, 'minimum', `Value must be at least ${minimum}.`));
    }
    if (maximum !== null && value > maximum) {
      issues.push(issue(field, 'maximum', `Value must be no more than ${maximum}.`));
    }
  }

  const options = Array.isArray(rules.options)
    ? rules.options.filter((option): option is string => typeof option === 'string')
    : null;
  if (options && typeof value === 'string' && !options.includes(value)) {
    issues.push(issue(field, 'option', 'Value is not an allowed option.'));
  }
  if (
    options &&
    Array.isArray(value) &&
    value.some((item) => typeof item !== 'string' || !options.includes(item))
  ) {
    issues.push(issue(field, 'option', 'One or more values are not allowed options.'));
  }

  return issues;
}

function safePatternMatches(pattern: string, value: string): boolean {
  try {
    return new RegExp(pattern, 'u').test(value);
  } catch {
    return false;
  }
}

function isRealDate(value: string): boolean {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function numberRule(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function issue(field: FieldDefinition, code: string, message: string): ValidationIssue {
  return { field: field.stableKey, code, message };
}
