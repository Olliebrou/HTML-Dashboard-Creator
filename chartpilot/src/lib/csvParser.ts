import type { DataRow } from '../types';

export interface ParseResult {
  columns: string[];
  rows: DataRow[];
  error?: string;
}

/**
 * Parse CSV text into columns + rows.
 * Handles quoted fields and trims whitespace.
 */
export function parseCSV(text: string): ParseResult {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 1) return { columns: [], rows: [], error: 'Empty file' };

  const columns = splitCSVLine(lines[0]);
  if (columns.length === 0) return { columns: [], rows: [], error: 'No columns found' };

  const rows: DataRow[] = lines.slice(1).map((line) => {
    const values = splitCSVLine(line);
    const row: DataRow = {};
    columns.forEach((col, i) => {
      const raw = values[i] ?? '';
      const trimmed = raw.trim();
      const num = Number(trimmed);
      row[col] = trimmed !== '' && !isNaN(num) ? num : raw;
    });
    return row;
  });

  return { columns, rows };
}

function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}
