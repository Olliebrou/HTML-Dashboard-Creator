import type {
  DataRow,
  DataTransform,
  FilterTransform,
  SortTransform,
  TopNTransform,
  GroupAggregateTransform,
  AggregateFunction,
} from '../types';

export interface TransformResult {
  rows: DataRow[];
  columns: string[];
}

/**
 * Apply a list of transforms to rows+columns sequentially.
 * Each transform receives the output of the previous one.
 */
export function applyTransforms(
  rows: DataRow[],
  columns: string[],
  transforms: DataTransform[],
): TransformResult {
  let result: TransformResult = { rows: [...rows], columns: [...columns] };

  for (const t of transforms) {
    switch (t.type) {
      case 'filter':
        result = applyFilter(result, t);
        break;
      case 'sort':
        result = applySort(result, t);
        break;
      case 'topN':
        result = applyTopN(result, t);
        break;
      case 'groupAggregate':
        result = applyGroupAggregate(result, t);
        break;
    }
  }

  return result;
}

// ── Filter ────────────────────────────────────────────────────────────────────

function applyFilter(
  { rows, columns }: TransformResult,
  t: FilterTransform,
): TransformResult {
  const filtered = rows.filter((row) => {
    const cell = row[t.column];
    const cellStr = String(cell ?? '').toLowerCase();
    const valStr = t.value.toLowerCase();
    const cellNum = Number(cell);
    const valNum = Number(t.value);

    switch (t.operator) {
      case 'eq': return cellStr === valStr;
      case 'neq': return cellStr !== valStr;
      case 'gt': return !isNaN(cellNum) && !isNaN(valNum) ? cellNum > valNum : cellStr > valStr;
      case 'gte': return !isNaN(cellNum) && !isNaN(valNum) ? cellNum >= valNum : cellStr >= valStr;
      case 'lt': return !isNaN(cellNum) && !isNaN(valNum) ? cellNum < valNum : cellStr < valStr;
      case 'lte': return !isNaN(cellNum) && !isNaN(valNum) ? cellNum <= valNum : cellStr <= valStr;
      case 'contains': return cellStr.includes(valStr);
      case 'not_contains': return !cellStr.includes(valStr);
      default: return true;
    }
  });
  return { rows: filtered, columns };
}

// ── Sort ──────────────────────────────────────────────────────────────────────

function applySort(
  { rows, columns }: TransformResult,
  t: SortTransform,
): TransformResult {
  const sorted = [...rows].sort((a, b) => {
    const av = a[t.column];
    const bv = b[t.column];
    const an = Number(av);
    const bn = Number(bv);
    let cmp: number;
    if (!isNaN(an) && !isNaN(bn)) {
      cmp = an - bn;
    } else {
      cmp = String(av ?? '').localeCompare(String(bv ?? ''));
    }
    return t.direction === 'asc' ? cmp : -cmp;
  });
  return { rows: sorted, columns };
}

// ── Top N ─────────────────────────────────────────────────────────────────────

function applyTopN(
  { rows, columns }: TransformResult,
  t: TopNTransform,
): TransformResult {
  let working = [...rows];
  if (t.column) {
    const col = t.column;
    const dir = t.direction ?? 'desc';
    working = working.sort((a, b) => {
      const an = Number(a[col]);
      const bn = Number(b[col]);
      const cmp = !isNaN(an) && !isNaN(bn)
        ? an - bn
        : String(a[col] ?? '').localeCompare(String(b[col] ?? ''));
      return dir === 'asc' ? cmp : -cmp;
    });
  }
  return { rows: working.slice(0, t.n), columns };
}

// ── Group + Aggregate ─────────────────────────────────────────────────────────

function applyGroupAggregate(
  { rows }: TransformResult,
  t: GroupAggregateTransform,
): TransformResult {
  const groups = new Map<string, DataRow[]>();
  for (const row of rows) {
    const key = String(row[t.groupBy] ?? '');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }

  const newRows: DataRow[] = [];
  for (const [key, groupRows] of groups) {
    const newRow: DataRow = { [t.groupBy]: key };
    for (const agg of t.aggregations) {
      const alias = agg.alias ?? `${agg.fn}(${agg.column})`;
      newRow[alias] = computeAggregate(groupRows, agg.column, agg.fn);
    }
    newRows.push(newRow);
  }

  const newColumns = [
    t.groupBy,
    ...t.aggregations.map((a) => a.alias ?? `${a.fn}(${a.column})`),
  ];

  return { rows: newRows, columns: newColumns };
}

function computeAggregate(
  rows: DataRow[],
  column: string,
  fn: AggregateFunction,
): number {
  if (fn === 'count') return rows.length;

  const nums = rows
    .map((r) => Number(r[column]))
    .filter((n) => !isNaN(n));

  if (nums.length === 0) return 0;

  switch (fn) {
    case 'sum': return nums.reduce((acc, n) => acc + n, 0);
    case 'avg': return nums.reduce((acc, n) => acc + n, 0) / nums.length;
    case 'min': return Math.min(...nums);
    case 'max': return Math.max(...nums);
    default: return 0;
  }
}
