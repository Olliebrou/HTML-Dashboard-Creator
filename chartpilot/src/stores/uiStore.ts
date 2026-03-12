import { create } from 'zustand';
import type { UiState } from '../types';

export const useUiStore = create<UiState>((set) => ({
  activeView: 'dashboard',
  rightPanelOpen: true,
  sidebarCollapsed: false,
  selectedWidgetId: null,
  previewMode: false,
  setActiveView: (view) => set({ activeView: view }),
  toggleRightPanel: () => set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  selectWidget: (id) => set({ selectedWidgetId: id }),
  setPreviewMode: (on) => set({ previewMode: on }),
}));
