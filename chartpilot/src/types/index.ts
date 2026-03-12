export type AppView = 'dashboard' | 'data' | 'code';

export type ChartType = 'bar' | 'line' | 'pie' | 'doughnut' | 'radar' | 'scatter';
export type DataSourceType = 'manual' | 'csv' | 'api' | 'dataverse' | 'graph' | 'sharepoint' | 'azure-blob';
export type ApiProvider = 'dataverse' | 'graph' | 'sharepoint' | 'azure-blob' | 'api';
export type AuthType = 'none' | 'bearer' | 'basic' | 'apikey';

export interface RequestHeader {
  key: string;
  value: string;
}

// ── Data Transform types ─────────────────────────────────────────────────────

export type FilterOperator =
  | 'eq' | 'neq'
  | 'gt' | 'gte'
  | 'lt' | 'lte'
  | 'contains' | 'not_contains';

export type AggregateFunction = 'count' | 'sum' | 'avg' | 'min' | 'max';
export type SortDirection = 'asc' | 'desc';

export interface FilterTransform {
  type: 'filter';
  column: string;
  operator: FilterOperator;
  value: string;
}

export interface SortTransform {
  type: 'sort';
  column: string;
  direction: SortDirection;
}

export interface TopNTransform {
  type: 'topN';
  n: number;
  column?: string;
  direction?: SortDirection;
}

export interface GroupAggregateTransform {
  type: 'groupAggregate';
  groupBy: string;
  aggregations: { column: string; fn: AggregateFunction; alias?: string }[];
}

export type DataTransform =
  | FilterTransform
  | SortTransform
  | TopNTransform
  | GroupAggregateTransform;

// ── Core data types ───────────────────────────────────────────────────────────

export interface DataRow {
  [key: string]: string | number;
}

export interface DataSource {
  id: string;
  name: string;
  type: DataSourceType;
  columns: string[];
  rows: DataRow[];
  // API connection config (used for api, dataverse, graph, sharepoint, azure-blob)
  apiUrl?: string;
  dataverseUrl?: string;
  authType?: AuthType;
  bearerToken?: string;
  basicUser?: string;
  basicPass?: string;
  apiKeyHeader?: string;
  apiKeyValue?: string;
  customHeaders?: RequestHeader[];
  // Data transforms applied after loading
  transforms?: DataTransform[];
  lastFetched?: string;
}

export interface WidgetLayout {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface WidgetConfig {
  id: string;
  type: ChartType;
  title: string;
  dataSourceId: string | null;
  labelColumn: string | null;
  valueColumns: string[];
  colors: string[];
  layout: WidgetLayout;
}

export interface DashboardMeta {
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardSnapshot {
  meta: DashboardMeta;
  widgets: WidgetConfig[];
  dataSources: DataSource[];
}

export interface UiState {
  activeView: AppView;
  rightPanelOpen: boolean;
  sidebarCollapsed: boolean;
  selectedWidgetId: string | null;
  previewMode: boolean;
  setActiveView: (view: AppView) => void;
  toggleRightPanel: () => void;
  toggleSidebar: () => void;
  selectWidget: (id: string | null) => void;
  setPreviewMode: (on: boolean) => void;
}

export interface DashboardState extends DashboardSnapshot {
  past: DashboardSnapshot[];
  future: DashboardSnapshot[];
  // Meta
  setTitle: (title: string) => void;
  // Widgets
  addWidget: (widget: Omit<WidgetConfig, 'id'>) => void;
  updateWidget: (id: string, patch: Partial<Omit<WidgetConfig, 'id'>>) => void;
  removeWidget: (id: string) => void;
  updateLayouts: (layouts: { id: string; layout: WidgetLayout }[]) => void;
  // Data Sources
  addDataSource: (ds: Omit<DataSource, 'id'>) => void;
  updateDataSource: (id: string, patch: Partial<Omit<DataSource, 'id'>>) => void;
  removeDataSource: (id: string) => void;
  // History
  undo: () => void;
  redo: () => void;
  // Import / Export
  importDashboard: (data: DashboardSnapshot) => void;
  exportSnapshot: () => DashboardSnapshot;
}
