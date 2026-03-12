import { useMemo, useCallback } from 'react';
import { Bar, Line, Pie, Doughnut, Radar, Scatter } from 'react-chartjs-2';
import type { ChartOptions, ActiveElement, ChartEvent } from 'chart.js';
import type { WidgetConfig, DataSource } from '../../types';
import { buildChartData } from '../../lib/dataUtils';
import { useDashboardStore } from '../../stores/dashboardStore';

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
  const setCrossFilter = useDashboardStore((s) => s.setCrossFilter);
  const crossFilter = useDashboardStore((s) => s.crossFilter);

  // Apply cross-filter: if another widget set a cross-filter, filter matching data sources
  const effectiveSources = useMemo(() => {
    if (!crossFilter || crossFilter.sourceWidgetId === widget.id) return dataSources;
    return dataSources.map((ds) => {
      if (!ds.columns.includes(crossFilter.column)) return ds;
      const filteredRows = ds.rows.filter(
        (r) => String(r[crossFilter.column]) === String(crossFilter.value),
      );
      return { ...ds, rows: filteredRows };
    });
  }, [dataSources, crossFilter, widget.id]);

  const data = useMemo(
    () => buildChartData(widget, effectiveSources),
    [widget, effectiveSources],
  );

  const handleClick = useCallback(
    (_event: ChartEvent, elements: ActiveElement[]) => {
      if (elements.length === 0) {
        setCrossFilter(null);
        return;
      }
      const el = elements[0];
      const label = data.labels?.[el.index];
      if (label !== undefined) {
        const labelCol = widget.labelColumn ?? 'label';
        setCrossFilter({ sourceWidgetId: widget.id, column: labelCol, value: String(label) });
      }
    },
    [data, widget, setCrossFilter],
  );

  const withClick = useCallback(
    (opts: ChartOptions): ChartOptions => ({
      ...opts,
      onClick: handleClick as ChartOptions['onClick'],
    }),
    [handleClick],
  );

  switch (widget.type) {
    case 'bar':
      return <Bar data={data as Parameters<typeof Bar>[0]['data']} options={withClick(BASE_OPTIONS) as ChartOptions<'bar'>} />;
    case 'line':
      return <Line data={data as Parameters<typeof Line>[0]['data']} options={withClick(BASE_OPTIONS) as ChartOptions<'line'>} />;
    case 'pie':
      return <Pie data={data as Parameters<typeof Pie>[0]['data']} options={withClick(POLAR_OPTIONS) as ChartOptions<'pie'>} />;
    case 'doughnut':
      return <Doughnut data={data as Parameters<typeof Doughnut>[0]['data']} options={withClick(POLAR_OPTIONS) as ChartOptions<'doughnut'>} />;
    case 'radar':
      return <Radar data={data as Parameters<typeof Radar>[0]['data']} options={withClick(RADAR_OPTIONS) as ChartOptions<'radar'>} />;
    case 'scatter':
      return <Scatter data={data as Parameters<typeof Scatter>[0]['data']} options={withClick(BASE_OPTIONS) as ChartOptions<'scatter'>} />;
    default:
      return null;
  }
}
