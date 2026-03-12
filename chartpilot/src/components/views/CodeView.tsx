import { useState, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { Check, AlertCircle } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useDashboardStore } from '../../stores/dashboardStore';
import { toast } from 'sonner';
import type { DashboardSnapshot } from '../../types';

export default function CodeView() {
  const { meta, widgets, dataSources, importDashboard } = useDashboardStore(
    useShallow((s) => ({
      meta: s.meta,
      widgets: s.widgets,
      dataSources: s.dataSources,
      importDashboard: s.importDashboard,
    })),
  );

  const currentJson = JSON.stringify({ meta, widgets, dataSources }, null, 2);
  const [editorValue, setEditorValue] = useState(currentJson);
  const [parseError, setParseError] = useState<string | null>(null);

  // Keep editor in sync if store changes externally
  const handleEditorChange = useCallback((value: string | undefined) => {
    const v = value ?? '';
    setEditorValue(v);
    try {
      JSON.parse(v);
      setParseError(null);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Invalid JSON');
    }
  }, []);

  const handleApply = () => {
    try {
      const parsed = JSON.parse(editorValue) as DashboardSnapshot;
      if (!parsed.meta || !Array.isArray(parsed.widgets) || !Array.isArray(parsed.dataSources)) {
        throw new Error('Missing required fields: meta, widgets, dataSources');
      }
      importDashboard(parsed);
      toast.success('Dashboard updated from JSON');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Invalid JSON');
    }
  };

  const handleReset = () => {
    const fresh = JSON.stringify({ meta, widgets, dataSources }, null, 2);
    setEditorValue(fresh);
    setParseError(null);
  };

  return (
    <div className="cp-code-view">
      <div className="cp-code-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="cp-section-title" style={{ marginBottom: 0 }}>Dashboard JSON</span>
          {parseError ? (
            <span className="cp-error-badge"><AlertCircle size={13} /> {parseError}</span>
          ) : (
            <span className="cp-ok-badge"><Check size={13} /> Valid JSON</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="cp-btn" onClick={handleReset}>Reset</button>
          <button className="cp-btn primary" onClick={handleApply} disabled={!!parseError}>
            Apply Changes
          </button>
        </div>
      </div>

      <div className="cp-monaco-container">
        <Editor
          defaultLanguage="json"
          value={editorValue}
          onChange={handleEditorChange}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            formatOnPaste: true,
            formatOnType: true,
            tabSize: 2,
            folding: true,
            automaticLayout: true,
          }}
        />
      </div>
    </div>
  );
}

