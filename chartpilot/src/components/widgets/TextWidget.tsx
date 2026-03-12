import { useMemo } from 'react';
import type { WidgetConfig, DataSource } from '../../types';
import { applyTransforms } from '../../lib/dataTransform';

interface Props {
  widget: WidgetConfig;
  dataSources: DataSource[];
}

export default function TextWidget({ widget, dataSources }: Props) {
  const displayValue = useMemo(() => {
    if (widget.textContent) return widget.textContent;

    const source = dataSources.find((ds) => ds.id === widget.dataSourceId);
    if (!source || source.rows.length === 0) return '—';

    // Apply data source transforms first
    let { rows, columns } =
      source.transforms && source.transforms.length > 0
        ? applyTransforms(source.rows, source.columns, source.transforms)
        : { rows: source.rows, columns: source.columns };

    // Apply widget-level transforms
    if (widget.widgetTransforms && widget.widgetTransforms.length > 0) {
      const result = applyTransforms(rows, columns, widget.widgetTransforms);
      rows = result.rows;
      columns = result.columns;
    }

    if (rows.length === 0) return '—';

    const col = widget.textValueColumn ?? widget.valueColumns[0] ?? columns[0];
    if (!col) return '—';

    const values = rows.map((r) => Number(r[col]) || 0);
    const fn = widget.textAggregation ?? 'sum';

    let result: number;
    switch (fn) {
      case 'count':
        result = values.length;
        break;
      case 'sum':
        result = values.reduce((a, b) => a + b, 0);
        break;
      case 'avg':
        result = values.reduce((a, b) => a + b, 0) / (values.length || 1);
        break;
      case 'min':
        result = Math.min(...values);
        break;
      case 'max':
        result = Math.max(...values);
        break;
      default:
        result = values.reduce((a, b) => a + b, 0);
    }

    // Format with locale
    const formatted = Number.isInteger(result)
      ? result.toLocaleString()
      : result.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });

    return `${widget.textPrefix ?? ''}${formatted}${widget.textSuffix ?? ''}`;
  }, [widget, dataSources]);

  const fontSize = widget.textFontSize ?? 36;
  const color = widget.colors?.[0] ?? '#4e81b7';

  return (
    <div className="cp-text-widget">
      <div
        className="cp-text-widget-value"
        style={{ fontSize, color }}
      >
        {displayValue}
      </div>
    </div>
  );
}
