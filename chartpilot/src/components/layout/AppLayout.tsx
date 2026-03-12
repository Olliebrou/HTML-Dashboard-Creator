import LeftRail from './LeftRail';
import TopBar from './TopBar';
import PropertiesPanel from './PropertiesPanel';
import DashboardView from '../views/DashboardView';
import DataView from '../views/DataView';
import CodeView from '../views/CodeView';
import { useUiStore } from '../../stores/uiStore';
import { useDashboardStore } from '../../stores/dashboardStore';
import { useShallow } from 'zustand/react/shallow';

export default function AppLayout() {
  const {
    activeView,
    setActiveView,
    rightPanelOpen,
    toggleRightPanel,
    sidebarCollapsed,
    previewMode,
  } = useUiStore();
  const { meta, setTitle } = useDashboardStore(
    useShallow((s) => ({ meta: s.meta, setTitle: s.setTitle })),
  );

  const View =
    activeView === 'dashboard' ? DashboardView
    : activeView === 'data' ? DataView
    : CodeView;

  if (previewMode) {
    return (
      <div className="cp-app cp-app-preview">
        <TopBar
          title={meta.title}
          onTitleChange={setTitle}
          rightPanelOpen={rightPanelOpen}
          onTogglePanel={toggleRightPanel}
        />
        <main className="cp-content cp-content-preview">
          <DashboardView />
        </main>
      </div>
    );
  }

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
