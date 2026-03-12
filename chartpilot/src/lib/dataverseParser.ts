import type { DataRow } from '../types';

export interface DataverseParseResult {
  columns: string[];
  rows: DataRow[];
  error?: string;
}

/**
 * Parse a Dataverse / OData JSON response into columns + rows.
 *
 * Accepts:
 *  - OData envelope: `{ "@odata.context": "...", "value": [...] }`
 *  - Plain JSON array: `[{ ... }, ...]`
 *
 * OData metadata keys (starting with "@") are stripped from columns.
 */
export function parseDataverseJson(jsonText: string): DataverseParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return { columns: [], rows: [], error: 'Invalid JSON — please paste valid JSON output from your Dataverse API.' };
  }

  // Normalise to an array of records
  let records: unknown[];
  if (Array.isArray(parsed)) {
    records = parsed;
  } else if (
    parsed !== null &&
    typeof parsed === 'object' &&
    Array.isArray((parsed as Record<string, unknown>)['value'])
  ) {
    records = (parsed as Record<string, unknown>)['value'] as unknown[];
  } else {
    return {
      columns: [],
      rows: [],
      error: 'Expected a JSON array or an OData response with a "value" array.',
    };
  }

  if (records.length === 0) {
    return { columns: [], rows: [] };
  }

  const firstRecord = records[0];
  if (!firstRecord || typeof firstRecord !== 'object' || Array.isArray(firstRecord)) {
    return { columns: [], rows: [], error: 'Each record must be a JSON object.' };
  }

  // Strip OData annotation keys (@odata.etag, etc.)
  const columns = Object.keys(firstRecord as object).filter((k) => !k.startsWith('@'));

  if (columns.length === 0) {
    return { columns: [], rows: [], error: 'No usable columns found after filtering OData metadata.' };
  }

  const rows: DataRow[] = records.map((record) => {
    const obj = record as Record<string, unknown>;
    const row: DataRow = {};
    for (const col of columns) {
      const val = obj[col];
      if (val === null || val === undefined) {
        row[col] = '';
      } else if (typeof val === 'number') {
        row[col] = val;
      } else if (typeof val === 'boolean') {
        row[col] = val ? 1 : 0;
      } else {
        row[col] = String(val);
      }
    }
    return row;
  });

  return { columns, rows };
}
