import { create } from 'zustand';
import type { DashboardState } from '../types';

export const useDashboardStore = create<DashboardState>((set) => ({
  meta: {
    title: 'Untitled Dashboard',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  setTitle: (title) =>
    set((s) => ({
      meta: { ...s.meta, title, updatedAt: new Date().toISOString() },
    })),
}));
