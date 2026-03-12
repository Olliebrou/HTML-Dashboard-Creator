import { useState } from 'react';
import { useDashboardStore } from '../../stores/dashboardStore';
import { useUiStore } from '../../stores/uiStore';
import Panel from '../common/Panel';
import type { ChartType, AggregateFunction, DataTransform, FilterOperator } from '../../types';
import { COLOR_PALETTES, PALETTE_NAMES } from '../../lib/colors';
import { useShallow } from 'zustand/react/shallow';

const CHART_LABELS: Record<ChartType, string> = {
  bar: 'Bar',
  line: 'Line',
  pie: 'Pie',
  doughnut: 'Doughnut',
  radar: 'Radar',
  scatter: 'Scatter',
  text: 'Text / KPI',
  table: 'Table',
};

const AGG_FUNCTIONS: { id: AggregateFunction; label: string }[] = [
  { id: 'sum', label: 'Sum' },
  { id: 'count', label: 'Count' },
  { id: 'avg', label: 'Average' },
  { id: 'min', label: 'Min' },
  { id: 'max', label: 'Max' },
];

const FILTER_OPERATORS: { id: FilterOperator; label: string }[] = [
  { id: 'eq', label: '=' },
  { id: 'neq', label: '≠' },
  { id: 'gt', label: '>' },
  { id: 'gte', label: '≥' },
  { id: 'lt', label: '<' },
  { id: 'lte', label: '≤' },
  { id: 'contains', label: 'Contains' },
  { id: 'not_contains', label: 'Not contains' },
];

export default function PropertiesPanel() {
  const { selectedWidgetId } = useUiStore();
  const { widgets, dataSources, updateWidget, removeWidget } = useDashboardStore(
    useShallow((s) => ({
      widgets: s.widgets,
      dataSources: s.dataSources,
      updateWidget: s.updateWidget,
      removeWidget: s.removeWidget,
    })),
  );
  const selectWidget = useUiStore((s) => s.selectWidget);

  // Local state for adding a widget-level filter
  const [newFilterCol, setNewFilterCol] = useState('');
  const [newFilterOp, setNewFilterOp] = useState<FilterOperator>('eq');
  const [newFilterVal, setNewFilterVal] = useState('');

  const widget = widgets.find((w) => w.id === selectedWidgetId);

  if (!widget) {
    return (
      <div className="cp-properties">
        <Panel title="Properties">
          <p className="cp-muted" style={{ lineHeight: 1.6 }}>
            Click a widget on the canvas to edit its settings.
          </p>
        </Panel>
      </div>
    );
  }

  const source = dataSources.find((ds) => ds.id === widget.dataSourceId);
  const sourceColumns = source?.columns ?? [];

  const update = (patch: Parameters<typeof updateWidget>[1]) =>
    updateWidget(widget.id, patch);

  const handleDelete = () => {
    removeWidget(widget.id);
    selectWidget(null);
  };

  const addWidgetFilter = () => {
    if (!newFilterCol) return;
    const transforms: DataTransform[] = [
      ...(widget.widgetTransforms ?? []),
      { type: 'filter', column: newFilterCol, operator: newFilterOp, value: newFilterVal },
    ];
    update({ widgetTransforms: transforms });
    setNewFilterCol('');
    setNewFilterVal('');
  };

  const removeWidgetTransform = (index: number) => {
    const transforms = (widget.widgetTransforms ?? []).filter((_, i) => i !== index);
    update({ widgetTransforms: transforms });
  };

  return (
    <div className="cp-properties">
      <Panel title="Widget Properties">
        {/* Title */}
        <div className="cp-prop-group">
          <label className="cp-form-label">Title</label>
          <input
            className="cp-input"
            value={widget.title}
            onChange={(e) => update({ title: e.target.value })}
          />
        </div>

        {/* Chart Type */}
        <div className="cp-prop-group">
          <label className="cp-form-label">Widget Type</label>
          <select
            className="cp-select"
            value={widget.type}
            onChange={(e) => update({ type: e.target.value as ChartType })}
          >
            {(Object.keys(CHART_LABELS) as ChartType[]).map((t) => (
              <option key={t} value={t}>{CHART_LABELS[t]}</option>
            ))}
          </select>
        </div>

        {/* Data Source */}
        <div className="cp-prop-group">
          <label className="cp-form-label">Data Source</label>
          <select
            className="cp-select"
            value={widget.dataSourceId ?? ''}
            onChange={(e) =>
              update({
                dataSourceId: e.target.value || null,
                labelColumn: null,
                valueColumns: [],
              })
            }
          >
            <option value="">— sample data —</option>
            {dataSources.map((ds) => (
              <option key={ds.id} value={ds.id}>{ds.name}</option>
            ))}
          </select>
        </div>

        {/* ── Chart-specific fields ── */}
        {widget.type !== 'text' && widget.type !== 'table' && sourceColumns.length > 0 && (
          <>
            <div className="cp-prop-group">
              <label className="cp-form-label">Label Column</label>
              <select
                className="cp-select"
                value={widget.labelColumn ?? ''}
                onChange={(e) => update({ labelColumn: e.target.value || null })}
              >
                <option value="">— auto —</option>
                {sourceColumns.map((col) => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>

            <div className="cp-prop-group">
              <label className="cp-form-label">Value Columns</label>
              <div className="cp-checkbox-list">
                {sourceColumns
                  .filter((c) => c !== (widget.labelColumn ?? sourceColumns[0]))
                  .map((col) => (
                    <label key={col} className="cp-checkbox-item">
                      <input
                        type="checkbox"
                        checked={widget.valueColumns.includes(col)}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...widget.valueColumns, col]
                            : widget.valueColumns.filter((c) => c !== col);
                          update({ valueColumns: next });
                        }}
                      />
                      <span>{col}</span>
                    </label>
                  ))}
              </div>
            </div>
          </>
        )}

        {/* ── Text/KPI specific ── */}
        {widget.type === 'text' && (
          <>
            <div className="cp-prop-group">
              <label className="cp-form-label">Static Text <span className="cp-muted">(or leave empty to use data)</span></label>
              <input
                className="cp-input"
                value={widget.textContent ?? ''}
                onChange={(e) => update({ textContent: e.target.value || undefined })}
                placeholder="e.g. Total Revenue"
              />
            </div>
            {sourceColumns.length > 0 && !widget.textContent && (
              <>
                <div className="cp-prop-group">
                  <label className="cp-form-label">Value Column</label>
                  <select
                    className="cp-select"
                    value={widget.textValueColumn ?? ''}
                    onChange={(e) => update({ textValueColumn: e.target.value || undefined })}
                  >
                    <option value="">— auto —</option>
                    {sourceColumns.map((col) => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>
                <div className="cp-prop-group">
                  <label className="cp-form-label">Aggregation</label>
                  <select
                    className="cp-select"
                    value={widget.textAggregation ?? 'sum'}
                    onChange={(e) => update({ textAggregation: e.target.value as AggregateFunction })}
                  >
                    {AGG_FUNCTIONS.map((a) => (
                      <option key={a.id} value={a.id}>{a.label}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
            <div className="cp-prop-group" style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label className="cp-form-label">Prefix</label>
                <input
                  className="cp-input"
                  value={widget.textPrefix ?? ''}
                  onChange={(e) => update({ textPrefix: e.target.value || undefined })}
                  placeholder="$"
                />
              </div>
              <div style={{ flex: 1 }}>
                <label className="cp-form-label">Suffix</label>
                <input
                  className="cp-input"
                  value={widget.textSuffix ?? ''}
                  onChange={(e) => update({ textSuffix: e.target.value || undefined })}
                  placeholder="%"
                />
              </div>
            </div>
            <div className="cp-prop-group">
              <label className="cp-form-label">Font Size (px)</label>
              <input
                className="cp-input"
                type="number"
                min={12}
                max={120}
                value={widget.textFontSize ?? 36}
                onChange={(e) => update({ textFontSize: Number(e.target.value) || 36 })}
              />
            </div>
          </>
        )}

        {/* ── Table specific ── */}
        {widget.type === 'table' && (
          <>
            <div className="cp-prop-group">
              <label className="cp-form-label">Page Size</label>
              <input
                className="cp-input"
                type="number"
                min={5}
                max={100}
                value={widget.tablePageSize ?? 10}
                onChange={(e) => update({ tablePageSize: Number(e.target.value) || 10 })}
              />
            </div>
            <div className="cp-prop-group">
              <label className="cp-checkbox-item">
                <input
                  type="checkbox"
                  checked={widget.tableSortable !== false}
                  onChange={(e) => update({ tableSortable: e.target.checked })}
                />
                <span>Sortable Columns</span>
              </label>
            </div>
            <div className="cp-prop-group">
              <label className="cp-checkbox-item">
                <input
                  type="checkbox"
                  checked={widget.tableFilterable !== false}
                  onChange={(e) => update({ tableFilterable: e.target.checked })}
                />
                <span>Column Filters</span>
              </label>
            </div>
            {sourceColumns.length > 0 && (
              <div className="cp-prop-group">
                <label className="cp-form-label">Visible Columns</label>
                <div className="cp-checkbox-list">
                  {sourceColumns.map((col) => (
                    <label key={col} className="cp-checkbox-item">
                      <input
                        type="checkbox"
                        checked={
                          !widget.tableVisibleColumns ||
                          widget.tableVisibleColumns.length === 0 ||
                          widget.tableVisibleColumns.includes(col)
                        }
                        onChange={(e) => {
                          const current = widget.tableVisibleColumns?.length
                            ? widget.tableVisibleColumns
                            : sourceColumns;
                          const next = e.target.checked
                            ? current.includes(col) ? current : [...current, col]
                            : current.filter((c) => c !== col);
                          update({ tableVisibleColumns: next.length > 0 ? next : undefined });
                        }}
                      />
                      <span>{col}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Styling ── */}
        <div className="cp-prop-group">
          <label className="cp-form-label">Color Palette</label>
          <div className="cp-palette-grid">
            {PALETTE_NAMES.map((paletteName) => (
              <button
                key={paletteName}
                className={`cp-palette-btn${
                  widget.colors[0] === COLOR_PALETTES[paletteName][0] ? ' active' : ''
                }`}
                title={paletteName}
                onClick={() => update({ colors: COLOR_PALETTES[paletteName] })}
              >
                {COLOR_PALETTES[paletteName].slice(0, 5).map((c, i) => (
                  <span key={i} style={{ background: c }} />
                ))}
              </button>
            ))}
          </div>
        </div>

        <div className="cp-prop-group">
          <label className="cp-form-label">Title Color</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="color"
              value={widget.titleColor ?? '#7a8da1'}
              onChange={(e) => update({ titleColor: e.target.value })}
              style={{ width: 36, height: 28, border: 'none', background: 'none', cursor: 'pointer' }}
            />
            <input
              className="cp-input"
              value={widget.titleColor ?? ''}
              onChange={(e) => update({ titleColor: e.target.value || undefined })}
              placeholder="Default"
              style={{ flex: 1 }}
            />
          </div>
        </div>

        <div className="cp-prop-group">
          <label className="cp-form-label">Background Color</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="color"
              value={widget.backgroundColor ?? '#111c28'}
              onChange={(e) => update({ backgroundColor: e.target.value })}
              style={{ width: 36, height: 28, border: 'none', background: 'none', cursor: 'pointer' }}
            />
            <input
              className="cp-input"
              value={widget.backgroundColor ?? ''}
              onChange={(e) => update({ backgroundColor: e.target.value || undefined })}
              placeholder="Default"
              style={{ flex: 1 }}
            />
          </div>
        </div>

        <div className="cp-prop-group">
          <label className="cp-form-label">Border Color</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="color"
              value={widget.borderColor ?? '#243345'}
              onChange={(e) => update({ borderColor: e.target.value })}
              style={{ width: 36, height: 28, border: 'none', background: 'none', cursor: 'pointer' }}
            />
            <input
              className="cp-input"
              value={widget.borderColor ?? ''}
              onChange={(e) => update({ borderColor: e.target.value || undefined })}
              placeholder="Default"
              style={{ flex: 1 }}
            />
          </div>
        </div>

        {/* ── Widget-level Filters ── */}
        {sourceColumns.length > 0 && (
          <div className="cp-prop-group">
            <label className="cp-form-label">Widget Filters</label>
            {(widget.widgetTransforms ?? []).map((t, i) => (
              <div key={i} className="cp-widget-filter-row">
                <span className="cp-widget-filter-desc">
                  {t.type === 'filter' ? `${t.column} ${t.operator} ${t.value}` : t.type}
                </span>
                <button className="cp-icon-btn danger" onClick={() => removeWidgetTransform(i)}>
                  ✕
                </button>
              </div>
            ))}
            <div className="cp-widget-filter-add">
              <select
                className="cp-select"
                value={newFilterCol}
                onChange={(e) => setNewFilterCol(e.target.value)}
                style={{ flex: 1 }}
              >
                <option value="">Column…</option>
                {sourceColumns.map((col) => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
              <select
                className="cp-select"
                value={newFilterOp}
                onChange={(e) => setNewFilterOp(e.target.value as FilterOperator)}
                style={{ width: 70 }}
              >
                {FILTER_OPERATORS.map((op) => (
                  <option key={op.id} value={op.id}>{op.label}</option>
                ))}
              </select>
              <input
                className="cp-input"
                value={newFilterVal}
                onChange={(e) => setNewFilterVal(e.target.value)}
                placeholder="Value"
                style={{ flex: 1 }}
              />
              <button className="cp-btn cp-btn-sm primary" onClick={addWidgetFilter} disabled={!newFilterCol}>
                +
              </button>
            </div>
          </div>
        )}

        {/* Delete */}
        <div className="cp-prop-group" style={{ marginTop: 16 }}>
          <button
            className="cp-btn danger"
            style={{ width: '100%' }}
            onClick={handleDelete}
          >
            Delete Widget
          </button>
        </div>
      </Panel>
    </div>
  );
}

