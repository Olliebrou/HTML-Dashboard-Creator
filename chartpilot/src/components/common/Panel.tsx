import type { PropsWithChildren } from 'react';

type PanelProps = PropsWithChildren<{
  title?: string;
  className?: string;
}>;

export default function Panel({ title, children, className = '' }: PanelProps) {
  return (
    <section className={`cp-panel ${className}`}>
      {title && <header className="cp-panel-header">{title}</header>}
      <div className="cp-panel-body">{children}</div>
    </section>
  );
}
