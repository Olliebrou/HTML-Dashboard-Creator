import { useEffect, useRef, useState } from 'react';
import GridLayout from 'react-grid-layout';
import type { Layout, LayoutItem } from 'react-grid-layout';
import { Plus } from 'lucide-react';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { useShallow } from 'zustand/react/shallow';
import { useDashboardStore } from '../../stores/dashboardStore';
import { useUiStore } from '../../stores/uiStore';
import WidgetCard from '../widgets/WidgetCard';
import AddWidgetModal from '../modals/AddWidgetModal';

export default function DashboardView() {
  const { widgets, dataSources, updateLayouts } = useDashboardStore(
    useShallow((s) => ({
      widgets: s.widgets,
      dataSources: s.dataSources,
      updateLayouts: s.updateLayouts,
    })),
  );
  const { selectWidget } = useUiStore();

  const [showAdd, setShowAdd] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [gridWidth, setGridWidth] = useState(900);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => {
      setGridWidth(entry.contentRect.width);
    });
    obs.observe(el);
    setGridWidth(el.clientWidth);
    return () => obs.disconnect();
  }, []);

  const rglLayout: LayoutItem[] = widgets.map((w) => ({
    i: w.id,
    x: w.layout.x,
    y: w.layout.y,
    w: w.layout.w,
    h: w.layout.h,
    minW: 2,
    minH: 2,
  }));

  const handleLayoutChange = (newLayout: Layout) => {
    updateLayouts(
      newLayout.map((item) => ({
        id: item.i,
        layout: { x: item.x, y: item.y, w: item.w, h: item.h },
      })),
    );
  };

  if (widgets.length === 0) {
    return (
      <>
        <div
          className="cp-empty-state"
          style={{ height: '100%' }}
          onClick={() => selectWidget(null)}
        >
          <div className="cp-empty-icon" style={{ fontSize: 48, opacity: 0.2 }}>📊</div>
          <h2>Your dashboard is empty</h2>
          <p className="cp-muted">Add your first widget to get started.</p>
          <button className="cp-btn primary" style={{ marginTop: 16 }} onClick={() => setShowAdd(true)}>
            <Plus size={14} /> Add Widget
          </button>
        </div>
        {showAdd && <AddWidgetModal onClose={() => setShowAdd(false)} />}
      </>
    );
  }

  return (
    <div
      ref={containerRef}
      className="cp-dashboard-canvas"
      onClick={(e) => {
        if (e.target === e.currentTarget) selectWidget(null);
      }}
    >
      <div className="cp-canvas-toolbar">
        <button className="cp-btn" onClick={() => setShowAdd(true)}>
          <Plus size={14} /> Add Widget
        </button>
      </div>

      <GridLayout
        className="cp-grid-layout"
        layout={rglLayout}
        gridConfig={{ cols: 12, rowHeight: 100, margin: [12, 12], containerPadding: [0, 0], maxRows: Infinity }}
        dragConfig={{ enabled: true, handle: '.cp-widget-handle' }}
        resizeConfig={{ enabled: true, handles: ['se', 's', 'e'] }}
        width={gridWidth}
        onLayoutChange={handleLayoutChange}
      >
        {widgets.map((w) => (
          <div key={w.id}>
            <WidgetCard widget={w} dataSources={dataSources} />
          </div>
        ))}
      </GridLayout>

      {showAdd && <AddWidgetModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}

