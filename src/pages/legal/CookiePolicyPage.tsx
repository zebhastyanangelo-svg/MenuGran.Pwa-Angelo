import { LegalList, LegalPageLayout, LegalSection } from '../../components/legal/LegalPage';

const LAST_UPDATED = '29 de septiembre de 2026';

/**
 * Política de Cookies de MenuGran: explica el uso de cookies técnicas,
 * almacenamiento local (localStorage) y de analítica (Google Analytics),
 * así como el mecanismo de consentimiento y revocación.
 */
export function CookiePolicyPage() {
  return (
    <LegalPageLayout
      title="Política de Cookies"
      updatedAt={LAST_UPDATED}
      intro="En MenuGran usamos tecnologías de almacenamiento en tu dispositivo (cookies y localStorage) para que la aplicación funcione correctamente y, con tu permiso, para medir su uso con analítica. Aquí explicamos cuáles usamos, para qué, y cómo puedes aceptarlas o rechazarlas."
    >
      <LegalSection title="1. Qué son las cookies y el localStorage">
        <p>
          Las <strong>cookies</strong> son pequeños archivos que los sitios web guardan en
          tu navegador. El <strong>localStorage</strong> es un almacenamiento local del
          navegador con la misma finalidad: recordar información entre visitas (por
          ejemplo, tu carrito). Ambas tecnologías son inofensivas por sí solas y puedes
          borrarlas desde la configuración de tu navegador.
        </p>
      </LegalSection>

      <LegalSection title="2. Almacenamiento técnico y funcional (siempre activo)">
        <p>
          Son necesarios para que MenuGran funcione y no requieren consentimiento:
        </p>
        <LegalList
          items={[
            'menugram_cart: guarda tu carrito mientras navegas entre comercios (localStorage).',
            'menugram_order_cache_v1: caché de tus pedidos activos/recientes para uso sin conexión (localStorage).',
            'menugram_onboarding_completed: recuerda que ya completaste la bienvenida (localStorage).',
            'menugram_bcv_exchange_rate: caché diaria de la tasa BCV de referencia (localStorage).',
            'sb-*-auth-token: cookies de Supabase Auth que mantienen tu sesión iniciada de forma segura.',
          ]}
        />
      </LegalSection>

      <LegalSection title="3. Preferencias de consentimiento">
        <p>
          Guardamos tu elección en <strong>localStorage</strong> con la clave{' '}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">menugram_cookie_consent</code>{' '}
          con dos valores posibles: <strong>all</strong> (aceptas todo) o{' '}
          <strong>necessary</strong> (solo lo técnico). Gracias a esta preferencia no te
          mostramos el aviso repetidamente y la app sabe si puede activar la analítica.
        </p>
      </LegalSection>

      <LegalSection title="4. Cookies de analítica (solo con tu permiso)">
        <p>
          Usamos <strong>Google Analytics 4</strong> para entender de forma agregada qué
          páginas se visitan y cómo se usa la app, lo que nos ayuda a mejorarla. Estas
          cookies <strong>solo se activan si pulsas «Aceptar todo»</strong> en el banner de
          consentimiento:
        </p>
        <LegalList
          items={[
            '_ga / _ga_*: identificadores de Google Analytics para distinguir usuarios y sesiones.',
            'gtag.js: script de medición cargado desde googletagmanager.com tras el consentimiento.',
          ]}
        />
        <p>
          Aplicamos <strong>Google Consent Mode v2</strong>: el almacenamiento de analítica
          y publicidad permanece denegado por defecto y solo se concede el almacenamiento
          de estadísticas cuando aceptas. Además, anonymizamos las IP.
        </p>
      </LegalSection>

      <LegalSection title="5. Cookies de terceros">
        <p>
          Los mapas (OpenStreetMap/Leaflet) y la infraestructura de Supabase pueden establecer
          cookies técnicas necesarias para cargar el mapa y mantener la sesión. No usamos
          cookies publicitarias ni de redes sociales.
        </p>
      </LegalSection>

      <LegalSection title="6. Cómo gestionar o revocar tu consentimiento">
        <LegalList
          items={[
            'Desde el navegador: puedes bloquear o eliminar cookies en la configuración (privacidad y seguridad).',
            'Revocar analítica: borra la clave menugram_cookie_consent del almacenamiento del sitio (o «Borrar datos de navegación» para el sitio menugran.online) y elige «Solo necesarias» cuando el banner reaparezca.',
            'Navegador: los datos del carrito y del consentimiento se borran igualmente si limpias los datos del sitio.',
          ]}
        />
      </LegalSection>

      <LegalSection title="7. Cambios en esta política">
        <p>
          Si añadimos o eliminamos tecnologías de seguimiento, actualizaremos esta página y
          la fecha de última modificación. Para dudas, contacta a soporte desde la app.
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
