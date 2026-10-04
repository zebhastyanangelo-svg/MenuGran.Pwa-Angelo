/**
 * Base de conocimiento del botón de soporte.
 *
 * Todo el contenido vive en el bundle: el widget funciona sin red y sin
 * enviar la conversación a ningún proveedor externo. Cada artículo responde
 * un problema real del flujo de la app (pedidos, delivery, menú, pagos,
 * cuenta y notificaciones).
 */

export type SupportCategoryId =
  | 'orders'
  | 'delivery'
  | 'menu'
  | 'payments'
  | 'account'
  | 'notifications';

export interface SupportCategory {
  id: SupportCategoryId;
  label: string;
  description: string;
}

export interface SupportArticle {
  id: string;
  categoryId: SupportCategoryId;
  question: string;
  /** Respuesta en texto plano; los saltos de línea se preservan en la UI. */
  answer: string;
  /** Sinónimos y términos que el usuario escribiría pero no aparecen en la pregunta. */
  keywords: readonly string[];
  /** Ids de artículos relacionados para navegación cruzada. */
  relatedIds?: readonly string[];
}

/** Opción de un paso del flujo guiado. */
export interface SupportFlowOption {
  id: string;
  label: string;
  /** Id del siguiente paso. Si falta, el flujo termina en un artículo. */
  nextStepId?: string;
  /** Artículo donde desemboca la opción. */
  articleId?: string;
}

export interface SupportFlowStep {
  question: string;
  options: readonly SupportFlowOption[];
}

export interface SupportFlow {
  id: string;
  entryStepId: string;
  steps: Readonly<Record<string, SupportFlowStep>>;
}

export const SUPPORT_CATEGORIES: readonly SupportCategory[] = [
  {
    id: 'orders',
    label: 'Mis pedidos',
    description: 'Seguimiento, cancelación y pagos de un pedido',
  },
  {
    id: 'delivery',
    label: 'Entregas',
    description: 'Repartidores, tiempos y direcciones',
  },
  {
    id: 'menu',
    label: 'Mi menú',
    description: 'Productos, precios, fotos y disponibilidad',
  },
  {
    id: 'payments',
    label: 'Pagos',
    description: 'Pago móvil, efectivo y comprobantes',
  },
  {
    id: 'account',
    label: 'Mi cuenta',
    description: 'Acceso, perfil y datos personales',
  },
  {
    id: 'notifications',
    label: 'Notificaciones',
    description: 'Avisos de pedidos y permisos del teléfono',
  },
];

export const SUPPORT_ARTICLES: readonly SupportArticle[] = [
  {
    id: 'order-status',
    categoryId: 'orders',
    question: '¿Cómo sé en qué estado está mi pedido?',
    answer:
      'Abre "Mis pedidos" y selecciona el pedido activo. La pantalla de seguimiento te muestra el estado en tiempo real:\n\n' +
      '• Confirmado: el comercio aceptó tu pedido.\n' +
      '• En preparación: están armando tu pedido.\n' +
      '• Listo: ya puedes pasar a retirarlo o está por salir.\n' +
      '• En camino: el repartidor va hacia ti.\n' +
      '• Entregado: puedes calificarlo.\n\n' +
      'Si el estado no cambia en mucho rato, revisa el punto 2 de esta lista.',
    keywords: ['seguimiento', 'estado', 'rastrear', 'pedido', 'activo', 'donde esta'],
    relatedIds: ['order-stuck', 'delivery-no-show'],
  },
  {
    id: 'order-stuck',
    categoryId: 'orders',
    question: 'Mi pedido lleva mucho sin moverse. ¿Qué hago?',
    answer:
      'Primero confirma que el comercio esté abierto en "Horarios": si marca "Cerrado", el pedido no avanzará.\n\n' +
      'Si sigue abierto:\n' +
      '1. Espera unos minutos: en hora pico la preparación se demora.\n' +
      '2. Revisa si el pago quedó aprobado en la sección de pagos.\n' +
      '3. Si el estado no cambia en más de 30 minutos, contacta al comercio desde la ficha del pedido.\n\n' +
      'Si el pago quedó pendiente, cancélalo y vuelve a pedir: así el comercio lo recibe de inmediato.',
    keywords: ['atrasado', 'demora', 'no avanza', 'espera', 'lento', 'retraso'],
    relatedIds: ['order-status', 'payment-pending'],
  },
  {
    id: 'order-cancel',
    categoryId: 'orders',
    question: '¿Puedo cancelar un pedido?',
    answer:
      'Sí, mientras el comercio no lo marque como "En preparación". Ve a "Mis pedidos", abre el pedido y pulsa "Cancelar pedido".\n\n' +
      '• Si el estado es Confirmado o En preparación, el comercio puede rechazar la cancelación.\n' +
      '• Si ya está "En camino", la cancelación no está disponible: contacta al repartidor.\n\n' +
      'El importe se devuelve al mismo método de pago con el que pagaste.',
    keywords: ['cancelar', 'anular', 'devolver', 'reembolsar'],
    relatedIds: ['payment-refund'],
  },
  {
    id: 'delivery-no-show',
    categoryId: 'delivery',
    question: 'El repartidor no llega o no me contacta',
    answer:
      'Revisa en la pantalla de seguimiento si aparece un teléfono del repartidor: llámalo directamente.\n\n' +
      'Si no hay teléfono o no responde:\n' +
      '1. Comprueba que tu dirección y tu número estén bien guardados en tu perfil.\n' +
      '2. Espera 10 minutos más: a veces el repartidor está resolviendo otro pedido.\n' +
      '3. Si pasa de 30 minutos, marca el pedido como "No pude recibirlo" desde "Mis pedidos".\n\n' +
      'El pago se libera sólo cuando confirmas que recibiste el pedido, así que no te cobrarán de más.',
    keywords: ['repartidor', 'no llega', 'no vino', 'perdido', 'contacto', 'telefono', 'driver'],
    relatedIds: ['order-status', 'delivery-address'],
  },
  {
    id: 'delivery-address',
    categoryId: 'delivery',
    question: 'Puse mal mi dirección. ¿Cómo la corrijo?',
    answer:
      'Ve a "Mi perfil" y actualiza la dirección en el mapa. Hazlo antes de que el pedido pase a "En camino".\n\n' +
      'Si el pedido ya salió, el cambio puede no aplicarse: en ese caso deja una nota en el chat con el repartidor y verifica el punto de referencia más cercano (por ejemplo, una Farmacia o un semáforo).',
    keywords: ['direccion', 'ubicacion', 'mapa', 'referencia', 'cambiar'],
    relatedIds: ['delivery-no-show'],
  },
  {
    id: 'delivery-fee',
    categoryId: 'delivery',
    question: '¿Por qué me cobran distinto el delivery?',
    answer:
      'El costo de entrega depende de la distancia entre el comercio y tu dirección, y cada comercio puede fijar su propia tarifa.\n\n' +
      'Por eso el total puede cambiar entre un pedido y otro aunque el menú sea el mismo. El desglose se ve antes de confirmar el pago, en el resumen del checkout.',
    keywords: ['envio', 'delivery', 'tarifa', 'costo', 'precio', 'cuanto'],
    relatedIds: [],
  },
  {
    id: 'menu-edit-product',
    categoryId: 'menu',
    question: '¿Cómo agrego o edito un producto en mi menú?',
    answer:
      'Desde el panel del comercio:\n\n' +
      '1. Entra a "Productos" en el menú lateral.\n' +
      '2. Pulsa "Nuevo producto" y escribe nombre, descripción y precio.\n' +
      '3. Sube una foto clara: es lo primero que ve el cliente.\n' +
      '4. Guarda y marca el producto como disponible.\n\n' +
      'Un producto con foto y descripción tiene muchas más probabilidades de venderse.',
    keywords: ['producto', 'agregar', 'crear', 'editar', 'plato', 'menu', 'nuevo'],
    relatedIds: ['menu-availability'],
  },
  {
    id: 'menu-availability',
    categoryId: 'menu',
    question: '¿Cómo oculto un producto que ya no tengo?',
    answer:
      'En "Productos", busca el producto y desactiva el interruptor "Disponible". El cliente deja de verlo al instante, sin borrar nada.\n\n' +
      'Volver a activarlo lo muestra de nuevo. Esta es la opción recomendada frente a eliminar, porque conserva las reseñas y el historial del producto.',
    keywords: ['ocultar', 'quitar', 'agotado', 'agotado', 'disponible', 'sin stock', 'no tengo'],
    relatedIds: ['menu-edit-product'],
  },
  {
    id: 'payment-pending',
    categoryId: 'payments',
    question: 'Mi pago quedó pendiente. ¿Qué hago?',
    answer:
      'Un pago pendiente significa que el comercio todavía no confirmó la recepción del dinero, así que el pedido aún no entra en su cola.\n\n' +
      '1. Verifica que transferiste al comercio correcto (banco, teléfono y monto).\n' +
      '2. Sube el comprobante desde "Mis pedidos" para que el comercio lo valide.\n' +
      '3. Espera la confirmación: suele tardar menos de 10 minutos.\n\n' +
      'Si tras 30 minutos sigue pendiente, cancela el pedido y contacta al comercio para que te devuelva el dinero.',
    keywords: ['pago', 'pendiente', 'no se confirma', 'transferencia', 'pago movil', 'comprobante'],
    relatedIds: ['payment-refund', 'order-stuck'],
  },
  {
    id: 'payment-refund',
    categoryId: 'payments',
    question: '¿Cuándo me devuelven el dinero?',
    answer:
      'El reembolso depende de en qué punto estaba el pedido:\n\n' +
      '• Cancelado antes de preparar: el comercio devuelve el importe completo.\n' +
      '• Cancelado con el pedido en camino: el repartidor debe devolver el dinero, porque el pago se libera al confirmar la entrega.\n\n' +
      'Los tiempos dependen del método: pago móvil y zelle suelen ser inmediatos; efectivo se resuelve contra el repartidor.',
    keywords: ['devolucion', 'reembolso', 'devolver', 'dinero', 'reintegro', 'cancelado'],
    relatedIds: ['order-cancel', 'payment-pending'],
  },
  {
    id: 'account-login',
    categoryId: 'account',
    question: 'No puedo entrar a mi cuenta',
    answer:
      'Prueba en este orden:\n\n' +
      '1. Verifica el correo con el que te registraste.\n' +
      '2. Si usas "Continuar con Google", entra por el botón de Google y no con contraseña.\n' +
      '3. Usa "¿Olvidaste tu contraseña?" para recibir un enlace por correo.\n\n' +
      'Si el correo nunca llega, revisa la carpeta de spam. Y confirma que aceptaste los Términos y la Política de Privacidad al registrarte.',
    keywords: ['login', 'entrar', 'password', 'contrasena', 'acceso', 'no puedo entrar', 'sesion'],
    relatedIds: ['account-email'],
  },
  {
    id: 'account-email',
    categoryId: 'account',
    question: 'No recibo los correos de MenuGran',
    answer:
      'Los correos de confirmación y avisos van al correo con el que te registraste.\n\n' +
      '• Revisa spam o correo no deseado.\n' +
      '• Agrega el dominio de MenuGran a tus remitentes seguros.\n' +
      '• Si cambiaste de correo, actualízalo en "Mi perfil".\n\n' +
      'Puedes pedir un nuevo enlace de confirmación desde la pantalla de registro.',
    keywords: ['correo', 'email', 'no llega', 'confirmacion', 'spam', 'mensaje'],
    relatedIds: ['account-login'],
  },
  {
    id: 'notifications-permission',
    categoryId: 'notifications',
    question: 'No me llegan las notificaciones',
    answer:
      'Revisa en este orden:\n\n' +
      '1. En tu teléfono, abre los ajustes de MenuGran y activa las notificaciones.\n' +
      '2. En "Mi perfil" verifica que la opción "Notificaciones push" esté activada.\n' +
      '3. Si cambiaste de teléfono o reinstalaste la app, vuelve a activar las notificaciones: la suscripción anterior dejó de existir.\n\n' +
      'También puedes enviarte una notificación de prueba desde "Mi perfil" para comprobar que todo funciona.',
    keywords: ['notificaciones', 'avisos', 'no me llegan', 'push', 'permiso', 'alertas'],
    relatedIds: [],
  },
  {
    id: 'notifications-permissions',
    categoryId: 'notifications',
    question: '¿Cómo activo las notificaciones por primera vez?',
    answer:
      'Al entrar por primera vez te mostramos un aviso para pedirte permiso. Si lo cerraste sin decidir, puedes reactivarlo:\n\n' +
      '1. Ve a "Mi perfil" > "Notificaciones push".\n' +
      '2. Pulsa "Activar notificaciones" y acepta el permiso del navegador.\n' +
      '3. Si el navegador ya lo bloqueó, tendrás que habilitarlo desde los ajustes del navegador para este sitio.',
    keywords: ['activar', 'permiso', 'push', 'suscribir', 'avisos', 'notificaciones'],
    relatedIds: ['notifications-permission'],
  },
];

/**
 * Flujo guiado: sirve de triage cuando el usuario no sabe qué artículo le
 * sirve. Cada paso ofrece opciones; las hojas desembocan en un artículo.
 */
export const SUPPORT_FLOW: SupportFlow = {
  id: 'triage',
  entryStepId: 'start',
  steps: {
    start: {
      question: '¿Sobre qué necesitas ayuda?',
      options: [
        { id: 'o1', label: 'Un pedido que no llega o no avanza', nextStepId: 'order_state' },
        { id: 'o2', label: 'Un problema con el delivery', nextStepId: 'delivery_state' },
        { id: 'o3', label: 'Configurar el menú de mi comercio', nextStepId: 'menu_state' },
        { id: 'o4', label: 'Un pago o un reembolso', nextStepId: 'payment_state' },
        { id: 'o5', label: 'Mi cuenta o mis datos', articleId: 'account-login' },
      ],
    },
    order_state: {
      question: '¿En qué punto está el pedido?',
      options: [
        { id: 'o1', label: 'Nunca llegó a confirmarse', articleId: 'payment-pending' },
        { id: 'o2', label: 'Está confirmado pero no avanza', articleId: 'order-stuck' },
        { id: 'o3', label: 'Está en camino', articleId: 'delivery-no-show' },
        { id: 'o4', label: 'Ya fue entregado', articleId: 'order-status' },
      ],
    },
    delivery_state: {
      question: '¿Qué ocurre con la entrega?',
      options: [
        { id: 'o1', label: 'El repartidor no llega', articleId: 'delivery-no-show' },
        { id: 'o2', label: 'Puse mal la dirección', articleId: 'delivery-address' },
        { id: 'o3', label: 'Quiero saber cuánto cuesta', articleId: 'delivery-fee' },
      ],
    },
    menu_state: {
      question: '¿Qué quieres hacer con el menú?',
      options: [
        { id: 'o1', label: 'Agregar o editar un producto', articleId: 'menu-edit-product' },
        { id: 'o2', label: 'Ocultar un producto que no tengo', articleId: 'menu-availability' },
      ],
    },
    payment_state: {
      question: '¿Cuál es el problema con el pago?',
      options: [
        { id: 'o1', label: 'Quedó pendiente', articleId: 'payment-pending' },
        { id: 'o2', label: 'Quiero que me devuelvan el dinero', articleId: 'payment-refund' },
        { id: 'o3', label: 'Quiero cancelar el pedido', articleId: 'order-cancel' },
      ],
    },
  },
};