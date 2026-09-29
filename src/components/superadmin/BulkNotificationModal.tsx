import { useState } from 'react';
import { Loader2, Send, X } from 'lucide-react';
import {
  sendBulkPushNotification,
  type SendPushResult,
} from '../../services/pushNotificationService';
import { replaceTemplateVariables } from '../../utils/notificationTemplate';

interface BulkNotificationModalProps {
  onClose: () => void;
}

/** Nombre de ejemplo usado en la vista previa de las variables dinámicas. */
const PREVIEW_SAMPLE_NAME = 'María Pérez';

/**
 * Modal interactivo del SuperAdmin para enviar una notificación push masiva
 * a todos los clientes suscritos. Soporta variables dinámicas ({nombre},
 * {full_name}, {first_name}) con vista previa en tiempo real.
 */
export function BulkNotificationModal({ onClose }: BulkNotificationModalProps) {
  const [title, setTitle] = useState('MenuGram');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SendPushResult | null>(null);

  const canSend = title.trim().length > 0 && body.trim().length > 0 && !sending;
  const previewTitle = replaceTemplateVariables(title, PREVIEW_SAMPLE_NAME);
  const previewBody = replaceTemplateVariables(body, PREVIEW_SAMPLE_NAME);

  const handleSend = async () => {
    if (!canSend) return;
    setSending(true);
    setResult(null);

    const response = await sendBulkPushNotification(title.trim(), body.trim());

    setResult(response);
    setSending(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-notification-title"
    >
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" aria-hidden="true" onClick={onClose} />

        <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 id="bulk-notification-title" className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <Send className="h-5 w-5 text-brand-red" aria-hidden="true" />
                Enviar Notificación Masiva a Clientes
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Se enviará a todos los clientes con notificaciones activas.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-600">Título del mensaje</span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={80}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-base font-semibold text-slate-900 outline-none transition focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
                placeholder="Ej. Promo especial de hoy"
              />
              <span className="mt-1 block text-xs text-slate-400">
                Puedes usar variables dinámicas: {'{nombre}'}, {'{full_name}'} o {'{first_name}'}.
              </span>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-600">Cuerpo del mensaje</span>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                maxLength={500}
                className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-base text-slate-900 outline-none transition focus:border-brand-red focus:ring-2 focus:ring-brand-red/20"
                placeholder="Ej. ¡Hola {nombre}! Hoy tenemos 2x1 en hamburguesas 🍔"
              />
            </label>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Vista previa
              </p>
              <p className="text-sm font-bold text-slate-900">{previewTitle}</p>
              <p className="text-sm text-slate-600">{previewBody}</p>
            </div>

            {result !== null && result.ok && (
              <p role="status" className="rounded-lg bg-green-50 px-4 py-2 text-sm font-medium text-green-700">
                Notificación enviada: {result.summary.sent} entregadas de {result.summary.total}{' '}
                suscripciones ({result.summary.deactivated} desactivadas por caducar).
              </p>
            )}
            {result !== null && !result.ok && (
              <p role="alert" className="rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-700">
                {result.message}
              </p>
            )}
          </div>

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={sending}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-base font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-red focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={!canSend}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-red px-4 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-[#c80024] focus:outline-none focus:ring-2 focus:ring-brand-red focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {sending ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="h-5 w-5" aria-hidden="true" />
              )}
              {sending ? 'Enviando...' : 'Enviar Notificación a Todos'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
