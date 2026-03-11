import LeftRail from './LeftRail';
import TopBar from './TopBar';
import PropertiesPanel from './PropertiesPanel';
import DashboardView from '../views/DashboardView';
import DataView from '../views/DataView';
import CodeView from '../views/CodeView';
import { useUiStore } from '../../stores/uiStore';
import { useDashboardStore } from '../../stores/dashboardStore';

export default function AppLayout() {
  const { activeView, setActiveView, rightPanelOpen, toggleRightPanel, sidebarCollapsed } = useUiStore();
  const { meta, setTitle } = useDashboardStore();

  const View = activeView === 'dashboard' ? DashboardView
    : activeView === 'data' ? DataView
    : CodeView;

  return (
    <div className={`cp-app${rightPanelOpen ? '' : ' panel-closed'}`}>
      <LeftRail activeView={activeView} collapsed={sidebarCollapsed} onChange={setActiveView} />
      <div className="cp-main">
        <TopBar
          title={meta.title}
          onTitleChange={setTitle}
          rightPanelOpen={rightPanelOpen}
          onTogglePanel={toggleRightPanel}
        />
        <main className="cp-content">
          <View />
        </main>
      </div>
      {rightPanelOpen && <PropertiesPanel />}
    </div>
  );
}
