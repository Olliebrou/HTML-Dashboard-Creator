export type AppView = 'dashboard' | 'data' | 'code';

export interface UiState {
  activeView: AppView;
  rightPanelOpen: boolean;
  sidebarCollapsed: boolean;
  setActiveView: (view: AppView) => void;
  toggleRightPanel: () => void;
  toggleSidebar: () => void;
}

export interface DashboardMeta {
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardState {
  meta: DashboardMeta;
  setTitle: (title: string) => void;
}
