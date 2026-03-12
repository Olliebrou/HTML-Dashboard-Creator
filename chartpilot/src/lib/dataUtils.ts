import type { ChartData } from 'chart.js';
import type { WidgetConfig, DataSource, ChartType } from '../types';
import { applyTransforms } from './dataTransform';

const SAMPLE_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
const SAMPLE_DATA = [65, 59, 80, 81, 56, 72];

function transparentize(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function isHex(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}

export function buildChartData(
  widget: WidgetConfig,
  dataSources: DataSource[],
): ChartData {
  const source = dataSources.find((ds) => ds.id === widget.dataSourceId);
  const colors = widget.colors.length > 0 ? widget.colors : ['#4e81b7'];

  if (!source || source.rows.length === 0) {
    return buildSampleData(widget.type, widget.title, colors);
  }

  // Apply any transforms stored on the data source
  const { rows, columns } =
    source.transforms && source.transforms.length > 0
      ? applyTransforms(source.rows, source.columns, source.transforms)
      : { rows: source.rows, columns: source.columns };

  if (rows.length === 0) {
    return buildSampleData(widget.type, widget.title, colors);
  }

  const labelCol = widget.labelColumn ?? columns[0];
  const valueCols =
    widget.valueColumns.length > 0
      ? widget.valueColumns.filter((c) => columns.includes(c))
      : columns.filter((c) => c !== labelCol).slice(0, 3);

  const labels = rows.map((row) => String(row[labelCol] ?? ''));

  if (widget.type === 'scatter') {
    const xCol = labelCol;
    const yCol = valueCols[0] ?? columns[1] ?? columns[0];
    return {
      datasets: [
        {
          label: widget.title,
          data: rows.map((row) => ({
            x: Number(row[xCol]) || 0,
            y: Number(row[yCol]) || 0,
          })),
          backgroundColor: colors[0],
          borderColor: colors[0],
          pointRadius: 5,
        },
      ],
    };
  }

  const datasets = valueCols.map((col, i) => {
    const color = colors[i % colors.length];
    const bg =
      widget.type === 'line'
        ? isHex(color)
          ? transparentize(color, 0.15)
          : color
        : widget.type === 'bar'
        ? isHex(color)
          ? transparentize(color, 0.75)
          : color
        : colors;

    return {
      label: col,
      data: rows.map((row) => Number(row[col]) || 0),
      backgroundColor: bg,
      borderColor: widget.type === 'pie' || widget.type === 'doughnut' ? '#1a2332' : color,
      borderWidth: widget.type === 'pie' || widget.type === 'doughnut' ? 2 : 2,
      fill: widget.type === 'line' ? true : undefined,
      tension: widget.type === 'line' ? 0.4 : undefined,
      pointRadius: widget.type === 'line' ? 3 : undefined,
    };
  });

  return { labels, datasets };
}

function buildSampleData(
  type: ChartType,
  title: string,
  colors: string[],
): ChartData {
  if (type === 'scatter') {
    return {
      datasets: [
        {
          label: title,
          data: SAMPLE_DATA.map((y, i) => ({ x: i * 10, y })),
          backgroundColor: colors[0],
          borderColor: colors[0],
          pointRadius: 5,
        },
      ],
    };
  }

  const isPie = type === 'pie' || type === 'doughnut';
  const bg = isPie ? colors : isHex(colors[0]) ? transparentize(colors[0], 0.75) : colors[0];

  return {
    labels: SAMPLE_LABELS,
    datasets: [
      {
        label: title,
        data: SAMPLE_DATA,
        backgroundColor: bg,
        borderColor: isPie ? '#1a2332' : colors[0],
        borderWidth: 2,
        fill: type === 'line' ? true : undefined,
        tension: type === 'line' ? 0.4 : undefined,
        pointRadius: type === 'line' ? 3 : undefined,
      },
    ],
  };
}
