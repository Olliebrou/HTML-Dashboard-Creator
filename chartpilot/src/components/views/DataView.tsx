import { useState } from 'react';
import { Database, Plus, Pencil, Trash2 } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useDashboardStore } from '../../stores/dashboardStore';
import AddDataSourceModal from '../modals/AddDataSourceModal';
import type { DataSource } from '../../types';

const TYPE_LABELS: Record<string, string> = {
  manual: 'Manual',
  csv: 'CSV',
  api: 'API',
};

export default function DataView() {
  const { dataSources, removeDataSource } = useDashboardStore(
    useShallow((s) => ({
      dataSources: s.dataSources,
      removeDataSource: s.removeDataSource,
    })),
  );

  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<DataSource | undefined>(undefined);

  const handleEdit = (ds: DataSource) => {
    setEditing(ds);
    setShowAdd(true);
  };

  const handleCloseModal = () => {
    setShowAdd(false);
    setEditing(undefined);
  };

  if (dataSources.length === 0) {
    return (
      <>
        <div className="cp-empty-state">
          <Database size={48} className="cp-empty-icon" />
          <h2>No Data Sources</h2>
          <p className="cp-muted">Add a data source to power your charts.</p>
          <button className="cp-btn primary" onClick={() => setShowAdd(true)}>
            <Plus size={14} /> Add Data Source
          </button>
        </div>
        {showAdd && <AddDataSourceModal existing={editing} onClose={handleCloseModal} />}
      </>
    );
  }

  return (
    <div className="cp-data-view">
      <div className="cp-data-header">
        <h2 className="cp-section-title">Data Sources</h2>
        <button className="cp-btn primary" onClick={() => setShowAdd(true)}>
          <Plus size={14} /> Add Source
        </button>
      </div>

      <div className="cp-ds-list">
        {dataSources.map((ds) => (
          <div key={ds.id} className="cp-ds-card">
            <div className="cp-ds-icon">
              <Database size={20} />
            </div>
            <div className="cp-ds-info">
              <div className="cp-ds-name">{ds.name}</div>
              <div className="cp-ds-meta cp-muted">
                <span className="cp-ds-type-badge">{TYPE_LABELS[ds.type] ?? ds.type}</span>
                {ds.columns.length > 0 && (
                  <span>{ds.columns.length} columns · {ds.rows.length} rows</span>
                )}
                {ds.lastFetched && (
                  <span>Updated {new Date(ds.lastFetched).toLocaleString()}</span>
                )}
              </div>
              {ds.columns.length > 0 && (
                <div className="cp-ds-columns">
                  {ds.columns.slice(0, 8).map((col) => (
                    <span key={col} className="cp-ds-col-chip">{col}</span>
                  ))}
                  {ds.columns.length > 8 && (
                    <span className="cp-ds-col-chip cp-muted">+{ds.columns.length - 8} more</span>
                  )}
                </div>
              )}
            </div>
            <div className="cp-ds-actions">
              <button className="cp-icon-btn" title="Edit" onClick={() => handleEdit(ds)}>
                <Pencil size={15} />
              </button>
              <button
                className="cp-icon-btn danger"
                title="Delete"
                onClick={() => {
                  if (confirm(`Delete data source "${ds.name}"?`)) removeDataSource(ds.id);
                }}
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {showAdd && <AddDataSourceModal existing={editing} onClose={handleCloseModal} />}
    </div>
  );
}

