import { BarChart3 } from 'lucide-react';

export default function DashboardView() {
  return (
    <div className="cp-empty-state">
      <BarChart3 size={48} className="cp-empty-icon" />
      <h2>Dashboard Canvas</h2>
      <p className="cp-muted">Drag widgets from the palette to build your dashboard.</p>
    </div>
  );
}
