# Requerimientos Funcionales y Roles

## 1. Modelo de Roles y Permisos (RBAC + RLS)

El control de acceso y la seguridad de datos están delegados a PostgreSQL mediante políticas de seguridad a nivel de fila (Row Level Security - RLS).

1. **SUPERADMIN:** Acceso global a la plataforma. Revisa solicitudes, aprueba, suspende o rechaza comercios.
2. **MERCHANT_OWNER:** Propietario del negocio. Administra menú, categorías, precios, finanzas, configuración de local e invitación de personal.
3. **MERCHANT_STAFF:** Empleado vinculado a un comercio (Cajero/Cocinero). Acceso restringido a la vista de comandas y actualización de estados de pedidos.
4. **DRIVER:** Repartidor de entregas. Visualiza pedidos asignados, acepta carreras y transmite coordenadas GPS en tiempo real.
5. **CUSTOMER:** Cliente final. Explora comercios activos, arma carritos de compra, realiza pagos y sigue el estado de su pedido.

---

## 2. Funcionalidades Detalladas del Sistema

### A. Registro, Verificación y Aprobación de Comercios
* **Flujo de Alta:** El propietario registra su negocio ingresando datos fiscales, nombre, slug y ubicación.
* **Estado `pending_approval`:** El comercio puede configurar su menú en un entorno privado, pero su enlace público permanecerá inactivo y no figurará en el catálogo de la PWA.
* **Aprobación Administrativa:** El `SUPERADMIN` valida los datos y cambia el estado a `active`. En ese momento el menú se publica globalmente.

### B. Proceso de Pago, Captures y Validación (Flujo KFC)
* **Ingreso de Datos de Pago:** En pagos vía Pago Móvil o Transferencia, la PWA exige al cliente ingresar el número de referencia bancaria.
* **Adjunción de Comprobante:** El cliente adjunta la captura del pago. La PWA comprime la imagen localmente en el dispositivo a formato WebP (< 150 KB) antes de subirla a Supabase Storage.
* **Verificación Pre-Cocina:** El pedido entra en estado `payment_pending`. El personal del comercio abre la orden, valida la imagen del capture contra su banco y aprueba el pedido cambiándolo a `preparing`.
* **Cuadre de Caja Multimoneda:** El panel de control del comercio consolida las ventas diarias desglosando los ingresos recibidos en Efectivo versus Pago Móvil/Métodos Digitales.

### C. Modalidades de Compra y Geolocalización
* **Comer en el Local / Pick-up:** Permite indicar el número de mesa o la hora de retiro sin solicitar dirección de envío.
* **Delivery a Domicilio:** Incluye el botón "Usar mi ubicación actual", el cual invoca la Geolocation API nativa del navegador para obtener latitud y longitud exactas.
* **Mapa de Rastreo en Tiempo Real:** Para pedidos en camino, la PWA del cliente despliega un mapa interactivo construido con Leaflet.js y OpenStreetMap. La posición del repartidor se actualiza en vivo mediante WebSockets de Supabase Realtime.

### D. Gestión de Personal por Comercio
* Los propietarios (`MERCHANT_OWNER`) pueden vincular usuarios registrados como empleados (`MERCHANT_STAFF`) mediante la tabla `merchant_staff`.
* Cada empleado cuenta con un objeto de permisos `JSONB` que define si puede editar el menú, ver finanzas o únicamente gestionar comandas de cocina.