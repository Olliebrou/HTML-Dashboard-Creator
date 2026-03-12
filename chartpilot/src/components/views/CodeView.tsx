import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Check, AlertCircle, Code2, Braces } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useDashboardStore } from '../../stores/dashboardStore';
import { toast } from 'sonner';
import type { DashboardSnapshot } from '../../types';
import { generateDashboardHTML, extractSnapshotFromHtml } from '../../lib/htmlExport';

type CodeMode = 'html' | 'json';

export default function CodeView() {
  const { meta, widgets, dataSources, importDashboard } = useDashboardStore(
    useShallow((s) => ({
      meta: s.meta,
      widgets: s.widgets,
      dataSources: s.dataSources,
      importDashboard: s.importDashboard,
    })),
  );

  const [mode, setMode] = useState<CodeMode>('html');
  const [parseError, setParseError] = useState<string | null>(null);

  const snapshot = useMemo(
    () => ({ meta, widgets, dataSources }),
    [meta, widgets, dataSources],
  );

  const generatedHtml = useMemo(() => generateDashboardHTML(snapshot), [snapshot]);
  const currentJson = useMemo(() => JSON.stringify(snapshot, null, 2), [snapshot]);

  const defaultValue = mode === 'html' ? generatedHtml : currentJson;
  const [editorValue, setEditorValue] = useState(defaultValue);

  // Track the last "clean" value so we know if the editor has been edited
  const lastCleanRef = useRef(defaultValue);

  // When the snapshot changes externally (e.g., after Apply / undo / import),
  // sync the editor content back to the generated output if the user hasn't
  // made any edits since the last sync.
  useEffect(() => {
    const fresh = mode === 'html' ? generatedHtml : currentJson;
    if (editorValue === lastCleanRef.current) {
      setEditorValue(fresh);
      setParseError(null);
    }
    lastCleanRef.current = fresh;
  // editorValue intentionally omitted — we only want to sync on snapshot changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generatedHtml, currentJson, mode]);

  const validate = useCallback(
    (value: string, currentMode: CodeMode) => {
      if (currentMode === 'json') {
        try {
          JSON.parse(value);
          setParseError(null);
        } catch (err) {
          setParseError(err instanceof Error ? err.message : 'Invalid JSON');
        }
      } else {
        const snap = extractSnapshotFromHtml(value);
        if (!snap) {
          setParseError('No valid dashboard snapshot found in HTML');
        } else {
          setParseError(null);
        }
      }
    },
    [],
  );

  const handleModeChange = (next: CodeMode) => {
    const fresh = next === 'html' ? generatedHtml : currentJson;
    setMode(next);
    setEditorValue(fresh);
    lastCleanRef.current = fresh;
    setParseError(null);
  };

  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      const v = value ?? '';
      setEditorValue(v);
      validate(v, mode);
    },
    [mode, validate],
  );

  const handleApply = () => {
    try {
      let parsed: DashboardSnapshot;
      if (mode === 'html') {
        const snap = extractSnapshotFromHtml(editorValue);
        if (!snap) throw new Error('No valid dashboard snapshot found in HTML');
        parsed = snap;
      } else {
        parsed = JSON.parse(editorValue) as DashboardSnapshot;
        if (!parsed.meta || !Array.isArray(parsed.widgets) || !Array.isArray(parsed.dataSources)) {
          throw new Error('Missing required fields: meta, widgets, dataSources');
        }
      }
      importDashboard(parsed);
      toast.success('Dashboard updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Invalid content');
    }
  };

  const handleReset = () => {
    const fresh = mode === 'html' ? generatedHtml : currentJson;
    setEditorValue(fresh);
    lastCleanRef.current = fresh;
    setParseError(null);
  };

  return (
    <div className="cp-code-view">
      <div className="cp-code-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="cp-code-tabs">
            <button
              className={`cp-code-tab${mode === 'html' ? ' active' : ''}`}
              onClick={() => handleModeChange('html')}
              title="View the final dashboard HTML ready for embedding"
            >
              <Code2 size={13} /> HTML Output
            </button>
            <button
              className={`cp-code-tab${mode === 'json' ? ' active' : ''}`}
              onClick={() => handleModeChange('json')}
              title="View the raw JSON snapshot"
            >
              <Braces size={13} /> JSON Snapshot
            </button>
          </div>
          {parseError ? (
            <span className="cp-error-badge"><AlertCircle size={13} /> {parseError}</span>
          ) : (
            <span className="cp-ok-badge"><Check size={13} /> Valid</span>
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
          key={mode}
          defaultLanguage={mode === 'html' ? 'html' : 'json'}
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

