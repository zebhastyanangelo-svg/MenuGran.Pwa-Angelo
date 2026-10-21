import { useState } from 'react';
import { buildTelUrl, buildWhatsAppUrl } from '../../utils/delivery';

/**
 * Datos de contacto de una persona para poder llamarle o escribirle.
 *
 * Se usa en los dos sentidos del reparto: el repartidor contacting al cliente
 * desde la pantalla de navegación y el cliente contactando a su repartidor
 * desde el seguimiento del pedido. El teléfono se muestra escrito además del
 * botón, para que quede claro a quién se llama y para poder marcar a mano.
 */

export interface ContactCardProps {
  /** Título de la tarjeta, p. ej. "Tu repartidor". */
  title: string;
  name: string;
  phone: string | null;
  avatarUrl?: string | null;
  /** `true` para el repartidor, que además puede escribir por WhatsApp. */
  showWhatsApp?: boolean;
  className?: string;
}

function buildMonogram(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

export function ContactCard({
  title,
  name,
  phone,
  avatarUrl = null,
  showWhatsApp = false,
  className = '',
}: ContactCardProps) {
  const telUrl = buildTelUrl(phone);
  const whatsappUrl = buildWhatsAppUrl(phone ?? '');
  const canChat = showWhatsApp && whatsappUrl !== null;
  const [avatarError, setAvatarError] = useState(false);

  return (
    <section
      aria-label={title}
      data-testid="contact-card"
      className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}
    >
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </p>
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-red/10 text-sm font-bold text-brand-red ring-1 ring-brand-red/20">
          {avatarUrl && !avatarError ? (
            <img
              src={avatarUrl}
              alt=""
              onError={() => setAvatarError(true)}
              className="h-full w-full object-cover"
            />
          ) : (
            buildMonogram(name)
          )}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-slate-900" data-testid="contact-name">
            {name}
          </p>
          {phone !== null && phone !== '' && (
            <p className="truncate text-sm text-slate-500" data-testid="contact-phone">
              {phone}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {telUrl !== null && (
            <a
              href={telUrl}
              aria-label={`Llamar a ${name}`}
              data-testid="contact-call-button"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md ring-1 ring-emerald-600/30 transition hover:bg-emerald-600 active:scale-95"
            >
              <i className="fa-solid fa-phone text-lg" aria-hidden="true" />
            </a>
          )}
          {canChat && whatsappUrl !== null && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Escribir a ${name} por WhatsApp`}
              data-testid="contact-whatsapp-button"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-[#25D366] text-white shadow-md ring-1 ring-black/10 transition hover:brightness-95 active:scale-95"
            >
              <i className="fa-brands fa-whatsapp text-xl" aria-hidden="true" />
            </a>
          )}
        </div>
      </div>

      {telUrl === null && (
        <p className="mt-2 text-xs text-slate-400">
          Esta persona todavía no registró un teléfono de contacto.
        </p>
      )}
    </section>
  );
}