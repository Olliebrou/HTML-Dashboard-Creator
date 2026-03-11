import { Undo2, Redo2, Play, Download, Upload, PanelRightOpen, PanelRightClose, Sun, Moon } from 'lucide-react';
import { useState } from 'react';

type TopBarProps = {
  title: string;
  onTitleChange: (value: string) => void;
  rightPanelOpen: boolean;
  onTogglePanel: () => void;
};

export default function TopBar({ title, onTitleChange, rightPanelOpen, onTogglePanel }: TopBarProps) {
  const [dark, setDark] = useState(true);

  const toggleTheme = () => {
    setDark((d) => !d);
    document.documentElement.setAttribute('data-theme', dark ? 'light' : 'dark');
  };

  return (
    <header className="cp-topbar">
      <div className="cp-topbar-left">
        <input
          className="cp-title-input"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          aria-label="Dashboard title"
        />
      </div>

      <div className="cp-topbar-center">
        <button className="cp-icon-btn" title="Undo"><Undo2 size={16} /></button>
        <button className="cp-icon-btn" title="Redo"><Redo2 size={16} /></button>
        <span className="cp-topbar-divider" />
        <button className="cp-icon-btn accent" title="Preview"><Play size={16} /></button>
      </div>

      <div className="cp-topbar-right">
        <button className="cp-icon-btn" title="Import"><Upload size={16} /></button>
        <button className="cp-icon-btn" title="Export"><Download size={16} /></button>
        <span className="cp-topbar-divider" />
        <button className="cp-icon-btn" title="Toggle theme" onClick={toggleTheme}>
          {dark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <button className="cp-icon-btn" title="Toggle properties panel" onClick={onTogglePanel}>
          {rightPanelOpen ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
        </button>
      </div>
    </header>
  );
}
