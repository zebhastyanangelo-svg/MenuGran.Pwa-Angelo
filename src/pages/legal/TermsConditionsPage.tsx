import { LegalList, LegalPageLayout, LegalSection } from '../../components/legal/LegalPage';

const LAST_UPDATED = '29 de septiembre de 2026';

/**
 * Términos y Condiciones del servicio MenuGram, aplicables a clientes
 * y comercios que usan la plataforma.
 */
export function TermsConditionsPage() {
  return (
    <LegalPageLayout
      title="Términos y Condiciones"
      updatedAt={LAST_UPDATED}
      intro="Estos Términos regulan el uso de MenuGram (menugran.online), la plataforma multi-comercio de menús digitales con pedidos en tiempo real y seguimiento de entrega. Al registrarte, publicar un comercio o realizar un pedido, aceptas estos Términos."
    >
      <LegalSection title="1. Descripción del servicio">
        <p>
          MenuGram permite a comercios publicar su menú digital, recibir pedidos y
          coordinar entregas, y a clientes explorar comercios, pedir comida y seguir su
          entrega en tiempo real. El servicio se presta «tal cual» y depende de la
          disponibilidad de internet, del navegador y de los datos que cada comercio
          publica.
        </p>
      </LegalSection>

      <LegalSection title="2. Cuentas y roles">
        <LegalList
          items={[
            'Cliente: persona que explora menús, realiza pedidos y paga directamente al comercio.',
            'Comercio (propietario o personal): establecimiento responsable de su menú, precios, horarios, datos de pago, confirmación de pedidos y preparación.',
            'Repartidor: usuario asignado por el comercio para llevar pedidos al cliente.',
            'Superadministrador: administración técnica de la plataforma; no interviene en la relación comercial entre cliente y comercio.',
          ]}
        />
        <p>
          Eres responsable de la confidencialidad de tu contraseña y de toda actividad
          realizada desde tu cuenta. Debes facilitar datos veraces (nombre, C.I., teléfono)
          y mantenerlos actualizados.
        </p>
      </LegalSection>

      <LegalSection title="3. Condiciones para clientes">
        <LegalList
          items={[
            'Los precios, productos, horarios y datos de pago móvil los define cada comercio y pueden cambiar sin previo aviso.',
            'La conversión de precios en dólares a bolívares usa una tasa referencial (BCV); el monto final que debes transferir es el indicado en el checkout.',
            'Al confirmar un pedido adquieres un compromiso de compra con el comercio: gestiona cancelaciones contactando al comercio lo antes posible.',
            'Los comprobantes de pago deben ser legítimos y verificables. Comprobantes falsos o alterados pueden derivar en la suspensión permanente de la cuenta.',
            'La cobertura de entrega la define cada comercio (radio máximo y zona); si tu ubicación queda fuera de cobertura, el sistema no permitirá el pedido a domicilio.',
          ]}
        />
      </LegalSection>

      <LegalSection title="4. Condiciones para comercios">
        <LegalList
          items={[
            'El comercio es el único responsable de la calidad, inocuidad, legalidad y veracidad de sus productos, precios e imágenes.',
            'Debe confirmar, preparar y coordinar los pedidos recibidos y mantener actualizados horarios, menú y datos de pago.',
            'Los pagos se realizan directamente entre cliente y comercio (pago móvil, punto de venta o efectivo); MenuGram no cobra, custodia ni intermedia los fondos.',
            'El personal autorizado (staff) actúa en nombre del comercio, que responde por los permisos que asigne dentro del panel.',
          ]}
        />
      </LegalSection>

      <LegalSection title="5. Pedidos, pagos y entregas">
        <p>
          El contrato de compra se celebra entre el cliente y el comercio. MenuGram solo
          proporciona la tecnología de pedidos, notificaciones y seguimiento, y no garantiza
          tiempos de entrega, disponibilidad de productos ni el cobro efectivo de un pago.
          Ante cualquier problema (pedido faltante, cobro o devolución), el cliente debe
          resolverlo directamente con el comercio.
        </p>
      </LegalSection>

      <LegalSection title="6. Usos prohibidos">
        <LegalList
          items={[
            'Publicar productos ilegales, ofensivos o que vulneren derechos de terceros.',
            'Extraer datos de usuarios o comercios de forma automatizada (scraping) sin autorización.',
            'Manipular comprobantes de pago, calificaciones o el estado de pedidos.',
            'Suplantar la identidad de otras personas o comercios.',
          ]}
        />
      </LegalSection>

      <LegalSection title="7. Limitación de responsabilidad">
        <p>
          En la máxima medida permitida por la ley, MenuGram no será responsable por daños
          indirectos derivados del uso de la plataforma, ni por incumplimientos de comercios
          o repartidores (retrasos, calidad del producto, disputas de pago). La
          responsabilidad de MenuGram se limita, en todo caso, a los daños directos
          demostrados.
        </p>
      </LegalSection>

      <LegalSection title="8. Propiedad intelectual y suspensión">
        <p>
          La marca MenuGram, su software y diseño son propiedad de MenuGram; cada comercio
          conserva los derechos sobre sus nombres, logotipos e imágenes. Podemos suspender o
          eliminar cuentas que incumplan estos Términos o pongan en riesgo la plataforma,
          con notificación previa cuando sea posible.
        </p>
      </LegalSection>

      <LegalSection title="9. Modificaciones y ley aplicable">
        <p>
          Podremos actualizar estos Términos publicando la nueva versión en esta página.
          El uso continuado de la plataforma tras los cambios implica su aceptación. Estos
          Términos se rigen por la legislación de la República Bolivariana de Venezuela.
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
