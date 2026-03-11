import { Code2 } from 'lucide-react';

export default function CodeView() {
  return (
    <div className="cp-empty-state">
      <Code2 size={48} className="cp-empty-icon" />
      <h2>Code Editor</h2>
      <p className="cp-muted">View and edit your dashboard configuration as JSON.</p>
    </div>
  );
}
