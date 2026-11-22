import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';

/**
 * Validate a single row against DTO
 * Returns validation errors if any
 */
export async function validateRow<T extends object>(
  dtoClass: new () => T,
  rowData: Record<string, any>,
): Promise<string[]> {
  const instance = plainToClass(dtoClass, rowData);
  const errors = await validate(instance);

  return errors.map((error) => {
    const constraints = error.constraints || {};
    return Object.values(constraints).join(', ');
  });
}

/**
 * Trim whitespace from object values
 */
export function trimObjectValues(obj: Record<string, any>): Record<string, any> {
  const trimmed = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      trimmed[key] = value.trim();
    } else {
      trimmed[key] = value;
    }
  }
  return trimmed;
}

/**
 * Normalize CSV headers (lowercase, remove extra spaces)
 */
export function normalizeHeaders(headers: string[]): string[] {
  return headers.map((header) =>
    header
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^\w_]/g, ''),
  );
}

/**
 * Map CSV headers to DTO fields
 */
export function mapCsvToDtoFields(
  csvRow: Record<string, any>,
  headerMapping: Record<string, string>,
): Record<string, any> {
  const mapped = {};
  for (const [csvField, dtoField] of Object.entries(headerMapping)) {
    if (csvField in csvRow) {
      mapped[dtoField] = csvRow[csvField];
    }
  }
  return mapped;
}
