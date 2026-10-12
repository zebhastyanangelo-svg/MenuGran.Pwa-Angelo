import { useCallback, useState, type ReactNode } from 'react';
import {
  NotificationToastContext,
  VARIANT_STYLES,
  type ToastData,
  type ToastOptions,
} from './notification-toast-context';
import { useNotificationToast } from './useNotificationToast';

let toastCounter = 0;

export function NotificationToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((options: ToastOptions): string => {
    const id = `toast-${toastCounter++}`;
    const toast: ToastData = {
      id,
      title: options.title,
      message: options.message,
      variant: options.variant ?? 'info',
      durationMs: options.durationMs ?? 5000,
    };

    setToasts((prev) => [...prev, toast]);

    if (toast.durationMs > 0) {
      setTimeout(() => {
        hideToast(id);
      }, toast.durationMs);
    }

    return id;
  }, [hideToast]);

  const value = { showToast, hideToast, toasts };

  return (
    <NotificationToastContext.Provider value={value}>
      {children}
    </NotificationToastContext.Provider>
  );
}

export function NotificationToastList() {
  const { toasts, hideToast } = useNotificationToast();

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-20 right-4 z-[100] flex flex-col gap-3 w-full max-w-sm pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => hideToast(toast.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onClose }: { toast: ToastData; onClose: () => void }) {
  const { bg, border, icon } = VARIANT_STYLES[toast.variant];

  return (
    <div
      data-testid={`toast-${toast.id}`}
      data-toast-id={toast.id}
      className={`${bg} border-l-4 ${border} shadow-lg rounded-2xl p-4 animate-in slide-in-from-right-full pointer-events-auto`}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">{icon}</div>
        <div className="ml-3 w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">{toast.title}</p>
          <p className="mt-1 text-sm text-slate-700">{toast.message}</p>
        </div>
        <div className="ml-4 flex-shrink-0 flex items-start">
          <button
            onClick={onClose}
            className="inline-flex rounded-md text-slate-500 hover:text-slate-700 focus:outline-none"
          >
            <span className="sr-only">Cerrar notificación</span>
            <i className="fa-solid fa-xmark text-xl" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
