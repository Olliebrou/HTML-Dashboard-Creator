import { useState, useMemo } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, Info } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import Modal from '../common/Modal';
import type {
  DataSource, DataTransform, FilterTransform, SortTransform,
  TopNTransform, GroupAggregateTransform, FilterOperator,
  AggregateFunction, SortDirection,
} from '../../types';
import { useDashboardStore } from '../../stores/dashboardStore';
import { applyTransforms } from '../../lib/dataTransform';

interface Props {
  dataSource: DataSource;
  onClose: () => void;
}

type TransformKind = 'filter' | 'sort' | 'topN' | 'groupAggregate';

const FILTER_OPERATORS: { id: FilterOperator; label: string }[] = [
  { id: 'eq', label: '= equals' },
  { id: 'neq', label: '≠ not equals' },
  { id: 'gt', label: '> greater than' },
  { id: 'gte', label: '≥ greater or equal' },
  { id: 'lt', label: '< less than' },
  { id: 'lte', label: '≤ less or equal' },
  { id: 'contains', label: '⊃ contains' },
  { id: 'not_contains', label: '⊅ does not contain' },
];

const AGG_FUNCTIONS: { id: AggregateFunction; label: string; hint: string }[] = [
  { id: 'count', label: 'Count', hint: 'Number of rows in the group' },
  { id: 'sum', label: 'Sum', hint: 'Total of all values in the group' },
  { id: 'avg', label: 'Average', hint: 'Mean value across the group' },
  { id: 'min', label: 'Min', hint: 'Smallest value in the group' },
  { id: 'max', label: 'Max', hint: 'Largest value in the group' },
];

const TRANSFORM_INFO: Record<TransformKind, { label: string; description: string }> = {
  filter: {
    label: 'Filter Rows',
    description: 'Keep only rows that match a condition. Multiple filters are applied in order — each one further narrows the data.',
  },
  sort: {
    label: 'Sort',
    description: 'Order rows by a column value, ascending or descending.',
  },
  topN: {
    label: 'Top N Rows',
    description: 'Keep only the first N rows. Optionally sort by a column first to get the highest or lowest N values.',
  },
  groupAggregate: {
    label: 'Group & Aggregate',
    description: 'Group rows by a column and compute summary statistics (sum, average, count, etc.) for each group. This replaces the original rows with one row per group.',
  },
};

export default function TransformModal({ dataSource, onClose }: Props) {
  const { updateDataSource } = useDashboardStore(
    useShallow((s) => ({ updateDataSource: s.updateDataSource })),
  );

  const [transforms, setTransforms] = useState<DataTransform[]>(
    dataSource.transforms ?? [],
  );
  const [addingKind, setAddingKind] = useState<TransformKind | null>(null);

  // New-transform form state
  const [fCol, setFCol] = useState(dataSource.columns[0] ?? '');
  const [fOp, setFOp] = useState<FilterOperator>('eq');
  const [fVal, setFVal] = useState('');
  const [sCol, setSCol] = useState(dataSource.columns[0] ?? '');
  const [sDir, setSDir] = useState<SortDirection>('asc');
  const [tN, setTN] = useState(10);
  const [tCol, setTCol] = useState('');
  const [tDir, setTDir] = useState<SortDirection>('desc');
  const [gBy, setGBy] = useState(dataSource.columns[0] ?? '');
  const [gAggs, setGAggs] = useState<{ column: string; fn: AggregateFunction; alias: string }[]>(
    dataSource.columns.length > 1
      ? [{ column: dataSource.columns[1], fn: 'sum', alias: '' }]
      : [],
  );

  // Live preview using current transforms
  const preview = useMemo(() => {
    if (dataSource.rows.length === 0) return { rows: [], columns: [] };
    return applyTransforms(dataSource.rows, dataSource.columns, transforms);
  }, [dataSource.rows, dataSource.columns, transforms]);

  const previewRows = preview.rows.slice(0, 6);

  // ── Add transform ────────────────────────────────────────────────────────────

  const addTransform = () => {
    if (!addingKind) return;
    let t: DataTransform;
    if (addingKind === 'filter') {
      if (!fCol) return;
      t = { type: 'filter', column: fCol, operator: fOp, value: fVal } satisfies FilterTransform;
    } else if (addingKind === 'sort') {
      if (!sCol) return;
      t = { type: 'sort', column: sCol, direction: sDir } satisfies SortTransform;
    } else if (addingKind === 'topN') {
      const n = Math.max(1, Math.floor(tN));
      t = { type: 'topN', n, column: tCol || undefined, direction: tDir } satisfies TopNTransform;
    } else {
      if (!gBy || gAggs.length === 0) return;
      t = {
        type: 'groupAggregate',
        groupBy: gBy,
        aggregations: gAggs.map((a) => ({
          column: a.column,
          fn: a.fn,
          alias: a.alias.trim() || `${a.fn}(${a.column})`,
        })),
      } satisfies GroupAggregateTransform;
    }
    setTransforms((prev) => [...prev, t]);
    setAddingKind(null);
    // reset form
    setFVal(''); setTN(10); setTCol('');
  };

  const removeTransform = (i: number) =>
    setTransforms((prev) => prev.filter((_, j) => j !== i));

  const moveTransform = (i: number, dir: -1 | 1) => {
    setTransforms((prev) => {
      const a = [...prev];
      const j = i + dir;
      if (j < 0 || j >= a.length) return prev;
      [a[i], a[j]] = [a[j], a[i]];
      return a;
    });
  };

  const handleSave = () => {
    updateDataSource(dataSource.id, { transforms });
    onClose();
  };

  const numCols = dataSource.columns.filter((c) =>
    dataSource.rows.some((r) => typeof r[c] === 'number'),
  );

  return (
    <Modal title={`Transform: ${dataSource.name}`} onClose={onClose} width={720}>
      {/* ── Intro ── */}
      <p className="cp-helper-text" style={{ marginBottom: 14 }}>
        Transforms reshape your data before it's displayed in charts.
        They are applied <strong>in order</strong> — each step uses the result of the previous one.
        The original data is never modified.
      </p>

      {/* ── Existing transforms ── */}
      {transforms.length > 0 ? (
        <div className="cp-transform-list">
          {transforms.map((t, i) => (
            <div key={i} className="cp-transform-item">
              <div className="cp-transform-item-badge">{i + 1}</div>
              <div className="cp-transform-item-body">
                {describeTransform(t)}
              </div>
              <div className="cp-transform-item-actions">
                <button className="cp-icon-btn" title="Move up" onClick={() => moveTransform(i, -1)} disabled={i === 0}>
                  <ArrowUp size={13} />
                </button>
                <button className="cp-icon-btn" title="Move down" onClick={() => moveTransform(i, 1)} disabled={i === transforms.length - 1}>
                  <ArrowDown size={13} />
                </button>
                <button className="cp-icon-btn danger" title="Remove" onClick={() => removeTransform(i)}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="cp-transform-empty">
          No transforms yet. Add one below to filter, sort, or aggregate your data.
        </div>
      )}

      {/* ── Add transform ── */}
      {!addingKind ? (
        <div className="cp-add-transform-row">
          <span className="cp-form-label" style={{ marginBottom: 0 }}>Add step:</span>
          {(Object.keys(TRANSFORM_INFO) as TransformKind[]).map((k) => (
            <button key={k} className="cp-btn cp-btn-sm" onClick={() => setAddingKind(k)}>
              <Plus size={12} /> {TRANSFORM_INFO[k].label}
            </button>
          ))}
        </div>
      ) : (
        <div className="cp-add-transform-form">
          <div className="cp-add-transform-header">
            <strong>{TRANSFORM_INFO[addingKind].label}</strong>
            <button className="cp-icon-btn" onClick={() => setAddingKind(null)} title="Cancel">
              <Trash2 size={13} />
            </button>
          </div>
          <p className="cp-helper-text" style={{ marginBottom: 10 }}>
            <Info size={11} style={{ display: 'inline', marginRight: 4 }} />
            {TRANSFORM_INFO[addingKind].description}
          </p>

          {/* Filter form */}
          {addingKind === 'filter' && (
            <div className="cp-transform-form-row">
              <div>
                <label className="cp-form-label">Column</label>
                <select className="cp-select" value={fCol} onChange={(e) => setFCol(e.target.value)}>
                  {dataSource.columns.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="cp-form-label">Operator</label>
                <select className="cp-select" value={fOp} onChange={(e) => setFOp(e.target.value as FilterOperator)}>
                  {FILTER_OPERATORS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label className="cp-form-label">Value</label>
                <input className="cp-input" placeholder="e.g. Active" value={fVal} onChange={(e) => setFVal(e.target.value)} />
              </div>
            </div>
          )}

          {/* Sort form */}
          {addingKind === 'sort' && (
            <div className="cp-transform-form-row">
              <div style={{ flex: 1 }}>
                <label className="cp-form-label">Sort by Column</label>
                <select className="cp-select" value={sCol} onChange={(e) => setSCol(e.target.value)}>
                  {dataSource.columns.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="cp-form-label">Direction</label>
                <select className="cp-select" value={sDir} onChange={(e) => setSDir(e.target.value as SortDirection)}>
                  <option value="asc">Ascending (A → Z, 0 → 9)</option>
                  <option value="desc">Descending (Z → A, 9 → 0)</option>
                </select>
              </div>
            </div>
          )}

          {/* Top N form */}
          {addingKind === 'topN' && (
            <div className="cp-transform-form-row">
              <div>
                <label className="cp-form-label">Keep top N rows</label>
                <input className="cp-input" type="number" min={1} value={tN}
                  onChange={(e) => setTN(Number(e.target.value))} style={{ width: 80 }} />
              </div>
              <div style={{ flex: 1 }}>
                <label className="cp-form-label">
                  Sort by column first <span className="cp-muted">(optional)</span>
                </label>
                <select className="cp-select" value={tCol} onChange={(e) => setTCol(e.target.value)}>
                  <option value="">— keep current order —</option>
                  {dataSource.columns.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              {tCol && (
                <div>
                  <label className="cp-form-label">Direction</label>
                  <select className="cp-select" value={tDir} onChange={(e) => setTDir(e.target.value as SortDirection)}>
                    <option value="desc">Highest first</option>
                    <option value="asc">Lowest first</option>
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Group + Aggregate form */}
          {addingKind === 'groupAggregate' && (
            <>
              <div className="cp-transform-form-row">
                <div style={{ flex: 1 }}>
                  <label className="cp-form-label">Group by</label>
                  <select className="cp-select" value={gBy} onChange={(e) => setGBy(e.target.value)}>
                    {dataSource.columns.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginTop: 8 }}>
                <div className="cp-form-label-row">
                  <label className="cp-form-label" style={{ marginBottom: 0 }}>Aggregations</label>
                  <button className="cp-btn cp-btn-sm"
                    onClick={() => setGAggs((a) => [...a, { column: numCols[0] ?? dataSource.columns[0], fn: 'sum', alias: '' }])}>
                    <Plus size={12} /> Add
                  </button>
                </div>
                {gAggs.map((a, i) => (
                  <div key={i} className="cp-transform-form-row" style={{ marginTop: 6 }}>
                    <div style={{ flex: 1 }}>
                      <select className="cp-select" value={a.fn}
                        onChange={(e) => setGAggs((prev) => prev.map((x, j) => j === i ? { ...x, fn: e.target.value as AggregateFunction } : x))}>
                        {AGG_FUNCTIONS.map((f) => <option key={f.id} value={f.id} title={f.hint}>{f.label}</option>)}
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <select className="cp-select" value={a.column}
                        onChange={(e) => setGAggs((prev) => prev.map((x, j) => j === i ? { ...x, column: e.target.value } : x))}>
                        {dataSource.columns.filter((c) => c !== gBy).map((c) => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <input className="cp-input" placeholder="Alias (optional)" value={a.alias}
                        onChange={(e) => setGAggs((prev) => prev.map((x, j) => j === i ? { ...x, alias: e.target.value } : x))} />
                    </div>
                    <button className="cp-icon-btn danger" onClick={() => setGAggs((prev) => prev.filter((_, j) => j !== i))}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
                {gAggs.length === 0 && (
                  <p className="cp-helper-text">Add at least one aggregation to compute per group.</p>
                )}
              </div>
            </>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="cp-btn primary cp-btn-sm" style={{ marginTop: 0 }} onClick={addTransform}>
              <Plus size={12} /> Apply Step
            </button>
            <button className="cp-btn cp-btn-sm" onClick={() => setAddingKind(null)}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── Live preview ── */}
      <div className="cp-transform-preview">
        <div className="cp-form-label" style={{ marginBottom: 6 }}>
          Live Preview
          <span className="cp-muted" style={{ marginLeft: 8, textTransform: 'none', fontWeight: 400 }}>
            ({preview.rows.length} rows after transforms, showing first {previewRows.length})
          </span>
        </div>

        {preview.columns.length === 0 ? (
          <p className="cp-helper-text">No data to preview.</p>
        ) : (
          <div className="cp-preview-table-wrap">
            <table className="cp-preview-table">
              <thead>
                <tr>
                  {preview.columns.map((c) => <th key={c}>{c}</th>)}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, i) => (
                  <tr key={i}>
                    {preview.columns.map((c) => (
                      <td key={c}>{String(row[c] ?? '')}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="cp-modal-footer">
        <button className="cp-btn" onClick={onClose}>Cancel</button>
        <button className="cp-btn primary" onClick={handleSave}>Save Transforms</button>
      </div>
    </Modal>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function describeTransform(t: DataTransform): string {
  switch (t.type) {
    case 'filter': {
      const opMap: Record<string, string> = {
        eq: '=', neq: '≠', gt: '>', gte: '≥', lt: '<', lte: '≤',
        contains: 'contains', not_contains: 'does not contain',
      };
      return `Filter: ${t.column} ${opMap[t.operator] ?? t.operator} "${t.value}"`;
    }
    case 'sort':
      return `Sort by ${t.column} (${t.direction === 'asc' ? 'ascending' : 'descending'})`;
    case 'topN': {
      const sortPart = t.column
        ? ` sorted by ${t.column} ${t.direction === 'asc' ? '(lowest first)' : '(highest first)'}`
        : '';
      return `Top ${t.n} rows${sortPart}`;
    }
    case 'groupAggregate': {
      const aggs = t.aggregations.map((a) => `${a.fn}(${a.column})`).join(', ');
      return `Group by ${t.groupBy} → ${aggs}`;
    }
    default:
      return JSON.stringify(t);
  }
}
