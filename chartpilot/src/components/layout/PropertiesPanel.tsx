import { useDashboardStore } from '../../stores/dashboardStore';
import { useUiStore } from '../../stores/uiStore';
import Panel from '../common/Panel';
import type { ChartType } from '../../types';
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

  const sourceColumns =
    dataSources.find((ds) => ds.id === widget.dataSourceId)?.columns ?? [];

  const update = (patch: Parameters<typeof updateWidget>[1]) =>
    updateWidget(widget.id, patch);

  const handleDelete = () => {
    removeWidget(widget.id);
    selectWidget(null);
  };

  return (
    <div className="cp-properties">
      <Panel title="Widget Properties">
        <div className="cp-prop-group">
          <label className="cp-form-label">Title</label>
          <input
            className="cp-input"
            value={widget.title}
            onChange={(e) => update({ title: e.target.value })}
          />
        </div>

        <div className="cp-prop-group">
          <label className="cp-form-label">Chart Type</label>
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

        {sourceColumns.length > 0 && (
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

