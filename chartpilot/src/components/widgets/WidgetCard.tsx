import { GripHorizontal, X } from 'lucide-react';
import type { WidgetConfig, DataSource } from '../../types';
import { useUiStore } from '../../stores/uiStore';
import { useDashboardStore } from '../../stores/dashboardStore';
import ChartWidget from './ChartWidget';

interface Props {
  widget: WidgetConfig;
  dataSources: DataSource[];
}

export default function WidgetCard({ widget, dataSources }: Props) {
  const { selectedWidgetId, selectWidget } = useUiStore();
  const removeWidget = useDashboardStore((s) => s.removeWidget);

  const isSelected = selectedWidgetId === widget.id;

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectWidget(isSelected ? null : widget.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeWidget(widget.id);
    if (isSelected) selectWidget(null);
  };

  return (
    <div
      className={`cp-widget-card${isSelected ? ' selected' : ''}`}
      onClick={handleSelect}
    >
      <div className="cp-widget-titlebar">
        <span className="cp-widget-handle" title="Drag to move">
          <GripHorizontal size={14} />
        </span>
        <span className="cp-widget-title">{widget.title}</span>
        <button
          className="cp-widget-delete"
          title="Remove widget"
          onClick={handleDelete}
        >
          <X size={12} />
        </button>
      </div>
      <div className="cp-widget-chart">
        <ChartWidget widget={widget} dataSources={dataSources} />
      </div>
    </div>
  );
}
