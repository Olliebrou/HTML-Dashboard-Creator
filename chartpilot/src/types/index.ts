export type AppView = 'dashboard' | 'data' | 'code';

export type ChartType = 'bar' | 'line' | 'pie' | 'doughnut' | 'radar' | 'scatter';
export type DataSourceType = 'manual' | 'csv' | 'api';

export interface DataRow {
  [key: string]: string | number;
}

export interface DataSource {
  id: string;
  name: string;
  type: DataSourceType;
  columns: string[];
  rows: DataRow[];
  apiUrl?: string;
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
