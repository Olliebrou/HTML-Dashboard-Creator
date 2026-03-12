import { useState, useRef, useCallback } from 'react';
import { UploadCloud } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import Modal from '../common/Modal';
import type { DataSource, DataSourceType, DataRow } from '../../types';
import { useDashboardStore } from '../../stores/dashboardStore';
import { parseCSV } from '../../lib/csvParser';

interface Props {
  existing?: DataSource;
  onClose: () => void;
}

type Tab = 'manual' | 'csv' | 'api';

const MANUAL_PLACEHOLDER = `Month,Sales,Expenses
Jan,65,40
Feb,59,35
Mar,80,50
Apr,81,55
May,56,30
Jun,72,45`;

export default function AddDataSourceModal({ existing, onClose }: Props) {
  const { addDataSource, updateDataSource } = useDashboardStore(
    useShallow((s) => ({
      addDataSource: s.addDataSource,
      updateDataSource: s.updateDataSource,
    })),
  );

  const isEdit = !!existing;
  const [name, setName] = useState(existing?.name ?? '');
  const [tab, setTab] = useState<Tab>(existing?.type ?? 'manual');
  const [csvText, setCsvText] = useState<string>(
    existing?.type === 'manual' || existing?.type === 'csv'
      ? serializeRows(existing.columns, existing.rows)
      : '',
  );
  const [apiUrl, setApiUrl] = useState(existing?.apiUrl ?? '');
  const [apiPreview, setApiPreview] = useState<string>('');
  const [apiError, setApiError] = useState<string>('');
  const [fetching, setFetching] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setCsvText(text);
      if (!name) setName(file.name.replace(/\.csv$/i, ''));
    };
    reader.readAsText(file);
  }, [name]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const fetchApi = async () => {
    setFetching(true);
    setApiError('');
    setApiPreview('');
    try {
      const res = await fetch(apiUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const json = await res.json();
      setApiPreview(JSON.stringify(json, null, 2).slice(0, 600) + '…');
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Fetch failed');
    } finally {
      setFetching(false);
    }
  };

  const handleSave = () => {
    const finalName = name.trim() || 'Untitled Source';

    let dsData: Omit<DataSource, 'id'>;

    if (tab === 'manual' || tab === 'csv') {
      const { columns, rows, error } = parseCSV(csvText || MANUAL_PLACEHOLDER);
      if (error && columns.length === 0) {
        alert(`Parse error: ${error}`);
        return;
      }
      dsData = {
        name: finalName,
        type: tab as DataSourceType,
        columns,
        rows,
        lastFetched: new Date().toISOString(),
      };
    } else {
      dsData = {
        name: finalName,
        type: 'api',
        columns: [],
        rows: [],
        apiUrl,
        lastFetched: new Date().toISOString(),
      };
    }

    if (isEdit && existing) {
      updateDataSource(existing.id, dsData);
    } else {
      addDataSource(dsData);
    }

    onClose();
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'manual', label: 'Manual / CSV Text' },
    { id: 'csv', label: 'CSV File Upload' },
    { id: 'api', label: 'API / URL' },
  ];

  return (
    <Modal title={isEdit ? 'Edit Data Source' : 'Add Data Source'} onClose={onClose} width={580}>
      <div className="cp-form-section">
        <label className="cp-form-label" htmlFor="ds-name">Name</label>
        <input
          id="ds-name"
          className="cp-input"
          placeholder="My Data Source"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
      </div>

      <div className="cp-tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`cp-tab${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {(tab === 'manual') && (
        <div className="cp-form-section">
          <label className="cp-form-label">
            CSV Data{' '}
            <span className="cp-muted">— first row is headers</span>
          </label>
          <textarea
            className="cp-textarea"
            rows={10}
            placeholder={MANUAL_PLACEHOLDER}
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            spellCheck={false}
          />
        </div>
      )}

      {tab === 'csv' && (
        <div className="cp-form-section">
          <div
            className={`cp-drop-zone${dragOver ? ' drag-over' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
          >
            <UploadCloud size={32} />
            <p>Drop a CSV file here or <strong>click to browse</strong></p>
            {csvText && (
              <p className="cp-muted" style={{ marginTop: 4 }}>
                ✓ {csvText.trim().split('\n').length - 1} data rows loaded
              </p>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          {csvText && (
            <textarea
              className="cp-textarea"
              rows={6}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              spellCheck={false}
              style={{ marginTop: 8 }}
            />
          )}
        </div>
      )}

      {tab === 'api' && (
        <div className="cp-form-section">
          <label className="cp-form-label" htmlFor="api-url">API URL</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              id="api-url"
              className="cp-input"
              style={{ flex: 1 }}
              placeholder="https://api.example.com/data"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
            />
            <button
              className="cp-btn primary"
              onClick={fetchApi}
              disabled={!apiUrl.trim() || fetching}
            >
              {fetching ? 'Fetching…' : 'Test'}
            </button>
          </div>
          {apiError && <p className="cp-error" style={{ marginTop: 6 }}>{apiError}</p>}
          {apiPreview && (
            <pre className="cp-code-preview" style={{ marginTop: 8 }}>{apiPreview}</pre>
          )}
          <p className="cp-muted" style={{ marginTop: 8 }}>
            Note: The response must be a JSON array of objects. CORS must allow browser access.
          </p>
        </div>
      )}

      <div className="cp-modal-footer">
        <button className="cp-btn" onClick={onClose}>Cancel</button>
        <button className="cp-btn primary" onClick={handleSave}>
          {isEdit ? 'Save Changes' : 'Add Source'}
        </button>
      </div>
    </Modal>
  );
}

function serializeRows(columns: string[], rows: DataRow[]): string {
  if (columns.length === 0) return '';
  const lines = [columns.join(',')];
  for (const row of rows) {
    lines.push(columns.map((c) => {
      const v = String(row[c] ?? '');
      return v.includes(',') ? `"${v}"` : v;
    }).join(','));
  }
  return lines.join('\n');
}
