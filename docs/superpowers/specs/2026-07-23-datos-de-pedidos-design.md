# Diseño: Datos de Pedidos (Tipo de Servicio + Asignación de Rider)

## Resumen

Agregar selección obligatoria de tipo de servicio al flujo de creación de pedidos del cliente (Mesa o Delivery) y la lógica de asignación de rider correspondiente.

## 1. Cambios en Base de Datos

### Enum `ServiceType`
```prisma
enum ServiceType {
  MESA
  DELIVERY
}
```

### Modelo `Table`
```prisma
model Table {
  id           String   @id @default(cuid())
  restaurantId String   @map("restaurant_id")
  number       String
  capacity     Int      @default(4)
  active       Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  restaurant Restaurant @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
  orders     Order[]

  @@unique([restaurantId, number])
  @@map("tables")
}
```

### Cambios en `Order`
```prisma
model Order {
  // ... campos existentes (sin cambios) ...
  serviceType    ServiceType @default(MESA) @map("service_type")
  tableId        String?     @map("table_id")

  table          Table?      @relation(fields: [tableId], references: [id], onDelete: SetNull)

  // deliveryAddress y lat/lng existen y se usan solo cuando DELIVERY
}
```

**Reglas de validación (aplicadas en API):**
- `MESA`: `tableId` requerido, `deliveryAddress` y `lat`/`lng` deben ser null
- `DELIVERY`: `lat`/`lng` requeridos (geolocalización), `tableId` debe ser null
- El tipo de servicio es obligatorio al crear un pedido

## 2. Flujo UI del Checkout (Cliente)

### Sin cambios en el drawer del carrito
El drawer actual (`layout.tsx`) mantiene su funcionamiento: items, total, método de pago.

### Nuevo modal de selección de servicio
Al presionar "Hacer Pedido" en el drawer, en lugar de enviar directamente el POST, se abre un modal de selección con dos opciones:

**Pantalla 1 — Selección de tipo:**
- Dos tarjetas grandes:
  - 🍽️ **Consumo en el Restaurante** → lleva a paso 2a
  - 🛵 **Delivery** → lleva a paso 2b

**Pantalla 2a — Mesa (si seleccionó "Consumo en el Restaurante"):**
- Input para número de mesa
- Botón "Confirmar Pedido" → envía POST con `serviceType: MESA` y `tableNumber`

**Pantalla 2b — Delivery (si seleccionó "Delivery"):**
- Botón "Usar mi ubicación actual" (obtiene lat/lng vía Geolocation API)
- Campo de dirección editable por si quiere ajustar
- Botón "Confirmar Pedido" → envía POST con `serviceType: DELIVERY`, `lat`, `lng`, `deliveryAddress`

### Almacenamiento en el carrito (Zustand)
Se agregan campos al store o se manejan como estado local del modal (no persisten en el carrito pues son específicos del pedido actual).

## 3. API Routes

### POST /api/orders (creación)
Cambios:
- `serviceType` es obligatorio
- Si `MESA`: busca o crea `Table` por `restaurantId` + `number`, asigna `tableId`, rechaza si `lat`/`lng` vienen
- Si `DELIVERY`: valida que `lat` y `lng` existan, rechaza si `tableNumber` viene
- Status inicial sigue siendo `PENDING`

### GET /api/orders
- Incluir `serviceType` y `table` en la respuesta formateada
- `type` se determina por `serviceType` en lugar de inferir por `deliveryAddress`

### GET /api/operator/orders
- Incluir `serviceType`, `table` en respuesta
- `address` se muestra como "Mesa N° X" si MESA

### GET /api/operator/orders/[id]
- Incluir `serviceType`, `table` en respuesta
- `customer.table` se obtiene de `table.number` si MESA

## 4. Lógica de Asignación de Rider

| Estado | MESA | DELIVERY |
|--------|------|----------|
| PENDING → CONFIRMED | Operador confirma | Operador confirma |
| CONFIRMED → PREPARING | Operador | Operador |
| PREPARING → READY | Operador | Operador |
| READY → DELIVERED | Directo (sin rider) | — |
| READY → DELIVERING | — | Operador asigna rider |
| DELIVERING → DELIVERED | — | Rider entrega |

- `DELIVERING` solo es válido para `DELIVERY`
- En el panel del operador, cuando el pedido está `READY`:
  - Si `MESA`: botón "Entregar en Mesa" → `DELIVERED`
  - Si `DELIVERY`: botón "Asignar Rider" → selector de rider → `DELIVERING` con `riderId`

## 5. Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `prisma/schema.prisma` | Agregar `ServiceType` enum, modelo `Table`, `serviceType` y `tableId` en `Order` |
| `src/modules/cart/store.ts` | Sin cambios necesarios (datos de servicio son estado local) |
| `src/app/(client)/client/layout.tsx` | Extraer drawer a componente separado; agregar modal de selección de servicio |
| `src/app/api/orders/route.ts` | POST: validar serviceType, crear/buscar Table, asignar lat/lng |
| `src/app/api/orders/[id]/route.ts` | GET/PATCH: incluir serviceType y table en respuesta |
| `src/app/api/operator/orders/route.ts` | GET: incluir serviceType y table |
| `src/app/api/operator/orders/[id]/route.ts` | GET/PATCH: incluir serviceType y table; validar transiciones |
| `src/app/api/restaurants/route.ts` o nueva API | Endpoint para listar/get mesas de un restaurante |

## 6. Migración de datos

Migración SQL para crear la BD:
```sql
CREATE TYPE "ServiceType" AS ENUM ('MESA', 'DELIVERY');
ALTER TABLE "orders" ADD COLUMN "service_type" "ServiceType" NOT NULL DEFAULT 'MESA';
ALTER TABLE "orders" ADD COLUMN "table_id" TEXT;
ALTER TABLE "orders" ADD COLUMN "updated_at" TIMESTAMP;
```
