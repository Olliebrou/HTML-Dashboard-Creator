import { useState } from 'react';
import { BarChart2, TrendingUp, PieChart, Donut, Radar, ScatterChart, Type, Table2 } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import Modal from '../common/Modal';
import type { ChartType, WidgetConfig } from '../../types';
import { useDashboardStore } from '../../stores/dashboardStore';
import { COLOR_PALETTES } from '../../lib/colors';

const CHART_TYPES: { type: ChartType; label: string; Icon: React.ComponentType<{ size?: number }> }[] = [
  { type: 'bar', label: 'Bar', Icon: BarChart2 },
  { type: 'line', label: 'Line', Icon: TrendingUp },
  { type: 'pie', label: 'Pie', Icon: PieChart },
  { type: 'doughnut', label: 'Doughnut', Icon: Donut },
  { type: 'radar', label: 'Radar', Icon: Radar },
  { type: 'scatter', label: 'Scatter', Icon: ScatterChart },
  { type: 'text' as ChartType, label: 'Text / KPI', Icon: Type },
  { type: 'table' as ChartType, label: 'Table', Icon: Table2 },
];

interface Props {
  onClose: () => void;
}

export default function AddWidgetModal({ onClose }: Props) {
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [title, setTitle] = useState('');
  const [dataSourceId, setDataSourceId] = useState<string>('');

  const { addWidget, dataSources, widgets } = useDashboardStore(
    useShallow((s) => ({
      addWidget: s.addWidget,
      dataSources: s.dataSources,
      widgets: s.widgets,
    })),
  );

  const handleAdd = () => {
    const finalTitle =
      title.trim() ||
      `${CHART_TYPES.find((c) => c.type === chartType)?.label ?? 'Chart'} ${widgets.length + 1}`;

    // Find a free spot on the grid (simple row stacking)
    const usedRows = widgets.map((w) => w.layout.y + w.layout.h);
    const nextY = usedRows.length > 0 ? Math.max(...usedRows) : 0;

    const widget: Omit<WidgetConfig, 'id'> = {
      type: chartType,
      title: finalTitle,
      dataSourceId: dataSourceId || null,
      labelColumn: null,
      valueColumns: [],
      colors: COLOR_PALETTES.default,
      layout: { x: 0, y: nextY, w: 6, h: 3 },
    };

    addWidget(widget);
    onClose();
  };

  return (
    <Modal title="Add Widget" onClose={onClose}>
      <div className="cp-form-section">
        <label className="cp-form-label">Chart Type</label>
        <div className="cp-chart-type-grid">
          {CHART_TYPES.map(({ type, label, Icon }) => (
            <button
              key={type}
              className={`cp-chart-type-btn${chartType === type ? ' active' : ''}`}
              onClick={() => setChartType(type)}
            >
              <Icon size={24} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="cp-form-section">
        <label className="cp-form-label" htmlFor="widget-title">
          Title <span className="cp-muted">(optional)</span>
        </label>
        <input
          id="widget-title"
          className="cp-input"
          placeholder={`${CHART_TYPES.find((c) => c.type === chartType)?.label ?? 'Chart'} ${widgets.length + 1}`}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          autoFocus
        />
      </div>

      {dataSources.length > 0 && (
        <div className="cp-form-section">
          <label className="cp-form-label" htmlFor="widget-ds">
            Data Source <span className="cp-muted">(optional)</span>
          </label>
          <select
            id="widget-ds"
            className="cp-select"
            value={dataSourceId}
            onChange={(e) => setDataSourceId(e.target.value)}
          >
            <option value="">— sample data —</option>
            {dataSources.map((ds) => (
              <option key={ds.id} value={ds.id}>
                {ds.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="cp-modal-footer">
        <button className="cp-btn" onClick={onClose}>
          Cancel
        </button>
        <button className="cp-btn primary" onClick={handleAdd}>
          Add Widget
        </button>
      </div>
    </Modal>
  );
}
