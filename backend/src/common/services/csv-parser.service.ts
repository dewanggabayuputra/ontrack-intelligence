import { Injectable, Logger } from '@nestjs/common';
import { parse } from 'csv-parse';
import { Readable } from 'stream';

export interface ParsedRow {
  lineNumber: number;
  data: Record<string, any>;
}

export interface ParseResult {
  headers: string[];
  rows: ParsedRow[];
  totalRows: number;
}

@Injectable()
export class CsvParserService {
  private readonly logger = new Logger(CsvParserService.name);

  /**
   * Parse CSV buffer and return headers + rows
   */
  async parseBuffer(buffer: Buffer): Promise<ParseResult> {
    return new Promise((resolve, reject) => {
      const rows: ParsedRow[] = [];
      let headers: string[] = [];
      let lineNumber = 1;

      const parser = parse({
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
        relax_quotes: true,
      });

      parser.on('readable', function () {
        let record;
        while ((record = parser.read()) !== null) {
          // First row is headers
          if (lineNumber === 1) {
            headers = record;
          } else {
            const row: Record<string, any> = {};
            headers.forEach((header, index) => {
              row[header.toLowerCase().trim()] = record[index];
            });

            rows.push({
              lineNumber,
              data: row,
            });
          }
          lineNumber++;
        }
      });

      parser.on('error', (err) => {
        this.logger.error('CSV parse error', err);
        reject(err);
      });

      parser.on('end', () => {
        resolve({
          headers,
          rows,
          totalRows: rows.length,
        });
      });

      // Create readable stream from buffer
      const stream = Readable.from([buffer]);
      stream.pipe(parser);
    });
  }

  /**
   * Parse CSV from file path (for testing)
   */
  async parseFile(filePath: string): Promise<ParseResult> {
    const fs = await import('fs/promises');
    const buffer = await fs.readFile(filePath);
    return this.parseBuffer(buffer);
  }
}
