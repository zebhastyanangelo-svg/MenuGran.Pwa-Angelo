/**
 * Posicionamiento de los botones flotantes de la esquina inferior derecha
 * (carrito y ayuda).
 *
 * `BottomNav` es `md:hidden`, así que en móvil hay que subir los botones por
 * encima de la barra: si no, el de ayuda queda encima de la pestaña "Perfil" y
 * la deja inutilizable. En escritorio no hay barra inferior, así que vuelven a
 * su sitio cerca del borde.
 *
 * Ambos botones miden 3.5rem (h-14) y se separan 0.75rem, de ahí que el botón
 * superior esté 4.25rem más alto que el inferior.
 */

/** Botón inferior de la pila (ayuda): el más cercano a la barra de navegación. */
export const FLOATING_ACTION_CLASS =
  'fixed right-4 z-40 bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] md:bottom-6';

/** Botón superior de la pila (carrito), 3.5rem + 0.75rem por encima del anterior. */
export const FLOATING_ACTION_STACKED_CLASS =
  'fixed right-4 z-40 bottom-[calc(env(safe-area-inset-bottom)+9rem)] md:bottom-[5.75rem]';

/** Panel de ayuda abierto: también debe quedar por encima de la barra. */
export const FLOATING_PANEL_CLASS =
  'fixed right-4 z-40 bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] md:bottom-6';