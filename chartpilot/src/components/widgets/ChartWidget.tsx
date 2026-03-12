import { useMemo } from 'react';
import { Bar, Line, Pie, Doughnut, Radar, Scatter } from 'react-chartjs-2';
import type { ChartOptions } from 'chart.js';
import type { WidgetConfig, DataSource } from '../../types';
import { buildChartData } from '../../lib/dataUtils';

const BASE_OPTIONS: ChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        color: 'var(--text)',
        font: { family: "'Segoe UI', 'Inter', system-ui, sans-serif", size: 11 },
      },
    },
    tooltip: { mode: 'index', intersect: false },
  },
  scales: {
    x: {
      ticks: { color: 'var(--text-muted)', font: { size: 11 } },
      grid: { color: 'var(--border)' },
    },
    y: {
      ticks: { color: 'var(--text-muted)', font: { size: 11 } },
      grid: { color: 'var(--border)' },
    },
  },
};

const POLAR_OPTIONS: ChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        color: 'var(--text)',
        font: { family: "'Segoe UI', 'Inter', system-ui, sans-serif", size: 11 },
        padding: 12,
      },
    },
    tooltip: { mode: 'nearest' },
  },
};

const RADAR_OPTIONS: ChartOptions<'radar'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        color: 'var(--text)',
        font: { size: 11 },
      },
    },
  },
  scales: {
    r: {
      grid: { color: 'var(--border)' },
      ticks: { color: 'var(--text-muted)', backdropColor: 'transparent' },
      pointLabels: { color: 'var(--text-muted)', font: { size: 11 } },
    },
  },
};

interface Props {
  widget: WidgetConfig;
  dataSources: DataSource[];
}

export default function ChartWidget({ widget, dataSources }: Props) {
  const data = useMemo(
    () => buildChartData(widget, dataSources),
    [widget, dataSources],
  );

  switch (widget.type) {
    case 'bar':
      return <Bar data={data as Parameters<typeof Bar>[0]['data']} options={BASE_OPTIONS as ChartOptions<'bar'>} />;
    case 'line':
      return <Line data={data as Parameters<typeof Line>[0]['data']} options={BASE_OPTIONS as ChartOptions<'line'>} />;
    case 'pie':
      return <Pie data={data as Parameters<typeof Pie>[0]['data']} options={POLAR_OPTIONS as ChartOptions<'pie'>} />;
    case 'doughnut':
      return <Doughnut data={data as Parameters<typeof Doughnut>[0]['data']} options={POLAR_OPTIONS as ChartOptions<'doughnut'>} />;
    case 'radar':
      return <Radar data={data as Parameters<typeof Radar>[0]['data']} options={RADAR_OPTIONS as ChartOptions<'radar'>} />;
    case 'scatter':
      return <Scatter data={data as Parameters<typeof Scatter>[0]['data']} options={BASE_OPTIONS as ChartOptions<'scatter'>} />;
    default:
      return null;
  }
}
