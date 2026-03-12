import type { PropsWithChildren } from 'react';
import { useEffect } from 'react';
import { X } from 'lucide-react';

type ModalProps = PropsWithChildren<{
  title: string;
  onClose: () => void;
  width?: number;
}>;

export default function Modal({ title, onClose, width = 520, children }: ModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="cp-modal-backdrop" onClick={onClose}>
      <div
        className="cp-modal"
        style={{ width }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal
        aria-label={title}
      >
        <div className="cp-modal-header">
          <span className="cp-modal-title">{title}</span>
          <button className="cp-icon-btn" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className="cp-modal-body">{children}</div>
      </div>
    </div>
  );
}
