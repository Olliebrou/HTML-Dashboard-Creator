import { BarChart3, Database, Code2 } from 'lucide-react';
import type { AppView } from '../../types';

const NAV_ITEMS: { id: AppView; label: string; Icon: React.ComponentType<{ size?: number }> }[] = [
  { id: 'dashboard', label: 'Dashboard', Icon: BarChart3 },
  { id: 'data', label: 'Data', Icon: Database },
  { id: 'code', label: 'Code', Icon: Code2 },
];

type LeftRailProps = {
  activeView: AppView;
  collapsed: boolean;
  onChange: (view: AppView) => void;
};

export default function LeftRail({ activeView, collapsed, onChange }: LeftRailProps) {
  return (
    <aside className={`cp-left-rail${collapsed ? ' collapsed' : ''}`}>
      <div className="cp-logo">{collapsed ? 'CP' : 'ChartPilot'}</div>
      <nav className="cp-nav">
        {NAV_ITEMS.map(({ id, label, Icon }) => (
          <button
            key={id}
            className={`cp-rail-item${activeView === id ? ' active' : ''}`}
            onClick={() => onChange(id)}
            title={label}
          >
            <Icon size={18} />
            {!collapsed && <span>{label}</span>}
          </button>
        ))}
      </nav>
    </aside>
  );
}
