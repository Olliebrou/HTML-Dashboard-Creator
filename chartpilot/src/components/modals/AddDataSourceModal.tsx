import { useState, useRef, useCallback } from 'react';
import {
  UploadCloud, Database, Globe, FileSpreadsheet, Cloud, Share2, LayoutGrid,
  Plus, Trash2, ChevronLeft, Info, Plug,
} from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { toast } from 'sonner';
import Modal from '../common/Modal';
import type {
  DataSource, DataSourceType, DataRow, AuthType, RequestHeader,
} from '../../types';
import { useDashboardStore } from '../../stores/dashboardStore';
import { parseCSV } from '../../lib/csvParser';
import { parseDataverseJson } from '../../lib/dataverseParser';

interface Props {
  existing?: DataSource;
  onClose: () => void;
}

// ── Source-type catalogue ─────────────────────────────────────────────────────

interface SourceDef {
  id: DataSourceType;
  label: string;
  description: string;
  category: 'file' | 'api';
  Icon: React.ComponentType<{ size?: number }>;
  urlPlaceholder?: string;
  urlHint?: string;
  authHint?: string;
  sampleEndpoint?: string;
}

const SOURCE_DEFS: SourceDef[] = [
  {
    id: 'manual', label: 'Manual Entry', category: 'file',
    description: 'Type or paste CSV data directly.',
    Icon: FileSpreadsheet,
  },
  {
    id: 'csv', label: 'CSV File', category: 'file',
    description: 'Upload a .csv file from your device.',
    Icon: UploadCloud,
  },
  {
    id: 'dataverse', label: 'Dataverse', category: 'api',
    description: 'Microsoft Dataverse / Dynamics 365.',
    Icon: Database,
    urlPlaceholder: 'https://yourorg.crm.dynamics.com/api/data/v9.2/accounts',
    urlHint: 'Use the Dataverse Web API. Format: {env}/api/data/v9.2/{entitySetName}',
    authHint: 'Use a Bearer token from your OAuth session, or paste the response JSON below after fetching with Postman / Power Automate.',
    sampleEndpoint: '/api/data/v9.2/accounts?$select=name,revenue&$top=50',
  },
  {
    id: 'graph', label: 'Graph API', category: 'api',
    description: 'Microsoft 365 — users, calendar, emails, Teams.',
    Icon: Share2,
    urlPlaceholder: 'https://graph.microsoft.com/v1.0/users',
    urlHint: 'Use the Microsoft Graph Explorer to build and test queries, then paste the response here.',
    authHint: 'Requires an Azure AD Bearer token with appropriate scopes. Use Postman or Graph Explorer to authenticate and copy the JSON response.',
    sampleEndpoint: '/v1.0/users?$select=displayName,mail,jobTitle&$top=50',
  },
  {
    id: 'sharepoint', label: 'SharePoint', category: 'api',
    description: 'SharePoint lists and document libraries.',
    Icon: LayoutGrid,
    urlPlaceholder: 'https://yourorg.sharepoint.com/sites/MySite/_api/lists/getbytitle(\'MyList\')/items',
    urlHint: 'Use the SharePoint REST API. Lists endpoint: {siteUrl}/_api/lists/getbytitle(\'{ListName}\')/items',
    authHint: 'SharePoint API requires a Bearer token. Use Postman with Azure AD OAuth or use Power Automate to export the list and paste the JSON below.',
    sampleEndpoint: "/_api/lists/getbytitle('Orders')/items?$select=Title,Amount,Status",
  },
  {
    id: 'azure-blob', label: 'Azure Blob', category: 'api',
    description: 'JSON/CSV files from Azure Blob Storage.',
    Icon: Cloud,
    urlPlaceholder: 'https://youraccount.blob.core.windows.net/container/data.json?sv=...',
    urlHint: 'Use a SAS URL for public or shared-access blobs. Generate a SAS token in the Azure Portal.',
    authHint: 'For public blobs, no auth needed. For private blobs, append a SAS token to the URL. The file must be JSON (array) or CSV.',
    sampleEndpoint: '/container/data.json?sv=2023-01-03&ss=b&...',
  },
  {
    id: 'api', label: 'Other API', category: 'api',
    description: 'Any REST API — configure auth and headers.',
    Icon: Globe,
    urlPlaceholder: 'https://api.example.com/v1/data',
    urlHint: 'Enter the full endpoint URL. The response should be a JSON array or OData envelope.',
    authHint: 'Choose an authentication method below. If the API is protected by OAuth, use Bearer Token mode and paste a valid access token.',
  },
];

const MANUAL_PLACEHOLDER = `Month,Sales,Expenses
Jan,65,40
Feb,59,35
Mar,80,50
Apr,81,55
May,56,30
Jun,72,45`;

const AUTH_TYPES: { id: AuthType; label: string; hint: string }[] = [
  { id: 'none', label: 'No Auth', hint: 'The endpoint is publicly accessible.' },
  { id: 'bearer', label: 'Bearer Token', hint: 'OAuth 2.0 / JWT — paste an access token.' },
  { id: 'basic', label: 'Basic Auth', hint: 'Username and password credentials.' },
  { id: 'apikey', label: 'API Key', hint: 'A key sent in a request header.' },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function AddDataSourceModal({ existing, onClose }: Props) {
  const { addDataSource, updateDataSource } = useDashboardStore(
    useShallow((s) => ({ addDataSource: s.addDataSource, updateDataSource: s.updateDataSource })),
  );

  const isEdit = !!existing;

  // Step: 'pick' | 'config'  (edit mode starts at 'config')
  const [step, setStep] = useState<'pick' | 'config'>(isEdit ? 'config' : 'pick');
  const [sourceType, setSourceType] = useState<DataSourceType>(existing?.type ?? 'manual');
  const def = SOURCE_DEFS.find((d) => d.id === sourceType)!;

  // Shared fields
  const [name, setName] = useState(existing?.name ?? '');

  // CSV / Manual
  const [csvText, setCsvText] = useState<string>(
    existing?.type === 'manual' || existing?.type === 'csv'
      ? serializeRows(existing.columns, existing.rows) : '',
  );
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // API connection fields
  const [apiUrl, setApiUrl] = useState(existing?.apiUrl ?? existing?.dataverseUrl ?? '');
  const [authType, setAuthType] = useState<AuthType>(existing?.authType ?? 'none');
  const [bearerToken, setBearerToken] = useState(existing?.bearerToken ?? '');
  const [basicUser, setBasicUser] = useState(existing?.basicUser ?? '');
  const [basicPass, setBasicPass] = useState(existing?.basicPass ?? '');
  const [apiKeyHeader, setApiKeyHeader] = useState(existing?.apiKeyHeader ?? 'X-API-Key');
  const [apiKeyValue, setApiKeyValue] = useState(existing?.apiKeyValue ?? '');
  const [customHeaders, setCustomHeaders] = useState<RequestHeader[]>(
    existing?.customHeaders ?? [],
  );
  const [pastedJson, setPastedJson] = useState<string>(
    (existing?.type !== 'manual' && existing?.type !== 'csv' && existing?.rows.length)
      ? serializeApiRows(existing.columns, existing.rows) : '',
  );
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [fetchPreview, setFetchPreview] = useState('');

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setCsvText(e.target?.result as string);
      if (!name) setName(file.name.replace(/\.csv$/i, ''));
    };
    reader.readAsText(file);
  }, [name]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const buildRequestHeaders = (): Record<string, string> => {
    const h: Record<string, string> = {};
    if (authType === 'bearer' && bearerToken.trim()) {
      h['Authorization'] = `Bearer ${bearerToken.trim()}`;
    } else if (authType === 'basic' && basicUser.trim()) {
      h['Authorization'] = `Basic ${btoa(unescape(encodeURIComponent(`${basicUser}:${basicPass}`)))}`;
    } else if (authType === 'apikey' && apiKeyHeader.trim() && apiKeyValue.trim()) {
      h[apiKeyHeader.trim()] = apiKeyValue.trim();
    }
    for (const hdr of customHeaders) {
      if (hdr.key.trim()) h[hdr.key.trim()] = hdr.value;
    }
    return h;
  };

  const handleFetch = async () => {
    if (!apiUrl.trim()) return;
    setFetching(true); setFetchError(''); setFetchPreview('');
    try {
      const res = await fetch(apiUrl.trim(), { headers: buildRequestHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const json = await res.json();
      const text = JSON.stringify(json, null, 2);
      setPastedJson(text);
      setFetchPreview(text.slice(0, 400) + (text.length > 400 ? '\n…' : ''));
      toast.success('Response received — review and click Save');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Fetch failed';
      setFetchError(msg);
      toast.error(msg + ' — you can still paste the JSON manually below.');
    } finally {
      setFetching(false);
    }
  };

  const addHeader = () => setCustomHeaders((h) => [...h, { key: '', value: '' }]);
  const removeHeader = (i: number) => setCustomHeaders((h) => h.filter((_, j) => j !== i));
  const updateHeader = (i: number, field: 'key' | 'value', val: string) =>
    setCustomHeaders((h) => h.map((hdr, j) => j === i ? { ...hdr, [field]: val } : hdr));

  // ── Save ─────────────────────────────────────────────────────────────────────

  const handleSave = () => {
    const finalName = name.trim() || def.label;

    let dsData: Omit<DataSource, 'id'>;

    if (sourceType === 'manual' || sourceType === 'csv') {
      const { columns, rows, error } = parseCSV(csvText || MANUAL_PLACEHOLDER);
      if (error && columns.length === 0) { toast.error(`CSV error: ${error}`); return; }
      dsData = { name: finalName, type: sourceType, columns, rows, lastFetched: new Date().toISOString() };
    } else {
      // API-based sources — parse the pasted/fetched JSON
      const { columns, rows, error } = parseDataverseJson(pastedJson);
      if (error) { toast.error(error); return; }
      if (columns.length === 0) {
        toast.error('No data found. Paste a JSON array or OData response in the field below.');
        return;
      }
      const sharedApiConfig = {
        authType,
        bearerToken: bearerToken || undefined,
        basicUser: basicUser || undefined,
        basicPass: basicPass || undefined,
        apiKeyHeader: apiKeyHeader || undefined,
        apiKeyValue: apiKeyValue || undefined,
        customHeaders: customHeaders.filter((h) => h.key.trim()).length ? customHeaders.filter((h) => h.key.trim()) : undefined,
      };
      dsData = {
        name: finalName,
        type: sourceType as DataSourceType,
        columns,
        rows,
        apiUrl: apiUrl.trim() || undefined,
        dataverseUrl: sourceType === 'dataverse' ? (apiUrl.trim() || undefined) : undefined,
        ...sharedApiConfig,
        lastFetched: new Date().toISOString(),
        transforms: existing?.transforms,
      };
    }

    if (isEdit && existing) {
      updateDataSource(existing.id, dsData);
    } else {
      addDataSource(dsData);
    }
    onClose();
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  const fileSources = SOURCE_DEFS.filter((d) => d.category === 'file');
  const apiSources = SOURCE_DEFS.filter((d) => d.category === 'api');

  return (
    <Modal
      title={isEdit ? `Edit: ${existing!.name}` : 'Add Data Source'}
      onClose={onClose}
      width={700}
    >
      {/* ── Step 1: Source Picker ── */}
      {step === 'pick' && (
        <>
          <p className="cp-helper-text" style={{ marginBottom: 16 }}>
            Choose where your data comes from. You can always add more sources later.
          </p>

          <div className="cp-source-group-label">📁 File & Manual</div>
          <div className="cp-source-picker">
            {fileSources.map((s) => (
              <button
                key={s.id}
                className={`cp-source-card${sourceType === s.id ? ' active' : ''}`}
                onClick={() => setSourceType(s.id)}
              >
                <s.Icon size={22} />
                <span className="cp-source-card-label">{s.label}</span>
                <span className="cp-source-card-desc">{s.description}</span>
              </button>
            ))}
          </div>

          <div className="cp-source-group-label" style={{ marginTop: 18 }}>🔌 API Connections</div>
          <div className="cp-source-picker">
            {apiSources.map((s) => (
              <button
                key={s.id}
                className={`cp-source-card${sourceType === s.id ? ' active' : ''}`}
                onClick={() => setSourceType(s.id)}
              >
                <s.Icon size={22} />
                <span className="cp-source-card-label">{s.label}</span>
                <span className="cp-source-card-desc">{s.description}</span>
              </button>
            ))}
          </div>

          <div className="cp-modal-footer">
            <button className="cp-btn" onClick={onClose}>Cancel</button>
            <button className="cp-btn primary" onClick={() => setStep('config')}>
              Continue →
            </button>
          </div>
        </>
      )}

      {/* ── Step 2: Config Form ── */}
      {step === 'config' && (
        <>
          {!isEdit && (
            <button className="cp-back-btn" onClick={() => setStep('pick')}>
              <ChevronLeft size={14} /> Back
            </button>
          )}

          {/* Source label */}
          <div className="cp-source-badge-row">
            <def.Icon size={16} />
            <span className="cp-source-badge-name">{def.label}</span>
          </div>

          {/* Name field */}
          <div className="cp-form-section">
            <label className="cp-form-label" htmlFor="ds-name">Name</label>
            <input
              id="ds-name"
              className="cp-input"
              placeholder={`My ${def.label} source`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          {/* ── Manual ── */}
          {sourceType === 'manual' && (
            <div className="cp-form-section">
              <label className="cp-form-label">
                CSV Data <span className="cp-muted">— first row is headers</span>
              </label>
              <textarea
                className="cp-textarea"
                rows={10}
                placeholder={MANUAL_PLACEHOLDER}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                spellCheck={false}
              />
              <p className="cp-helper-text" style={{ marginTop: 6 }}>
                Type column headers on the first row separated by commas, then add data rows below.
                Numbers are auto-detected.
              </p>
            </div>
          )}

          {/* ── CSV File ── */}
          {sourceType === 'csv' && (
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
                ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
              {csvText && (
                <textarea
                  className="cp-textarea" rows={6} value={csvText}
                  onChange={(e) => setCsvText(e.target.value)} spellCheck={false}
                  style={{ marginTop: 8 }}
                />
              )}
            </div>
          )}

          {/* ── API-based sources ── */}
          {def.category === 'api' && (
            <>
              {/* URL */}
              <div className="cp-form-section">
                <label className="cp-form-label" htmlFor="api-url">Endpoint URL</label>
                <input
                  id="api-url"
                  className="cp-input"
                  placeholder={def.urlPlaceholder ?? 'https://api.example.com/data'}
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                />
                {def.urlHint && (
                  <p className="cp-helper-text" style={{ marginTop: 6 }}>
                    <Info size={12} style={{ display: 'inline', marginRight: 4 }} />
                    {def.urlHint}
                    {def.sampleEndpoint && (
                      <code className="cp-inline-code"> e.g. {def.sampleEndpoint}</code>
                    )}
                  </p>
                )}
              </div>

              {/* Auth */}
              <div className="cp-form-section">
                <label className="cp-form-label">Authentication</label>
                <div className="cp-auth-type-row">
                  {AUTH_TYPES.map((a) => (
                    <button
                      key={a.id}
                      className={`cp-auth-type-btn${authType === a.id ? ' active' : ''}`}
                      onClick={() => setAuthType(a.id)}
                      title={a.hint}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
                {def.authHint && (
                  <p className="cp-helper-text" style={{ marginTop: 6 }}>
                    <Info size={12} style={{ display: 'inline', marginRight: 4 }} />
                    {def.authHint}
                  </p>
                )}

                {authType === 'bearer' && (
                  <div style={{ marginTop: 10 }}>
                    <label className="cp-form-label">Access Token</label>
                    <input
                      className="cp-input cp-monospace"
                      placeholder="eyJhbGciOiJSUzI1NiIs..."
                      value={bearerToken}
                      onChange={(e) => setBearerToken(e.target.value)}
                    />
                    <p className="cp-helper-text" style={{ marginTop: 4 }}>
                      Paste a valid OAuth 2.0 Bearer token. You can obtain one from Postman,
                      the Azure Portal, or your identity provider's token endpoint.
                    </p>
                  </div>
                )}

                {authType === 'basic' && (
                  <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <label className="cp-form-label">Username</label>
                      <input className="cp-input" placeholder="user@example.com"
                        value={basicUser} onChange={(e) => setBasicUser(e.target.value)} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label className="cp-form-label">Password</label>
                      <input className="cp-input" type="password" placeholder="••••••••"
                        value={basicPass} onChange={(e) => setBasicPass(e.target.value)} />
                    </div>
                  </div>
                )}

                {authType === 'apikey' && (
                  <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                    <div style={{ flex: '0 0 180px' }}>
                      <label className="cp-form-label">Header Name</label>
                      <input className="cp-input" placeholder="X-API-Key"
                        value={apiKeyHeader} onChange={(e) => setApiKeyHeader(e.target.value)} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label className="cp-form-label">Key Value</label>
                      <input className="cp-input cp-monospace" placeholder="sk-..."
                        value={apiKeyValue} onChange={(e) => setApiKeyValue(e.target.value)} />
                    </div>
                  </div>
                )}
              </div>

              {/* Custom Headers */}
              <div className="cp-form-section">
                <div className="cp-form-label-row">
                  <label className="cp-form-label" style={{ marginBottom: 0 }}>
                    Custom Headers <span className="cp-muted">(optional)</span>
                  </label>
                  <button className="cp-btn cp-btn-sm" onClick={addHeader}>
                    <Plus size={12} /> Add Header
                  </button>
                </div>
                {customHeaders.length === 0 && (
                  <p className="cp-helper-text" style={{ marginTop: 4 }}>
                    Add extra headers like <code className="cp-inline-code">Content-Type</code>,
                    {' '}<code className="cp-inline-code">OData-MaxVersion</code>, etc.
                  </p>
                )}
                {customHeaders.map((hdr, i) => (
                  <div key={i} className="cp-header-row">
                    <input
                      className="cp-input"
                      placeholder="Header-Name"
                      value={hdr.key}
                      onChange={(e) => updateHeader(i, 'key', e.target.value)}
                      style={{ flex: '0 0 190px' }}
                    />
                    <input
                      className="cp-input"
                      placeholder="value"
                      value={hdr.value}
                      onChange={(e) => updateHeader(i, 'value', e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <button className="cp-icon-btn danger" onClick={() => removeHeader(i)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Fetch / Test */}
              <div className="cp-form-section">
                <div className="cp-form-label-row">
                  <label className="cp-form-label" style={{ marginBottom: 0 }}>
                    Send Request
                  </label>
                  <button
                    className="cp-btn primary cp-btn-sm"
                    style={{ marginTop: 0 }}
                    onClick={handleFetch}
                    disabled={!apiUrl.trim() || fetching}
                  >
                    <Plug size={12} />
                    {fetching ? 'Sending…' : 'Send & Preview'}
                  </button>
                </div>
                <p className="cp-helper-text" style={{ marginTop: 4 }}>
                  Attempts to call the endpoint directly from your browser.
                  Many APIs block browser requests via CORS — if this fails,
                  paste the JSON response manually in the field below.
                </p>
                {fetchError && (
                  <p className="cp-error" style={{ marginTop: 6 }}>
                    ⚠ {fetchError}
                  </p>
                )}
                {fetchPreview && (
                  <pre className="cp-code-preview" style={{ marginTop: 8 }}>{fetchPreview}</pre>
                )}
              </div>

              {/* Paste JSON */}
              <div className="cp-form-section">
                <label className="cp-form-label">
                  Paste API Response JSON
                  <span className="cp-muted"> — required to load data</span>
                </label>
                <textarea
                  className="cp-textarea"
                  rows={8}
                  placeholder={
                    'Paste the JSON response from your API call here.\n\nAccepted formats:\n' +
                    '• OData envelope:  { "value": [ { ... }, ... ] }\n' +
                    '• Plain JSON array: [ { ... }, ... ]'
                  }
                  value={pastedJson}
                  onChange={(e) => setPastedJson(e.target.value)}
                  spellCheck={false}
                />
                <p className="cp-helper-text" style={{ marginTop: 6 }}>
                  Use Postman, Graph Explorer, or Power Automate to fetch authenticated data,
                  then copy and paste the full JSON response above.
                  OData metadata keys (starting with <code className="cp-inline-code">@</code>) are
                  automatically excluded.
                </p>
              </div>
            </>
          )}

          <div className="cp-modal-footer">
            <button className="cp-btn" onClick={onClose}>Cancel</button>
            <button className="cp-btn primary" onClick={handleSave}>
              {isEdit ? 'Save Changes' : 'Add Source'}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function serializeApiRows(columns: string[], rows: DataRow[]): string {
  if (columns.length === 0) return '';
  const records = rows.map((row) => {
    const obj: Record<string, string | number> = {};
    for (const col of columns) obj[col] = row[col] ?? '';
    return obj;
  });
  return JSON.stringify({ value: records }, null, 2);
}
