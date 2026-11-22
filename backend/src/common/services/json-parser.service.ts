import { Injectable, Logger } from '@nestjs/common';

export interface ParsedJsonRow {
  index: number;
  data: Record<string, any>;
  rawData: Record<string, any>;
}

export interface ParseJsonResult {
  rows: ParsedJsonRow[];
  totalRows: number;
}

@Injectable()
export class JsonParserService {
  private readonly logger = new Logger(JsonParserService.name);

  /**
   * Parse JSON buffer containing array of records
   * Expects: [{ projectId, recordDate, ... }, ...]
   */
  async parseBuffer(buffer: Buffer): Promise<ParseJsonResult> {
    try {
      const jsonText = buffer.toString('utf-8');
      let data: any;

      try {
        data = JSON.parse(jsonText);
      } catch (err) {
        this.logger.error('JSON parse error', err);
        throw new Error(`Invalid JSON: ${err.message}`);
      }

      const records = Array.isArray(data)
        ? data
        : data && typeof data === 'object'
        ? data.records || data.data
        : undefined;

      if (!Array.isArray(records)) {
        throw new Error('Expected JSON array or object with records/data array');
      }

      const rows: ParsedJsonRow[] = records.map((record, index) => {
        if (typeof record !== 'object' || record === null || Array.isArray(record)) {
          throw new Error(`Record ${index} must be a JSON object`);
        }

        return {
          index,
          data: this.normalizeRecord(record),
          rawData: record,
        };
      });

      return {
        rows,
        totalRows: rows.length,
      };
    } catch (err) {
      this.logger.error('JSON parsing failed', err);
      throw err;
    }
  }

  /**
   * Normalize record by converting keys to lowercase
   */
  private normalizeRecord(record: Record<string, any>): Record<string, any> {
    const normalized: Record<string, any> = {};

    for (const [key, value] of Object.entries(record)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Flatten nested objects
        const flattened = this.flattenObject(value, key);
        Object.assign(normalized, flattened);
      } else {
        normalized[key.toLowerCase().trim()] = value;
      }
    }

    return normalized;
  }

  /**
   * Flatten nested object with prefix
   */
  private flattenObject(
    obj: Record<string, any>,
    prefix: string,
  ): Record<string, any> {
    const flattened: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      const flatKey = `${prefix}_${key}`.toLowerCase();
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        Object.assign(flattened, this.flattenObject(value, flatKey));
      } else {
        flattened[flatKey] = value;
      }
    }

    return flattened;
  }

  /**
   * Validate that JSON has required structure
   */
  validateStructure(rows: ParsedJsonRow[], requiredFields: string[]): string[] {
    const errors: string[] = [];

    rows.forEach((row, index) => {
      requiredFields.forEach((field) => {
        if (!(field.toLowerCase() in row.data)) {
          errors.push(
            `Record ${index}: Missing required field '${field}'`,
          );
        }
      });
    });

    return errors;
  }
}
