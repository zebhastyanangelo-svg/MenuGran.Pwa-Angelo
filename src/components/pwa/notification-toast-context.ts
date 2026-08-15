import { createContext, createElement } from 'react';
import type { ReactNode } from 'react';

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

export interface NotificationToastContextValue {
  showToast: (options: ToastOptions) => string;
  hideToast: (id: string) => void;
  toasts: ToastData[];
}

export const NotificationToastContext = createContext<NotificationToastContextValue | null>(null);

const infoIcon = createElement(
  'svg',
  { className: 'w-5 h-5 text-slate-700', viewBox: '0 0 20 20', fill: 'currentColor' },
  createElement('path', {
    fillRule: 'evenodd',
    d: 'M18 10A8 8 0 11-8 10a8 8 0 0116 0zM7 8a1 1 0 01-2 0 1 1 0 012 0zM8 13a1 1 0 01-1-1V8a1 1 0 012 0v4a1 1 0 01-1 1z',
    clipRule: 'evenodd',
  }),
);

const successIcon = createElement(
  'svg',
  { className: 'w-5 h-5 text-[#B77B00]', viewBox: '0 0 20 20', fill: 'currentColor' },
  createElement('path', {
    fillRule: 'evenodd',
    d: 'M10 18a8 8 0 100-16 8 8 0 000 16zm-1.293-7.293a1 1 0 011.414 0L11.5 12.5l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-2-2a1 1 0 010-1.414z',
    clipRule: 'evenodd',
  }),
);

const warningIcon = createElement(
  'svg',
  { className: 'w-5 h-5 text-[#B77B00]', viewBox: '0 0 20 20', fill: 'currentColor' },
  createElement('path', {
    fillRule: 'evenodd',
    d: 'M8.257 3.099c.765-1.36 2.235-1.36 3 0l8.5 14.25c.79.94.163 2.651-1 2.651H4.25c-1.163 0-1.79-.711-1-2.651L8.257 3.1A1.75 1.75 0 018.257 3.1z',
    clipRule: 'evenodd',
  }),
);

const errorIcon = createElement(
  'svg',
  { className: 'w-5 h-5 text-brand-red', viewBox: '0 0 20 20', fill: 'currentColor' },
  createElement('path', {
    fillRule: 'evenodd',
    d: 'M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 011.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z',
    clipRule: 'evenodd',
  }),
);

export const VARIANT_STYLES: Record<ToastVariant, { bg: string; border: string; icon: ReactNode }> = {
  info: { bg: 'bg-slate-100', border: 'border-slate-500', icon: infoIcon },
  success: { bg: 'bg-amber-50', border: 'border-brand-amber', icon: successIcon },
  warning: { bg: 'bg-amber-50', border: 'border-brand-amber', icon: warningIcon },
  error: { bg: 'bg-red-50', border: 'border-brand-red', icon: errorIcon },
};
