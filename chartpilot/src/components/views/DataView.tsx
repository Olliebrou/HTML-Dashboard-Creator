import { useState } from 'react';
import { Database, Plus, Pencil, Trash2, SlidersHorizontal, Share2, LayoutGrid, Cloud, Globe } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useDashboardStore } from '../../stores/dashboardStore';
import AddDataSourceModal from '../modals/AddDataSourceModal';
import TransformModal from '../modals/TransformModal';
import type { DataSource, DataSourceType } from '../../types';

const TYPE_LABELS: Record<DataSourceType, string> = {
  manual: 'Manual',
  csv: 'CSV',
  api: 'Other API',
  dataverse: 'Dataverse',
  graph: 'Graph API',
  sharepoint: 'SharePoint',
  'azure-blob': 'Azure Blob',
};

function TypeIcon({ type }: { type: DataSourceType }) {
  const size = 20;
  switch (type) {
    case 'graph': return <Share2 size={size} />;
    case 'sharepoint': return <LayoutGrid size={size} />;
    case 'azure-blob': return <Cloud size={size} />;
    case 'api': return <Globe size={size} />;
    default: return <Database size={size} />;
  }
}

export default function DataView() {
  const { dataSources, removeDataSource } = useDashboardStore(
    useShallow((s) => ({
      dataSources: s.dataSources,
      removeDataSource: s.removeDataSource,
    })),
  );

  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<DataSource | undefined>(undefined);
  const [transforming, setTransforming] = useState<DataSource | undefined>(undefined);

  const handleEdit = (ds: DataSource) => { setEditing(ds); setShowAdd(true); };
  const handleTransform = (ds: DataSource) => setTransforming(ds);

  const handleCloseModal = () => { setShowAdd(false); setEditing(undefined); };
  const handleCloseTransform = () => setTransforming(undefined);

  if (dataSources.length === 0) {
    return (
      <>
        <div className="cp-empty-state">
          <Database size={48} className="cp-empty-icon" />
          <h2>No Data Sources</h2>
          <p className="cp-muted">Add a data source to power your charts.</p>
          <p className="cp-muted" style={{ maxWidth: 360, marginTop: 4 }}>
            You can connect to Dataverse, Microsoft Graph, SharePoint, Azure Blob Storage,
            or any REST API — or just type/upload CSV data manually.
          </p>
          <button className="cp-btn primary" onClick={() => setShowAdd(true)} style={{ marginTop: 12 }}>
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
        <div>
          <h2 className="cp-section-title" style={{ marginBottom: 4 }}>Data Sources</h2>
          <p className="cp-muted">
            {dataSources.length} source{dataSources.length !== 1 ? 's' : ''} · click
            <strong> Transform</strong> to filter, sort or aggregate data before charting
          </p>
        </div>
        <button className="cp-btn primary" onClick={() => setShowAdd(true)}>
          <Plus size={14} /> Add Source
        </button>
      </div>

      <div className="cp-ds-list">
        {dataSources.map((ds) => {
          const tCount = ds.transforms?.length ?? 0;
          return (
            <div key={ds.id} className="cp-ds-card">
              <div className="cp-ds-icon">
                <TypeIcon type={ds.type} />
              </div>
              <div className="cp-ds-info">
                <div className="cp-ds-name">{ds.name}</div>
                <div className="cp-ds-meta cp-muted">
                  <span className="cp-ds-type-badge">{TYPE_LABELS[ds.type] ?? ds.type}</span>
                  {ds.columns.length > 0 && (
                    <span>{ds.columns.length} columns · {ds.rows.length} rows</span>
                  )}
                  {tCount > 0 && (
                    <span className="cp-transform-count-badge">
                      <SlidersHorizontal size={10} /> {tCount} transform{tCount !== 1 ? 's' : ''}
                    </span>
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
                {ds.columns.length > 0 && (
                  <button
                    className={`cp-icon-btn${tCount > 0 ? ' accent' : ''}`}
                    title="Transform data"
                    onClick={() => handleTransform(ds)}
                  >
                    <SlidersHorizontal size={15} />
                  </button>
                )}
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
          );
        })}
      </div>

      {showAdd && <AddDataSourceModal existing={editing} onClose={handleCloseModal} />}
      {transforming && <TransformModal dataSource={transforming} onClose={handleCloseTransform} />}
    </div>
  );
}
