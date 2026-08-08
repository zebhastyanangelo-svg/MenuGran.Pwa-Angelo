## REGLAS DE DEPENDENCIAS
- **Prohibido alucinar métodos:** Si vas a usar un paquete externo (ej. Supabase, Prisma, React Router), DEBES verificar la versión instalada en `package.json` / `requirements.txt`.
- **Nuevas librerías:** No instales paquetes pesados sin consultar o sin verificar que sean la solución estándar actual del ecosistema.
# 🏛️ Reglas de Arquitectura - MenuGram

## Stack Principal ($0 Costo Operativo)
- **Frontend / PWA:** React 18+, TypeScript, Vite, Tailwind CSS, `vite-plugin-pwa`.
- **Backend API:** Node.js (Express) en Monolito Modular.
- **Base de Datos & Auth:** PostgreSQL vía Supabase (UUIDs, JSONB, RLS habilitado).
- **Storage:** 
  - Logos y Fotos de Menú -> Cloudinary (Upload Preset Unsigned).
  - Captures de Pago -> Supabase Storage (Bucket privado, purga automatica a 30 días).
- **Mapas Realtime:** Leaflet.js + OpenStreetMap + Supabase Realtime (WebSockets).

## Restricciones Obligatorias para Agentes
1. **Tipado Estricto:** Todo código TypeScript debe estar tipado. Prohibido usar `any`.
2. **Costo Cero:** No agregar librerías ni servicios de pago (ej. Google Maps API, Firebase comercial).
3. **PWA First:** Todos los componentes visuales deben ser responsive y móviles por defecto.