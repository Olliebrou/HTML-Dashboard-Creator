import { GripHorizontal, X } from 'lucide-react';
import type { WidgetConfig, DataSource } from '../../types';
import { useUiStore } from '../../stores/uiStore';
import { useDashboardStore } from '../../stores/dashboardStore';
import ChartWidget from './ChartWidget';
import TextWidget from './TextWidget';
import TableWidget from './TableWidget';

interface Props {
  widget: WidgetConfig;
  dataSources: DataSource[];
}

export default function WidgetCard({ widget, dataSources }: Props) {
  const { selectedWidgetId, selectWidget } = useUiStore();
  const removeWidget = useDashboardStore((s) => s.removeWidget);
  const setCrossFilter = useDashboardStore((s) => s.setCrossFilter);

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

  const handleCellClick = (column: string, value: string | number) => {
    setCrossFilter({ sourceWidgetId: widget.id, column, value });
  };

  const cardStyle: React.CSSProperties = {};
  if (widget.backgroundColor) cardStyle.background = widget.backgroundColor;
  if (widget.borderColor) cardStyle.borderColor = widget.borderColor;

  const titleStyle: React.CSSProperties = {};
  if (widget.titleColor) titleStyle.color = widget.titleColor;

  const renderContent = () => {
    switch (widget.type) {
      case 'text':
        return <TextWidget widget={widget} dataSources={dataSources} />;
      case 'table':
        return <TableWidget widget={widget} dataSources={dataSources} onCellClick={handleCellClick} />;
      default:
        return <ChartWidget widget={widget} dataSources={dataSources} />;
    }
  };

  return (
    <div
      className={`cp-widget-card${isSelected ? ' selected' : ''}`}
      onClick={handleSelect}
      style={cardStyle}
    >
      <div className="cp-widget-titlebar">
        <span className="cp-widget-handle" title="Drag to move">
          <GripHorizontal size={14} />
        </span>
        <span className="cp-widget-title" style={titleStyle}>{widget.title}</span>
        <button
          className="cp-widget-delete"
          title="Remove widget"
          onClick={handleDelete}
        >
          <X size={12} />
        </button>
      </div>
      <div className="cp-widget-chart">
        {renderContent()}
      </div>
    </div>
  );
}
