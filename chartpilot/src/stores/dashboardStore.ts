import { create } from 'zustand';
import type { DashboardState, DashboardSnapshot, WidgetConfig, WidgetLayout, DataSource } from '../types';

const MAX_HISTORY_SIZE = 50;

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for non-secure contexts
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}

function snapshot(s: DashboardState): DashboardSnapshot {
  return {
    meta: s.meta,
    widgets: s.widgets,
    dataSources: s.dataSources,
  };
}

function pushHistory(
  s: DashboardState,
  current: DashboardSnapshot,
): Pick<DashboardState, 'past' | 'future'> {
  return {
    past: [...s.past.slice(-(MAX_HISTORY_SIZE - 1)), current],
    future: [],
  };
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  meta: {
    title: 'Untitled Dashboard',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  widgets: [],
  dataSources: [],
  past: [],
  future: [],

  // ── Meta ──────────────────────────────────────────────────────────────────

  setTitle: (title) =>
    set((s) => ({
      meta: { ...s.meta, title, updatedAt: new Date().toISOString() },
    })),

  // ── Widgets ───────────────────────────────────────────────────────────────

  addWidget: (widget: Omit<WidgetConfig, 'id'>) =>
    set((s) => ({
      ...pushHistory(s, snapshot(s)),
      widgets: [
        ...s.widgets,
        { ...widget, id: newId() },
      ],
      meta: { ...s.meta, updatedAt: new Date().toISOString() },
    })),

  updateWidget: (id, patch) =>
    set((s) => ({
      ...pushHistory(s, snapshot(s)),
      widgets: s.widgets.map((w) => (w.id === id ? { ...w, ...patch } : w)),
      meta: { ...s.meta, updatedAt: new Date().toISOString() },
    })),

  removeWidget: (id) =>
    set((s) => ({
      ...pushHistory(s, snapshot(s)),
      widgets: s.widgets.filter((w) => w.id !== id),
      meta: { ...s.meta, updatedAt: new Date().toISOString() },
    })),

  updateLayouts: (layouts: { id: string; layout: WidgetLayout }[]) =>
    set((s) => ({
      widgets: s.widgets.map((w) => {
        const match = layouts.find((l) => l.id === w.id);
        return match ? { ...w, layout: match.layout } : w;
      }),
    })),

  // ── Data Sources ──────────────────────────────────────────────────────────

  addDataSource: (ds: Omit<DataSource, 'id'>) =>
    set((s) => ({
      ...pushHistory(s, snapshot(s)),
      dataSources: [...s.dataSources, { ...ds, id: newId() }],
      meta: { ...s.meta, updatedAt: new Date().toISOString() },
    })),

  updateDataSource: (id, patch) =>
    set((s) => ({
      ...pushHistory(s, snapshot(s)),
      dataSources: s.dataSources.map((d) => (d.id === id ? { ...d, ...patch } : d)),
      meta: { ...s.meta, updatedAt: new Date().toISOString() },
    })),

  removeDataSource: (id) =>
    set((s) => ({
      ...pushHistory(s, snapshot(s)),
      dataSources: s.dataSources.filter((d) => d.id !== id),
      meta: { ...s.meta, updatedAt: new Date().toISOString() },
    })),

  // ── History ───────────────────────────────────────────────────────────────

  undo: () => {
    const s = get();
    if (s.past.length === 0) return;
    const previous = s.past[s.past.length - 1];
    const current = snapshot(s);
    set({
      ...previous,
      past: s.past.slice(0, -1),
      future: [current, ...s.future.slice(0, MAX_HISTORY_SIZE - 1)],
    });
  },

  redo: () => {
    const s = get();
    if (s.future.length === 0) return;
    const next = s.future[0];
    const current = snapshot(s);
    set({
      ...next,
      past: [...s.past.slice(-(MAX_HISTORY_SIZE - 1)), current],
      future: s.future.slice(1),
    });
  },

  // ── Import / Export ───────────────────────────────────────────────────────

  importDashboard: (data) =>
    set((s) => ({
      ...pushHistory(s, snapshot(s)),
      meta: data.meta,
      widgets: data.widgets,
      dataSources: data.dataSources,
    })),

  exportSnapshot: () => snapshot(get()),
}));
