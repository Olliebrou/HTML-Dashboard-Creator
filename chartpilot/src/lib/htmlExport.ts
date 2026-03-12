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

/** Strip characters that could break out of a CSS property value context. */
function safeCssValue(val: string): string {
  return val.replace(/[;<>{}()'"\\]/g, '');
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

function widgetGridStyle(w: WidgetConfig): string {
  const { x, y, w: cols, h: rows } = w.layout;
  return [
    `grid-column: ${x + 1} / span ${cols}`,
    `grid-row: ${y + 1} / span ${rows}`,
  ].join('; ');
}

// ── Main export function ──────────────────────────────────────────────────────

export function generateDashboardHTML(snapshot: DashboardSnapshot): string {
  const { meta, widgets, dataSources, canvasSettings } = snapshot;

  // Build the "export" data sources: strip rows from non-static sources
  const exportDataSources: DataSource[] = dataSources.map((ds) => ({
    ...ds,
    rows: isSourceStatic(ds) ? ds.rows : [],
  }));

  // Pre-compute chart data for static-only chart widgets
  const chartWidgets = widgets.filter((w) => w.type !== 'text' && w.type !== 'table');
  const chartEntries = chartWidgets.map((w) => {
    const data = buildChartData(w, exportDataSources);
    return { widget: w, data };
  });

  // Calculate grid row count for container height
  const maxRow = widgets.reduce((m, w) => Math.max(m, w.layout.y + w.layout.h), 0);
  const ROW_HEIGHT = 100;
  const GAP = 12;
  const containerMinHeight = maxRow * (ROW_HEIGHT + GAP) + GAP;

  // Canvas background styles
  const canvasBg = canvasSettings?.backgroundColor ?? '';
  const canvasImg = canvasSettings?.backgroundImage ?? '';
  let canvasExtraStyle = '';
  if (canvasBg) canvasExtraStyle += `background-color: ${safeCssValue(canvasBg)};`;
  if (canvasImg) canvasExtraStyle += `background-image: url('${canvasImg.replace(/[^a-zA-Z0-9_.~:/?#[\]@!$&()*+,;=%\- ]/g, '')}'); background-size: cover; background-position: center;`;

  // Build widget HTML
  const widgetHtml = widgets
    .map((w) => {
      const safeId = `widget-${w.id.replace(/[^a-z0-9]/gi, '')}`;
      const widgetStyle: string[] = [widgetGridStyle(w)];
      if (w.backgroundColor) widgetStyle.push(`background: ${safeCssValue(w.backgroundColor)}`);
      if (w.borderColor) widgetStyle.push(`border-color: ${safeCssValue(w.borderColor)}`);

      const titleStyle = w.titleColor ? ` style="color: ${escapeHtml(w.titleColor)}"` : '';

      if (w.type === 'text') {
        const fontSize = w.textFontSize ?? 36;
        const color = safeCssValue(w.colors?.[0] ?? '#4e81b7');
        return `    <div class="cp-widget" style="${widgetStyle.join('; ')}" id="${safeId}">
      <div class="cp-widget-titlebar">
        <span class="cp-widget-title"${titleStyle}>${escapeHtml(w.title)}</span>
      </div>
      <div class="cp-widget-body cp-text-widget">
        <div class="cp-text-value" style="font-size: ${fontSize}px; color: ${color}" data-widget-id="${safeId}">\u2014</div>
      </div>
    </div>`;
      }

      if (w.type === 'table') {
        return `    <div class="cp-widget" style="${widgetStyle.join('; ')}" id="${safeId}">
      <div class="cp-widget-titlebar">
        <span class="cp-widget-title"${titleStyle}>${escapeHtml(w.title)}</span>
      </div>
      <div class="cp-widget-body cp-table-container" data-widget-id="${safeId}">
        <p class="cp-muted">Loading\u2026</p>
      </div>
    </div>`;
      }

      // Chart widget
      const canvasId = `chart-${w.id.replace(/[^a-z0-9]/gi, '')}`;
      return `    <div class="cp-widget" style="${widgetStyle.join('; ')}" id="${safeId}">
      <div class="cp-widget-titlebar">
        <span class="cp-widget-title"${titleStyle}>${escapeHtml(w.title)}</span>
      </div>
      <div class="cp-widget-chart">
        <canvas id="${canvasId}"></canvas>
      </div>
    </div>`;
    })
    .join('\n');

  // Build chart init JS for chart widgets that have static data
  const chartInitJs = chartEntries
    .map(({ widget, data }) => {
      const canvasId = `chart-${widget.id.replace(/[^a-z0-9]/gi, '')}`;
      return `  (function() {
    var el = document.getElementById(${JSON.stringify(canvasId)});
    if (!el) return;
    var c = new Chart(el, {
      type: ${safeJson(widget.type)},
      data: ${safeJson(data)},
      options: ${getOptionsJs(widget.type)}
    });
    window.__cpCharts = window.__cpCharts || {};
    window.__cpCharts[${safeJson(widget.id)}] = c;
  })();`;
    })
    .join('\n');

  // Build data source config for API sources (for runtime fetching)
  const apiSourceConfigs = dataSources
    .filter((ds) => !isSourceStatic(ds) && ds.apiUrl)
    .map((ds) => ({
      id: ds.id,
      name: ds.name,
      type: ds.type,
      apiUrl: ds.apiUrl,
      authType: ds.authType ?? 'none',
      bearerToken: ds.bearerToken,
      basicUser: ds.basicUser,
      basicPass: ds.basicPass,
      apiKeyHeader: ds.apiKeyHeader,
      apiKeyValue: ds.apiKeyValue,
      customHeaders: ds.customHeaders,
      columns: ds.columns,
      transforms: ds.transforms,
    }));

  // Embed the full snapshot for round-trip import
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
      display: flex; align-items: center; justify-content: space-between;
    }
    .cp-dashboard-title {
      font-size: 18px; font-weight: 700; color: var(--text); letter-spacing: -0.3px;
    }
    .cp-filter-bar {
      display: none; align-items: center; gap: 8px;
      font-size: 12px; color: var(--accent);
    }
    .cp-filter-bar.active { display: inline-flex; }
    .cp-filter-bar button {
      background: none; border: 1px solid var(--accent); color: var(--accent);
      border-radius: 4px; padding: 2px 8px; cursor: pointer; font-size: 11px;
    }
    .cp-filter-bar button:hover { background: var(--accent); color: var(--bg-base); }
    .cp-dashboard-grid {
      display: grid;
      grid-template-columns: repeat(12, 1fr);
      grid-auto-rows: ${ROW_HEIGHT}px;
      gap: ${GAP}px;
      padding: ${GAP}px;
      min-height: ${containerMinHeight}px;
      ${canvasExtraStyle}
    }
    .cp-widget {
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: 10px;
      display: flex; flex-direction: column; overflow: hidden;
    }
    .cp-widget-titlebar {
      padding: 8px 12px 6px;
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;
    }
    .cp-widget-title {
      font-size: 12px; font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase; letter-spacing: 0.5px;
    }
    .cp-widget-chart {
      flex: 1; padding: 10px; min-height: 0; position: relative;
    }
    .cp-widget-chart canvas { width: 100% !important; height: 100% !important; }
    .cp-widget-body { flex: 1; min-height: 0; overflow: auto; }
    /* Text / KPI */
    .cp-text-widget {
      display: flex; align-items: center; justify-content: center; padding: 12px;
    }
    .cp-text-value {
      font-weight: 700; text-align: center; line-height: 1.2; word-break: break-word;
    }
    /* Table */
    .cp-table-container { overflow: auto; }
    table.cp-tbl { width: 100%; border-collapse: collapse; font-size: 12px; }
    .cp-tbl th, .cp-tbl td {
      padding: 6px 10px; text-align: left;
      border-bottom: 1px solid var(--border);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px;
    }
    .cp-tbl th {
      position: sticky; top: 0;
      background: var(--bg-elevated); color: var(--text-muted);
      font-weight: 600; font-size: 11px;
      text-transform: uppercase; letter-spacing: 0.3px;
      cursor: pointer; user-select: none;
    }
    .cp-tbl th:hover { color: var(--text); }
    .cp-tbl tbody tr:hover { background: rgba(78,129,183,0.08); }
    .cp-tbl td.clickable { cursor: pointer; }
    .cp-tbl td.clickable:hover { color: var(--accent); text-decoration: underline; }
    .cp-tbl-filter { width: 100%; padding: 3px 6px; font-size: 11px; background: var(--bg-surface); color: var(--text); border: 1px solid var(--border); border-radius: 4px; }
    .cp-tbl-pagination { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 6px 10px; border-top: 1px solid var(--border); }
    .cp-tbl-pagination button { background: var(--bg-elevated); border: 1px solid var(--border); color: var(--text); padding: 3px 10px; border-radius: 4px; cursor: pointer; font-size: 11px; }
    .cp-tbl-pagination button:disabled { opacity: 0.4; cursor: default; }
    .cp-tbl-pagination span { font-size: 12px; font-weight: 600; color: var(--accent); }
    .cp-muted { color: var(--text-muted); }
  </style>
</head>
<body>
  <div class="cp-dashboard-header">
    <span class="cp-dashboard-title">${escapeHtml(meta.title)}</span>
    <span class="cp-filter-bar" id="cp-filter-bar">
      <span id="cp-filter-label"></span>
      <button onclick="window.__cpClearFilter()">✕ Clear</button>
    </span>
  </div>
  <div class="cp-dashboard-grid">
${widgetHtml}
  </div>

  <!-- Dashboard snapshot for re-import into the editor -->
  <script type="application/json" id="cp-snapshot">${snapshotJson}</script>

  <!-- API source configs for runtime fetching -->
  <script type="application/json" id="cp-api-sources">${safeJson(apiSourceConfigs)}</script>

  <!-- Widget configs for runtime rendering -->
  <script type="application/json" id="cp-widgets">${safeJson(widgets)}</script>

  <script>
// ── Runtime data engine ──────────────────────────────────────────────────────
(function() {
  "use strict";
  var dataSources = ${safeJson(exportDataSources)};
  var widgetConfigs = JSON.parse(document.getElementById('cp-widgets').textContent);
  var apiConfigs = JSON.parse(document.getElementById('cp-api-sources').textContent);
  var charts = window.__cpCharts || {};
  var crossFilter = null;

  function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  // ── Transform engine (mirrors dataTransform.ts) ──
  function applyTransforms(rows, columns, transforms) {
    var r = rows.slice(), c = columns.slice();
    for (var ti = 0; ti < transforms.length; ti++) {
      var t = transforms[ti];
      if (t.type === 'filter') {
        r = r.filter(function(row) {
          var v = row[t.column], tv = t.value;
          var nv = Number(v), ntv = Number(tv);
          switch(t.operator) {
            case 'eq': return String(v) === String(tv);
            case 'neq': return String(v) !== String(tv);
            case 'gt': return nv > ntv;
            case 'gte': return nv >= ntv;
            case 'lt': return nv < ntv;
            case 'lte': return nv <= ntv;
            case 'contains': return String(v).toLowerCase().indexOf(String(tv).toLowerCase()) >= 0;
            case 'not_contains': return String(v).toLowerCase().indexOf(String(tv).toLowerCase()) < 0;
            default: return true;
          }
        });
      } else if (t.type === 'sort') {
        r = r.slice().sort(function(a, b) {
          var va = a[t.column], vb = b[t.column];
          var na = Number(va), nb = Number(vb);
          if (!isNaN(na) && !isNaN(nb)) return t.direction === 'asc' ? na - nb : nb - na;
          return t.direction === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
        });
      } else if (t.type === 'topN') {
        if (t.column) {
          r.sort(function(a,b) {
            var d = t.direction === 'asc' ? 1 : -1;
            return d * (Number(a[t.column]) - Number(b[t.column]));
          });
        }
        r = r.slice(0, t.n);
      } else if (t.type === 'groupAggregate') {
        var groups = {};
        for (var i = 0; i < r.length; i++) {
          var key = String(r[i][t.groupBy] || '');
          if (!groups[key]) groups[key] = [];
          groups[key].push(r[i]);
        }
        var newRows = [];
        var newCols = [t.groupBy];
        var keys = Object.keys(groups);
        for (var k = 0; k < keys.length; k++) {
          var obj = {}; obj[t.groupBy] = keys[k];
          for (var a = 0; a < t.aggregations.length; a++) {
            var agg = t.aggregations[a];
            var alias = agg.alias || agg.column + '_' + agg.fn;
            if (newCols.indexOf(alias) < 0) newCols.push(alias);
            var vals = groups[keys[k]].map(function(x) { return Number(x[agg.column]) || 0; });
            switch(agg.fn) {
              case 'count': obj[alias] = vals.length; break;
              case 'sum': obj[alias] = vals.reduce(function(s,v){return s+v;},0); break;
              case 'avg': obj[alias] = vals.reduce(function(s,v){return s+v;},0) / (vals.length||1); break;
              case 'min': obj[alias] = Math.min.apply(null, vals); break;
              case 'max': obj[alias] = Math.max.apply(null, vals); break;
            }
          }
          newRows.push(obj);
        }
        r = newRows; c = newCols;
      }
    }
    return { rows: r, columns: c };
  }

  // ── Build Chart.js data (mirrors dataUtils.ts) ──
  function buildChartData(w, source) {
    if (!source || !source.rows || source.rows.length === 0) return null;
    var res = source.transforms && source.transforms.length > 0
      ? applyTransforms(source.rows, source.columns, source.transforms) : { rows: source.rows, columns: source.columns };
    if (w.widgetTransforms && w.widgetTransforms.length > 0) {
      res = applyTransforms(res.rows, res.columns, w.widgetTransforms);
    }
    // Apply cross-filter
    if (crossFilter && crossFilter.sourceWidgetId !== w.id) {
      var cf = crossFilter;
      var fr = res.rows.filter(function(r) { return String(r[cf.column]) === String(cf.value); });
      if (fr.length > 0) res.rows = fr;
    }
    var rows = res.rows, columns = res.columns;
    if (rows.length === 0) return null;
    var labelCol = w.labelColumn || columns[0];
    var valueCols = (w.valueColumns && w.valueColumns.length > 0)
      ? w.valueColumns.filter(function(c) { return columns.indexOf(c) >= 0; })
      : columns.filter(function(c) { return c !== labelCol; }).slice(0,3);
    var colors = (w.colors && w.colors.length > 0) ? w.colors : ['#4e81b7'];
    var labels = rows.map(function(r) { return String(r[labelCol] || ''); });
    if (w.type === 'scatter') {
      var yCol = valueCols[0] || columns[1] || columns[0];
      return { datasets: [{ label: w.title, data: rows.map(function(r) { return { x: Number(r[labelCol])||0, y: Number(r[yCol])||0 }; }), backgroundColor: colors[0], borderColor: colors[0], pointRadius: 5 }] };
    }
    var datasets = valueCols.map(function(col, i) {
      var color = colors[i % colors.length];
      var isPolar = w.type === 'pie' || w.type === 'doughnut';
      var bg = isPolar ? colors : (w.type === 'line' ? hexAlpha(color, 0.15) : hexAlpha(color, 0.75));
      return { label: col, data: rows.map(function(r) { return Number(r[col])||0; }), backgroundColor: bg, borderColor: isPolar ? '#1a2332' : color, borderWidth: 2, fill: w.type==='line', tension: w.type==='line' ? 0.4 : undefined, pointRadius: w.type==='line' ? 3 : undefined };
    });
    return { labels: labels, datasets: datasets };
  }

  function hexAlpha(hex, alpha) {
    if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return hex;
    var r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }

  // ── Compute text/KPI value ──
  function computeTextValue(w, source) {
    if (w.textContent) return w.textContent;
    if (!source || !source.rows || source.rows.length === 0) return '\\u2014';
    var res = source.transforms && source.transforms.length > 0
      ? applyTransforms(source.rows, source.columns, source.transforms) : { rows: source.rows, columns: source.columns };
    if (w.widgetTransforms && w.widgetTransforms.length > 0) {
      res = applyTransforms(res.rows, res.columns, w.widgetTransforms);
    }
    if (crossFilter && crossFilter.sourceWidgetId !== w.id) {
      var cf = crossFilter;
      var fr = res.rows.filter(function(r) { return String(r[cf.column]) === String(cf.value); });
      if (fr.length > 0) res.rows = fr;
    }
    if (res.rows.length === 0) return '\\u2014';
    var col = w.textValueColumn || (w.valueColumns && w.valueColumns[0]) || res.columns[0];
    if (!col) return '\\u2014';
    var vals = res.rows.map(function(r) { return Number(r[col]) || 0; });
    var fn = w.textAggregation || 'sum';
    var result;
    switch(fn) {
      case 'count': result = vals.length; break;
      case 'sum': result = vals.reduce(function(a,b){return a+b;},0); break;
      case 'avg': result = vals.reduce(function(a,b){return a+b;},0) / (vals.length||1); break;
      case 'min': result = Math.min.apply(null, vals); break;
      case 'max': result = Math.max.apply(null, vals); break;
      default: result = vals.reduce(function(a,b){return a+b;},0);
    }
    var formatted = Number.isInteger(result) ? result.toLocaleString() : result.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    return (w.textPrefix || '') + formatted + (w.textSuffix || '');
  }

  // ── Render table widget ──
  function renderTable(w, source, container) {
    container.innerHTML = '';
    if (!source || !source.rows || source.rows.length === 0) {
      container.innerHTML = '<p class="cp-muted" style="padding:12px">No data</p>'; return;
    }
    var res = source.transforms && source.transforms.length > 0
      ? applyTransforms(source.rows, source.columns, source.transforms) : { rows: source.rows, columns: source.columns };
    if (w.widgetTransforms && w.widgetTransforms.length > 0) {
      res = applyTransforms(res.rows, res.columns, w.widgetTransforms);
    }
    if (crossFilter && crossFilter.sourceWidgetId !== w.id) {
      var cf = crossFilter;
      var fr = res.rows.filter(function(r) { return String(r[cf.column]) === String(cf.value); });
      if (fr.length > 0) res.rows = fr;
    }
    var allRows = res.rows, columns = res.columns;
    var visCols = (w.tableVisibleColumns && w.tableVisibleColumns.length > 0)
      ? w.tableVisibleColumns.filter(function(c) { return columns.indexOf(c)>=0; }) : columns;
    var pageSize = w.tablePageSize || 10;
    var page = 0, sortCol = null, sortDir = 'asc', colFilters = {};

    function draw() {
      // Apply column filters
      var rows = allRows;
      Object.keys(colFilters).forEach(function(col) {
        var val = colFilters[col];
        if (val) rows = rows.filter(function(r) { return String(r[col]) === val; });
      });
      // Sort
      if (sortCol) {
        rows = rows.slice().sort(function(a,b) {
          var va = a[sortCol], vb = b[sortCol];
          var na = Number(va), nb = Number(vb);
          if (!isNaN(na) && !isNaN(nb)) return sortDir === 'asc' ? na - nb : nb - na;
          return sortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
        });
      }
      var totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
      if (page >= totalPages) page = totalPages - 1;
      var pageRows = rows.slice(page * pageSize, (page + 1) * pageSize);

      var html = '<table class="cp-tbl"><thead>';
      // Filter row
      if (w.tableFilterable !== false) {
        html += '<tr>';
        visCols.forEach(function(col) {
          var unique = [];
          var seen = {};
          allRows.forEach(function(r) { var v = String(r[col]||''); if(!seen[v]){seen[v]=true;unique.push(v);} });
          unique.sort();
          html += '<th><select class="cp-tbl-filter" data-col="'+esc(col)+'" ><option value="">All</option>';
          unique.slice(0,100).forEach(function(v) { html += '<option value="'+esc(v)+'"'+(colFilters[col]===v?' selected':'')+'>'+esc(v)+'</option>'; });
          html += '</select></th>';
        });
        html += '</tr>';
      }
      // Header row
      html += '<tr>';
      visCols.forEach(function(col) {
        html += '<th data-sort="'+esc(col)+'">' + esc(col) + (sortCol===col ? (sortDir==='asc'?' \\u25B2':' \\u25BC') : '') + '</th>';
      });
      html += '</tr></thead><tbody>';
      pageRows.forEach(function(row) {
        html += '<tr>';
        visCols.forEach(function(col) {
          html += '<td class="clickable" data-col="'+esc(col)+'" data-val="'+esc(String(row[col]||''))+'">' + esc(String(row[col]||'')) + '</td>';
        });
        html += '</tr>';
      });
      html += '</tbody></table>';
      if (totalPages > 1) {
        html += '<div class="cp-tbl-pagination"><button data-page="prev"'+(page===0?' disabled':'')+'>\\u2039 Prev</button><span>'+(page+1)+' / '+totalPages+'</span><button data-page="next"'+(page>=totalPages-1?' disabled':'')+'>Next \\u203A</button></div>';
      }
      container.innerHTML = html;

      // Attach event listeners
      container.querySelectorAll('th[data-sort]').forEach(function(th) {
        th.addEventListener('click', function() {
          var col = th.getAttribute('data-sort');
          if (sortCol === col) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
          else { sortCol = col; sortDir = 'asc'; }
          draw();
        });
      });
      container.querySelectorAll('select.cp-tbl-filter').forEach(function(sel) {
        sel.addEventListener('change', function() {
          colFilters[sel.getAttribute('data-col')] = sel.value;
          page = 0; draw();
        });
      });
      container.querySelectorAll('td.clickable').forEach(function(td) {
        td.addEventListener('click', function() {
          setCrossFilter({ sourceWidgetId: w.id, column: td.getAttribute('data-col'), value: td.getAttribute('data-val') });
        });
      });
      container.querySelectorAll('button[data-page]').forEach(function(btn) {
        btn.addEventListener('click', function() {
          if (btn.getAttribute('data-page') === 'prev' && page > 0) page--;
          else if (btn.getAttribute('data-page') === 'next') page++;
          draw();
        });
      });
    }
    draw();
  }

  // ── Cross-filter ──
  function setCrossFilter(f) {
    crossFilter = f;
    var bar = document.getElementById('cp-filter-bar');
    var label = document.getElementById('cp-filter-label');
    if (f) {
      bar.classList.add('active');
      label.textContent = f.column + ': ' + f.value;
    } else {
      bar.classList.remove('active');
    }
    refreshAll();
  }
  window.__cpClearFilter = function() { setCrossFilter(null); };

  // ── Refresh all widgets ──
  function refreshAll() {
    widgetConfigs.forEach(function(w) {
      var source = dataSources.find(function(ds) { return ds.id === w.dataSourceId; });
      var safeId = 'widget-' + w.id.replace(/[^a-z0-9]/gi, '');
      if (w.type === 'text') {
        var el = document.querySelector('[data-widget-id="' + safeId + '"]');
        if (el) el.textContent = computeTextValue(w, source);
      } else if (w.type === 'table') {
        var container = document.querySelector('[data-widget-id="' + safeId + '"]');
        if (container) renderTable(w, source, container);
      } else if (charts[w.id]) {
        var newData = buildChartData(w, source);
        if (newData) {
          charts[w.id].data = newData;
          charts[w.id].update();
        }
      }
    });
  }

  // ── Fetch API sources at runtime ──
  function fetchApiSources() {
    if (apiConfigs.length === 0) { refreshAll(); return; }
    var pending = apiConfigs.length;
    apiConfigs.forEach(function(cfg) {
      var headers = {};
      if (cfg.authType === 'bearer' && cfg.bearerToken) headers['Authorization'] = 'Bearer ' + cfg.bearerToken;
      else if (cfg.authType === 'basic' && cfg.basicUser) headers['Authorization'] = 'Basic ' + btoa(cfg.basicUser + ':' + (cfg.basicPass||''));
      else if (cfg.authType === 'apikey' && cfg.apiKeyHeader && cfg.apiKeyValue) headers[cfg.apiKeyHeader] = cfg.apiKeyValue;
      if (cfg.customHeaders) cfg.customHeaders.forEach(function(h) { if(h.key) headers[h.key] = h.value; });
      fetch(cfg.apiUrl, { headers: headers })
        .then(function(res) { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
        .then(function(json) {
          var arr = Array.isArray(json) ? json : (json.value && Array.isArray(json.value)) ? json.value : [];
          if (arr.length === 0 || arr[0] == null || typeof arr[0] !== 'object') return;
          var cols = Object.keys(arr[0]).filter(function(k) { return k.charAt(0) !== '@'; });
          var rows = arr.map(function(item) {
            var row = {};
            cols.forEach(function(c) {
              var v = item[c];
              row[c] = (typeof v === 'number') ? v : (v != null ? String(v) : '');
            });
            return row;
          });
          // Update matching data source
          var ds = dataSources.find(function(d) { return d.id === cfg.id; });
          if (ds) { ds.rows = rows; ds.columns = cols; if (cfg.transforms) ds.transforms = cfg.transforms; }
        })
        .catch(function(err) { console.warn('Failed to fetch ' + cfg.name + ':', err.message); })
        .finally(function() { pending--; if (pending <= 0) refreshAll(); });
    });
  }

  // ── Add click handlers to charts for cross-filtering ──
  Object.keys(charts).forEach(function(wid) {
    var c = charts[wid];
    var canvas = c.canvas;
    canvas.addEventListener('click', function(evt) {
      var elements = c.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, false);
      if (elements.length === 0) { setCrossFilter(null); return; }
      var idx = elements[0].index;
      var w = widgetConfigs.find(function(x) { return x.id === wid; });
      var label = (c.data.labels && c.data.labels[idx]) ? c.data.labels[idx] : null;
      if (label !== null && w) {
        var labelCol = w.labelColumn || 'label';
        setCrossFilter({ sourceWidgetId: wid, column: labelCol, value: String(label) });
      }
    });
  });

  // Initialize: render static data then fetch API sources
  refreshAll();
  fetchApiSources();
})();
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
