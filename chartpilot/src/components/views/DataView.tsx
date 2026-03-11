import { Database } from 'lucide-react';

export default function DataView() {
  return (
    <div className="cp-empty-state">
      <Database size={48} className="cp-empty-icon" />
      <h2>Data Sources</h2>
      <p className="cp-muted">Connect to APIs and configure data transformations.</p>
      <button className="cp-btn primary">+ Add Data Source</button>
    </div>
  );
}
