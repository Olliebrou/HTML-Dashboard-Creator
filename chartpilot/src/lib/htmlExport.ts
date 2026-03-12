import type { DashboardSnapshot, DataSource, WidgetConfig, ChartType } from '../types';
import { buildChartData } from './dataUtils';

// ── Helpers ───────────────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Safely serialize a value to JSON inside a <script> block by escaping
 * characters that could break out of the script context.
 */
function safeJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

/**
 * Determine whether a data source's rows should be included in the HTML export.
 * Manual and CSV sources default to static (rows included). API sources default
 * to dynamic (rows excluded) unless the user explicitly marks them as static.
 */
function isSourceStatic(ds: DataSource): boolean {
  if (typeof ds.isStatic === 'boolean') return ds.isStatic;
  return ds.type === 'manual' || ds.type === 'csv';
}

// ── Chart options ─────────────────────────────────────────────────────────────

const BASE_OPTIONS_JS = `{
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: { color: 'var(--text)', font: { family: "'Segoe UI','Inter',system-ui,sans-serif", size: 11 } }
    },
    tooltip: { mode: 'index', intersect: false }
  },
  scales: {
    x: { ticks: { color: 'var(--text-muted)', font: { size: 11 } }, grid: { color: 'var(--border)' } },
    y: { ticks: { color: 'var(--text-muted)', font: { size: 11 } }, grid: { color: 'var(--border)' } }
  }
}`;

const POLAR_OPTIONS_JS = `{
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: { color: 'var(--text)', font: { family: "'Segoe UI','Inter',system-ui,sans-serif", size: 11 }, padding: 12 }
    },
    tooltip: { mode: 'nearest' }
  }
}`;

const RADAR_OPTIONS_JS = `{
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: 'var(--text)', font: { size: 11 } } }
  },
  scales: {
    r: {
      grid: { color: 'var(--border)' },
      ticks: { color: 'var(--text-muted)', backdropColor: 'transparent' },
      pointLabels: { color: 'var(--text-muted)', font: { size: 11 } }
    }
  }
}`;

function getOptionsJs(type: ChartType): string {
  if (type === 'pie' || type === 'doughnut') return POLAR_OPTIONS_JS;
  if (type === 'radar') return RADAR_OPTIONS_JS;
  return BASE_OPTIONS_JS;
}

// ── Layout helpers ────────────────────────────────────────────────────────────

/**
 * Convert a widget's grid layout to CSS grid placement.
 * react-grid-layout uses 0-based x/y coordinates; CSS grid is 1-based.
 */
function widgetGridStyle(w: WidgetConfig): string {
  const { x, y, w: cols, h: rows } = w.layout;
  return [
    `grid-column: ${x + 1} / span ${cols}`,
    `grid-row: ${y + 1} / span ${rows}`,
  ].join('; ');
}

// ── Main export function ──────────────────────────────────────────────────────

/**
 * Generate a fully self-contained HTML file from the current dashboard snapshot.
 *
 * - Chart.js is loaded from CDN.
 * - Only data sources marked as static (or manual/csv by default) have their
 *   rows embedded; API-sourced data sources are exported without rows so that
 *   sample placeholder data is not leaked.
 * - The original JSON snapshot (with all rows/config intact) is embedded in a
 *   hidden <script type="application/json"> tag so the dashboard can be
 *   re-imported back into the editor.
 */
export function generateDashboardHTML(snapshot: DashboardSnapshot): string {
  const { meta, widgets, dataSources } = snapshot;

  // Build the "export" data sources: strip rows from non-static sources
  const exportDataSources: DataSource[] = dataSources.map((ds) => ({
    ...ds,
    rows: isSourceStatic(ds) ? ds.rows : [],
  }));

  // Pre-compute chart data for each widget using the filtered data sources
  const chartEntries = widgets.map((w) => {
    const data = buildChartData(w, exportDataSources);
    return { widget: w, data };
  });

  // Calculate grid row count for container height
  const maxRow = widgets.reduce((m, w) => Math.max(m, w.layout.y + w.layout.h), 0);
  const ROW_HEIGHT = 100;
  const GAP = 12;
  const containerMinHeight = maxRow * (ROW_HEIGHT + GAP) + GAP;

  const widgetHtml = chartEntries
    .map(({ widget }) => {
      const safeId = `chart-${widget.id.replace(/[^a-z0-9]/gi, '')}`;
      return `    <div class="cp-widget" style="${widgetGridStyle(widget)}">
      <div class="cp-widget-titlebar">
        <span class="cp-widget-title">${escapeHtml(widget.title)}</span>
      </div>
      <div class="cp-widget-chart">
        <canvas id="${safeId}"></canvas>
      </div>
    </div>`;
    })
    .join('\n');

  const chartInitJs = chartEntries
    .map(({ widget, data }) => {
      const safeId = `chart-${widget.id.replace(/[^a-z0-9]/gi, '')}`;
      return `  (function() {
    var el = document.getElementById(${JSON.stringify(safeId)});
    if (!el) return;
    new Chart(el, {
      type: ${safeJson(widget.type)},
      data: ${safeJson(data)},
      options: ${getOptionsJs(widget.type)}
    });
  })();`;
    })
    .join('\n');

  // Embed the full snapshot (all rows, all config) for round-trip import.
  // We use the original snapshot (not exportDataSources) so nothing is lost.
  const snapshotJson = safeJson(snapshot);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(meta.title)}</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <style>
    :root {
      --bg-base: #0f1720;
      --bg-surface: #111c28;
      --bg-elevated: #162536;
      --border: #243345;
      --text: #e7edf5;
      --text-muted: #7a8da1;
      --accent: #4e81b7;
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; }
    html, body {
      width: 100%; height: 100%;
      background: var(--bg-base);
      color: var(--text);
      font-family: 'Segoe UI', 'Inter', system-ui, sans-serif;
    }
    .cp-dashboard-header {
      padding: 16px 20px 12px;
      border-bottom: 1px solid var(--border);
      background: var(--bg-surface);
    }
    .cp-dashboard-title {
      font-size: 18px;
      font-weight: 700;
      color: var(--text);
      letter-spacing: -0.3px;
    }
    .cp-dashboard-grid {
      display: grid;
      grid-template-columns: repeat(12, 1fr);
      grid-auto-rows: ${ROW_HEIGHT}px;
      gap: ${GAP}px;
      padding: ${GAP}px;
      min-height: ${containerMinHeight}px;
    }
    .cp-widget {
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: 10px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .cp-widget-titlebar {
      padding: 8px 12px 6px;
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;
    }
    .cp-widget-title {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .cp-widget-chart {
      flex: 1;
      padding: 10px;
      min-height: 0;
      position: relative;
    }
    .cp-widget-chart canvas {
      width: 100% !important;
      height: 100% !important;
    }
  </style>
</head>
<body>
  <div class="cp-dashboard-header">
    <span class="cp-dashboard-title">${escapeHtml(meta.title)}</span>
  </div>
  <div class="cp-dashboard-grid">
${widgetHtml}
  </div>

  <!-- Dashboard snapshot for re-import into the editor -->
  <script type="application/json" id="cp-snapshot">${snapshotJson}</script>

  <script>
${chartInitJs}
  </script>
</body>
</html>`;
}

// ── Import helper ─────────────────────────────────────────────────────────────

/**
 * Extract a DashboardSnapshot from an exported HTML string.
 * Looks for the embedded <script type="application/json" id="cp-snapshot"> tag.
 * Returns null if the tag is not found or the JSON is invalid.
 */
export function extractSnapshotFromHtml(html: string): DashboardSnapshot | null {
  const match = html.match(
    /<script[^>]+type=["']application\/json["'][^>]+id=["']cp-snapshot["'][^>]*>([\s\S]*?)<\/script>/i,
  );
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1]) as DashboardSnapshot;
    if (!parsed.meta || !Array.isArray(parsed.widgets) || !Array.isArray(parsed.dataSources)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
