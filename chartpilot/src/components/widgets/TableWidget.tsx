import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import type { WidgetConfig, DataSource, DataRow } from '../../types';
import { applyTransforms } from '../../lib/dataTransform';

const MAX_FILTER_OPTIONS = 100;

interface Props {
  widget: WidgetConfig;
  dataSources: DataSource[];
  onCellClick?: (column: string, value: string | number) => void;
}

export default function TableWidget({ widget, dataSources, onCellClick }: Props) {
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);
  const [colFilters, setColFilters] = useState<Record<string, string>>({});

  const { rows, columns } = useMemo(() => {
    const source = dataSources.find((ds) => ds.id === widget.dataSourceId);
    if (!source || source.rows.length === 0) return { rows: [] as DataRow[], columns: [] as string[] };

    let result =
      source.transforms && source.transforms.length > 0
        ? applyTransforms(source.rows, source.columns, source.transforms)
        : { rows: source.rows, columns: source.columns };

    if (widget.widgetTransforms && widget.widgetTransforms.length > 0) {
      result = applyTransforms(result.rows, result.columns, widget.widgetTransforms);
    }

    return result;
  }, [widget, dataSources]);

  const visibleCols = useMemo(() => {
    if (widget.tableVisibleColumns && widget.tableVisibleColumns.length > 0) {
      return widget.tableVisibleColumns.filter((c) => columns.includes(c));
    }
    return columns;
  }, [widget.tableVisibleColumns, columns]);

  // Unique values per column for dropdown filters
  const uniqueValues = useMemo(() => {
    const uv: Record<string, (string | number)[]> = {};
    for (const col of visibleCols) {
      const seen = new Set<string | number>();
      for (const row of rows) {
        if (row[col] !== undefined && row[col] !== '') seen.add(row[col]);
      }
      uv[col] = Array.from(seen).sort();
    }
    return uv;
  }, [rows, visibleCols]);

  // Apply column filters
  const filtered = useMemo(() => {
    let result = rows;
    for (const [col, val] of Object.entries(colFilters)) {
      if (val) {
        result = result.filter((r) => String(r[col]) === val);
      }
    }
    return result;
  }, [rows, colFilters]);

  // Apply sort
  const sorted = useMemo(() => {
    if (!sortCol) return filtered;
    return [...filtered].sort((a, b) => {
      const va = a[sortCol] ?? '';
      const vb = b[sortCol] ?? '';
      const na = Number(va);
      const nb = Number(vb);
      if (!isNaN(na) && !isNaN(nb)) {
        return sortDir === 'asc' ? na - nb : nb - na;
      }
      const cmp = String(va).localeCompare(String(vb));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortCol, sortDir]);

  const pageSize = widget.tablePageSize ?? 10;
  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = sorted.slice(safePage * pageSize, (safePage + 1) * pageSize);

  const handleSort = (col: string) => {
    if (widget.tableSortable === false) return;
    if (sortCol === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  const handleFilterChange = (col: string, val: string) => {
    setColFilters((f) => ({ ...f, [col]: val }));
    setPage(0);
  };

  if (columns.length === 0) {
    return (
      <div className="cp-table-widget cp-table-empty">
        <p className="cp-muted">No data — connect a data source.</p>
      </div>
    );
  }

  const accentColor = widget.colors?.[0] ?? '#4e81b7';

  return (
    <div className="cp-table-widget">
      <div className="cp-table-scroll">
        <table className="cp-table">
          <thead>
            {widget.tableFilterable !== false && (
              <tr className="cp-table-filter-row">
                {visibleCols.map((col) => (
                  <th key={col + '-filter'}>
                    <select
                      className="cp-table-filter-select"
                      value={colFilters[col] ?? ''}
                      onChange={(e) => handleFilterChange(col, e.target.value)}
                    >
                      <option value="">All</option>
                      {(uniqueValues[col] ?? []).slice(0, MAX_FILTER_OPTIONS).map((v) => (
                        <option key={String(v)} value={String(v)}>
                          {String(v)}
                        </option>
                      ))}
                    </select>
                  </th>
                ))}
              </tr>
            )}
            <tr>
              {visibleCols.map((col) => (
                <th
                  key={col}
                  className={widget.tableSortable !== false ? 'cp-table-sortable' : ''}
                  onClick={() => handleSort(col)}
                >
                  <span>{col}</span>
                  {sortCol === col && (
                    <span className="cp-table-sort-icon">
                      {sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, ri) => (
              <tr key={ri}>
                {visibleCols.map((col) => (
                  <td
                    key={col}
                    onClick={() => onCellClick?.(col, row[col])}
                    className={onCellClick ? 'cp-table-clickable' : ''}
                  >
                    {String(row[col] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pageCount > 1 && (
        <div className="cp-table-pagination">
          <button
            className="cp-btn cp-btn-sm"
            disabled={safePage === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            ‹ Prev
          </button>
          <span className="cp-table-page-info" style={{ color: accentColor }}>
            {safePage + 1} / {pageCount}
          </span>
          <button
            className="cp-btn cp-btn-sm"
            disabled={safePage >= pageCount - 1}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
          >
            Next ›
          </button>
        </div>
      )}
    </div>
  );
}
