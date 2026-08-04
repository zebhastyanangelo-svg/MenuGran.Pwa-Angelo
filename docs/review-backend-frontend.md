# Revisión de Backend y Frontend

## Backend

### 1. GET /api/orders
- **Problema**: `paymentStatus` siempre se establece como `ORDER_STATUS.CONFIRMED`, lo que no refleja el estado real de pago.
- **Solución**: Incluir el estado de pago real (ej. `paymentStatus: order.paymentMethod` o campo dedicado) en la respuesta.

### 2. GET /api/orders
- **Problema**: `riderName` siempre es `null`, aunque existe `riderId`.
- **Solución**: Obtener información del rider (`prisma.user.findUnique`) y mostrar su nombre si existe.

### 3. POST /api/orders
- **Problema**: `deliveryAddress` es opcional, pero para `serviceType === "DELIVERY"` debería ser obligatorio.
- **Solución**: Añadir validación en el esquema Zod:
  ```ts
  deliveryAddress: z.string().optional(),
  // Validación adicional en el handler:
  if (serviceType === "DELIVERY" && !deliveryAddress) {
    return NextResponse.json({ error: "deliveryAddress es requerido para delivery" }, { status: 400 });
  }
  ```

### 4. Admin Analytics Endpoint (`/api/admin/analytics`)
- **Problema**: Asume que el admin gestiona solo un restaurante (`findFirst`). Si un admin gestiona varios, se perderá información.
- **Solución**: Verificar la lógica de negocio y, si es necesario, usar `findMany` o pasar `restaurantId` como parámetro.

### 5. Frontend - AnalyticsPage
- **Problema**: El filtro de período (`Hoy`, `Esta semana`, `Este mes`) no afecta los datos; el backend siempre devuelve 7 días.
- **Solución**: Pasar el parámetro de período al backend para filtrar la respuesta (ej. `GET /api/admin/analytics?period=hoy`).

### 6. Frontend - Metodología de Pago
- **Problema**: El cálculo de porcentaje de métodos de pago usa `totalPayOrders` como denominador, lo que puede ser confuso.
- **Solución**: Clarificar en la UI que el porcentaje es sobre el total de pedidos y considerar mostrar tanto porcentaje como cantidad absoluta.

### 7. General
- **Manejo de errores**: Mensajes genéricos (`"Error al cargar"`) dificultan el diagnóstico. Mejorar con detalles específicos.
- **Validaciones**: Algunas validaciones (ej. `deliveryAddress` para delivery) están en el backend pero podrían reflejarse en el esquema Zod para mayor consistencia.

## Frontend

### 1. Consumo de API
- **Problema**: La página de analytics siempre solicita los mismos 7 días, ignorando el filtro de período.
- **Solución**: Pasar el período seleccionado como query param y modificar el endpoint para aceptarlo.

### 2. Visualización de Período
- **Problema**: Los valores de `metricCards` son estáticos y no cambian con el período seleccionado.
- **Solución**: Hacer que los valores sean dinámicos según el período seleccionado (recalcular ventas, tickets, etc.).

### 2. Gráficos y Métricas
- **Problema**: El cálculo de `maxBar` usa `Math.max(80, ...)` para evitar división por cero, lo cual puede ocultar datos reales cuando no hay ventas.
- **Solución**: Evaluar si es necesario ajustar el umbral mínimo o manejar el caso de cero ventas de forma más clara.

### 3. Accesibilidad
- **Problema**: Los colores de los métodos de pago usan solo tonos de color sin contraste suficiente para usuarios con daltonismo.
- **Solución**: Añadir etiquetas de texto claras y asegurar contraste adecuado (WCAG AA).

## Recomendaciones Generales

- **Pruebas de Integración**: Añadir pruebas que verifiquen que el backend devuelve los datos esperados para cada rol y servicio.
- **Logging**: Mejorar logging en endpoints críticos para facilitar debugging.
- **Cobertura de Tests**: Añadir tests unitarios para los schemas Zod y validaciones de entrada.