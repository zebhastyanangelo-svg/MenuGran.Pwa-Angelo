import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { MouseEvent, ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function Modal({ isOpen, onClose, title, children, footer }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleBackdropClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === dialogRef.current) onClose();
  };

  return createPortal(
    <dialog
      ref={dialogRef}
      aria-label={title}
      onClick={handleBackdropClick}
      className="fixed inset-x-0 bottom-0 m-0 w-full max-w-md rounded-t-2xl bg-white p-0 shadow-xl open:flex open:flex-col sm:inset-0 sm:m-auto sm:max-h-[85vh] sm:rounded-2xl"
    >
      {title && (
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
      <div className="px-4 py-4">{children}</div>
      {footer && <div className="border-t border-gray-100 px-4 py-3">{footer}</div>}
    </dialog>,
    document.body,
  );
}
