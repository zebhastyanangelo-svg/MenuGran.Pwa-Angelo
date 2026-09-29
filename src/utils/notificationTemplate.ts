/**
 * Utilidades para plantillas de notificaciones push.
 *
 * Las plantillas aceptan variables dinámicas que la Edge Function
 * `send-push-notification` reemplaza por usuario antes de enviar el push:
 *  - {full_name}: nombre completo del usuario.
 *  - {nombre}: primer nombre del usuario (más cercano y personal).
 *  - {first_name}: alias de {nombre}.
 *
 * La misma lógica se replica en el backend (Edge Function) para que la
 * vista previa del panel de SuperAdmin coincida con el envío real.
 */

/** Variables dinámicas soportadas en las plantillas de notificación. */
export const TEMPLATE_VARIABLES = ['{full_name}', '{nombre}', '{first_name}'] as const;

/** Nombre de respaldo cuando el usuario no tiene nombre registrado. */
const FALLBACK_NAME = 'cliente';

/**
 * Reemplaza las variables dinámicas de una plantilla con el nombre del usuario.
 *
 * @param template Texto de la plantilla (título o cuerpo del mensaje).
 * @param fullName Nombre completo del usuario (puede ser null).
 * @returns Texto con las variables reemplazadas.
 */
export function replaceTemplateVariables(template: string, fullName: string | null): string {
  const name = (fullName ?? '').trim() || FALLBACK_NAME;
  const firstName = name.split(/\s+/)[0];

  return template
    .replaceAll('{full_name}', name)
    .replaceAll('{nombre}', firstName)
    .replaceAll('{first_name}', firstName);
}
