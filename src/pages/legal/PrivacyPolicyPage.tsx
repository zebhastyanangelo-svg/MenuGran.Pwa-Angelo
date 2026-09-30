import { LegalList, LegalPageLayout, LegalSection } from '../../components/legal/LegalPage';

const LAST_UPDATED = '29 de septiembre de 2026';

/**
 * Política de Privacidad de MenuGram: explica qué datos se recopilan
 * (cuenta, pedidos, pagos y ubicación), con qué finalidad, con quién se
 * comparten y cómo ejercer los derechos ARCO.
 */
export function PrivacyPolicyPage() {
  return (
    <LegalPageLayout
      title="Política de Privacidad"
      updatedAt={LAST_UPDATED}
      intro="En MenuGram (menugran.online) tratamos tus datos personales con transparencia y solo para que puedas pedir, vender y recibir comida de forma segura. Esta política explica qué datos recopilamos, cómo los usamos y qué derechos tienes como usuario."
    >
      <LegalSection title="1. Responsable del tratamiento">
        <p>
          MenuGram («nosotros») es la plataforma multi-comercio de menús digitales con
          pedidos en tiempo real y seguimiento de entrega, disponible en{' '}
          <strong>www.menugran.online</strong>. Puedes contactarnos por los canales de
          soporte publicados en la aplicación para cualquier consulta sobre privacidad.
        </p>
      </LegalSection>

      <LegalSection title="2. Datos que recopilamos">
        <LegalList
          items={[
            'Datos de cuenta: nombre, correo electrónico, contraseña (cifrada), C.I. y teléfono que nos entregas al registrarte.',
            'Datos de pedidos: productos, cantidades, precios, método de pago, referencia del comprobante, dirección de entrega y estado del pedido.',
            'Datos de pago: solo la referencia y el comprobante (imagen o PDF) del pago móvil o transferencia. MenuGram nunca solicita ni almacena números de tarjeta bancaria.',
            'Datos de ubicación: coordenadas GPS que compartes voluntariamente al seleccionar tu dirección de entrega en el mapa, usadas para coordinar y rastrear la entrega.',
            'Datos técnicos: identificador de sesión, registro de actividad y métricas agregadas de uso.',
          ]}
        />
      </LegalSection>

      <LegalSection title="3. Cómo procesamos tus datos">
        <p>
          Los datos de <strong>pedidos</strong> se procesan para crear, confirmar, preparar y
          entregar tu solicitud; se comparten con el comercio correspondiente y, si aplica,
          con el repartidor asignado, únicamente para completar la entrega.
        </p>
        <p>
          Los comprobantes de <strong>pago</strong> se almacenan de forma temporal con
          acceso restringido y se eliminan automáticamente después de 30 días, o cuando el
          comercio verifica el pago y el registro ya no es necesario.
        </p>
        <p>
          Tu <strong>ubicación</strong> se procesa en tiempo real (Supabase Realtime) solo
          durante la entrega activa para mostrarte el progreso del repartidor en el mapa.
          Puedes revocar el permiso de ubicación del navegador en cualquier momento; el
          retiro en local y el resto de la app seguirán funcionando.
        </p>
      </LegalSection>

      <LegalSection title="4. Finalidad y base legal">
        <LegalList
          items={[
            'Ejecución del contrato: gestionar tu cuenta, tus pedidos, pagos y entregas.',
            'Consentimiento: analítica de uso (Google Analytics) y comunicaciones opcionales, siempre que las aceptes.',
            'Interés legítimo: prevenir fraude, asegurar la plataforma y cumplir obligaciones legales/fiscales.',
          ]}
        />
      </LegalSection>

      <LegalSection title="5. Proveedores y transferencias">
        <p>
          Utilizamos proveedores que actúan como encargados del tratamiento: Supabase
          (autenticación, base de datos, tiempo real y almacenamiento de comprobantes),
          servicios de alojamiento de imágenes de terceros para fotos de menús y logotipos,
          Google Analytics para estadísticas agregadas y Vercel para el hospedaje de la
          aplicación. No vendemos tus datos personales a terceros.
        </p>
      </LegalSection>

      <LegalSection title="6. Conservación de los datos">
        <p>
          Conservamos tu cuenta y tu historial de pedidos mientras esté activa o mientras
          existan obligaciones legales. Los comprobantes de pago se eliminan
          automáticamente a los 30 días. Puedes solicitar la eliminación de tu cuenta
          escribiendo a soporte, salvo los datos que debamos retener por ley.
        </p>
      </LegalSection>

      <LegalSection title="7. Tus derechos">
        <p>
          Puedes solicitar acceso, rectificación, cancelación u oposición (derechos ARCO)
          sobre tus datos personales, así como retirar tu consentimiento de analítica en
          cualquier momento desde la Política de Cookies o borrando los datos del navegador.
          Venezuela cuenta con la Ley Orgánica de Protección de Datos Personales (LOPDP),
          que regula estos derechos.
        </p>
      </LegalSection>

      <LegalSection title="8. Seguridad">
        <p>
          Aplicamos medidas técnicas y organizativas apropiadas: cifrado en tránsito (HTTPS),
          control de acceso por roles (RLS), minimización de datos y revisión continua de
          permisos. Ningún sistema es 100 % seguro; si detectas una incidencia, repórtala a
          soporte.
        </p>
      </LegalSection>

      <LegalSection title="9. Cambios en esta política">
        <p>
          Podemos actualizar esta política para reflejar cambios legales o del servicio.
          Publicaremos la nueva versión en esta página con su fecha de actualización; los
          cambios relevantes se notificarán dentro de la app.
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
