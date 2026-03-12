import { Undo2, Redo2, Play, Download, Upload, PanelRightOpen, PanelRightClose, Sun, Moon, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { useShallow } from 'zustand/react/shallow';
import { useDashboardStore } from '../../stores/dashboardStore';
import { useUiStore } from '../../stores/uiStore';
import type { DashboardSnapshot } from '../../types';
import { generateDashboardHTML, extractSnapshotFromHtml } from '../../lib/htmlExport';

type TopBarProps = {
  title: string;
  onTitleChange: (value: string) => void;
  rightPanelOpen: boolean;
  onTogglePanel: () => void;
};

export default function TopBar({ title, onTitleChange, rightPanelOpen, onTogglePanel }: TopBarProps) {
  const [dark, setDark] = useState(true);
  const importRef = useRef<HTMLInputElement>(null);

  const { past, future, undo, redo, exportSnapshot, importDashboard } = useDashboardStore(
    useShallow((s) => ({
      past: s.past,
      future: s.future,
      undo: s.undo,
      redo: s.redo,
      exportSnapshot: s.exportSnapshot,
      importDashboard: s.importDashboard,
    })),
  );
  const { previewMode, setPreviewMode } = useUiStore();

  const toggleTheme = () => {
    setDark((d) => !d);
    document.documentElement.setAttribute('data-theme', dark ? 'light' : 'dark');
  };

  const handleExport = () => {
    const snapshot = exportSnapshot();
    const html = generateDashboardHTML(snapshot);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '-').toLowerCase() || 'dashboard'}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Dashboard exported as HTML');
  };

  const handleImport = () => importRef.current?.click();

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const content = ev.target?.result as string;
        let parsed: DashboardSnapshot;

        if (file.name.endsWith('.html') || file.type === 'text/html') {
          // Extract embedded snapshot from HTML export
          const snap = extractSnapshotFromHtml(content);
          if (!snap) throw new Error('No dashboard snapshot found in HTML file');
          parsed = snap;
        } else {
          // Legacy JSON import
          parsed = JSON.parse(content) as DashboardSnapshot;
          if (!parsed.meta || !Array.isArray(parsed.widgets) || !Array.isArray(parsed.dataSources)) {
            throw new Error('Invalid dashboard file');
          }
        }

        importDashboard(parsed);
        toast.success('Dashboard imported');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to import');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  if (previewMode) {
    return (
      <header className="cp-topbar cp-topbar-preview">
        <span className="cp-topbar-preview-label">{title} — Preview</span>
        <button className="cp-btn" onClick={() => setPreviewMode(false)}>
          <X size={14} /> Exit Preview
        </button>
      </header>
    );
  }

  return (
    <header className="cp-topbar">
      <div className="cp-topbar-left">
        <input
          className="cp-title-input"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          aria-label="Dashboard title"
        />
      </div>

      <div className="cp-topbar-center">
        <button
          className="cp-icon-btn"
          title="Undo"
          onClick={undo}
          disabled={past.length === 0}
        >
          <Undo2 size={16} />
        </button>
        <button
          className="cp-icon-btn"
          title="Redo"
          onClick={redo}
          disabled={future.length === 0}
        >
          <Redo2 size={16} />
        </button>
        <span className="cp-topbar-divider" />
        <button
          className="cp-icon-btn accent"
          title="Preview dashboard"
          onClick={() => setPreviewMode(true)}
        >
          <Play size={16} />
        </button>
      </div>

      <div className="cp-topbar-right">
        <button className="cp-icon-btn" title="Import dashboard (HTML or JSON)" onClick={handleImport}>
          <Upload size={16} />
        </button>
        <button className="cp-icon-btn" title="Export dashboard as HTML" onClick={handleExport}>
          <Download size={16} />
        </button>
        <span className="cp-topbar-divider" />
        <button className="cp-icon-btn" title="Toggle theme" onClick={toggleTheme}>
          {dark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <button className="cp-icon-btn" title="Toggle properties panel" onClick={onTogglePanel}>
          {rightPanelOpen ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
        </button>
      </div>

      <input
        ref={importRef}
        type="file"
        accept=".html,.json,text/html,application/json"
        style={{ display: 'none' }}
        onChange={handleImportFile}
      />
    </header>
  );
}
