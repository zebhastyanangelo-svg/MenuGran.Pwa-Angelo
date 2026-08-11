import { createContext, useContext, useCallback, useState, type ReactNode } from 'react';

export type ToastVariant = 'info' | 'success' | 'warning' | 'error';

export interface ToastData {
  id: string;
  title: string;
  message: string;
  variant: ToastVariant;
  durationMs: number;
}

export interface ToastOptions {
  title: string;
  message: string;
  variant?: ToastVariant;
  durationMs?: number;
}

interface NotificationToastContextValue {
  showToast: (options: ToastOptions) => string;
  hideToast: (id: string) => void;
  toasts: ToastData[];
}

const NotificationToastContext = createContext<NotificationToastContextValue | null>(null);

const VARIANT_STYLES: Record<ToastVariant, { bg: string; border: string; icon: ReactNode }> = {
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-500',
    icon: (
      <svg className="w-5 h-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M18 10A8 8 0 11-8 10a8 8 0 0116 0zM7 8a1 1 0 01-2 0 1 1 0 012 0zM8 13a1 1 0 01-1-1V8a1 1 0 012 0v4a1 1 0 01-1 1z" clipRule="evenodd" />
      </svg>
    ),
  },
  success: {
    bg: 'bg-green-50',
    border: 'border-green-500',
    icon: (
      <svg className="w-5 h-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16l3.732-3.732L16 16l-6-6V7.414l1.293-1.293a1 1 0 011.414 0L16 10.586l3.732 3.732L20 10a10 10 0 11-10-10z" clipRule="evenodd" />
      </svg>
    ),
  },
  warning: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-500',
    icon: (
      <svg className="w-5 h-5 text-yellow-600" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.235-1.36 3 0l8.5 14.25c.79.94.163 2.651-1 2.651H4.25c-1.163 0-1.79-.711-1-2.651L8.257 3.1A1.75 1.75 0 018.257 3.1z" clipRule="evenodd" />
      </svg>
    ),
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-500',
    icon: (
      <svg className="w-5 h-5 text-red-600" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 011.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
      </svg>
    ),
  },
};

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

export function useNotificationToast(): NotificationToastContextValue {
  const context = useContext(NotificationToastContext);
  if (context === null) {
    throw new Error('useNotificationToast debe usarse dentro de un NotificationToastProvider');
  }
  return context;
}

export function NotificationToastList() {
  const { toasts, hideToast } = useNotificationToast();

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-20 right-4 z-[100] flex flex-col gap-3 w-full max-w-sm pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onClose={() => hideToast(toast.id)}
        />
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
      className={`${bg} border-l-4 ${border} shadow-lg rounded-lg p-4 animate-in slide-in-from-right-full pointer-events-auto`}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">{icon}</div>
        <div className="ml-3 w-0 flex-1">
          <p className="text-sm font-medium text-gray-900">{toast.title}</p>
          <p className="mt-1 text-sm text-gray-600">{toast.message}</p>
        </div>
        <div className="ml-4 flex-shrink-0 flex items-start">
          <button
            onClick={onClose}
            className="inline-flex rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
          >
            <span className="sr-only">Cerrar notificación</span>
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 011.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
