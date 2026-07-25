# Faltantes — 2026-07-21

## ✅ Corregido
- Migración de SQLite a Supabase PostgreSQL completada
- PINs hasheados con bcryptjs en toda la app (login, register, forgot-pin, staff CRUD)
- Schema de Prisma migrado a PostgreSQL (Float → Decimal, +índices)
- Seed actualizado con PINs hasheados y DATABASE_URL de Supabase
- `vercel.json` creado con comando de build
- `src/lib/crypto.ts` creado (hashPin, verifyPin, maskPhone)
- Errores de sintaxis JSX/TS corregidos en:
  - `src/app/(superadmin)/sa/users/page.tsx` ✅
  - `src/app/(operator)/operator/riders/page.tsx` ✅
  - `src/app/(superadmin)/sa/settings/page.tsx` ✅
- Errores de tipo Decimal corregidos en:
  - `src/app/api/admin/analytics/route.ts` (3 ocurrencias) ✅
  - `src/app/api/admin/dashboard/route.ts` (1 ocurrencia) ✅
  - `src/app/(admin)/admin/menu/page.tsx` (mezcla `??` y `||`) ✅

## ❌ Pendiente — errores `tsc --noEmit`

Quedan **8 errores de tipo Decimal** por corregir. La causa: al migrar de SQLite a PostgreSQL, los campos `Float` ahora son `Decimal` de Prisma, y TS no permite sumar `number + Decimal` directamente.

### Archivos con errores:

1. **`src/app/api/orders/route.ts:88`**
   - `totalPrice += menuItem.price * item.quantity;`
   - Solución: `Number(menuItem.price) * item.quantity`

2. **`src/app/api/superadmin/businesses/route.ts:30`**
   - Línea con suma de Decimal

3. **`src/app/api/superadmin/dashboard/route.ts:50`**
   - Línea con suma de Decimal

4. **`src/app/api/superadmin/metrics/route.ts`** (4 ocurrencias: líneas 50, 64, 68, 91)
   - Múltiples sumas de Decimal

5. **`src/modules/orders/services.ts:33`**
   - `totalPrice += item.price * item.quantity;`

### Solución general para cada error:
Envolver todo valor `Decimal` con `Number()`:
```ts
// Antes
s + o.totalPrice
// Después
s + Number(o.totalPrice)
```

## Pendiente — deploy
- Una vez corregidos los 8 errores restantes, ejecutar:
  ```bash
  npm run type-check   # debe dar 0 errores
  npm run lint         # debe pasar
  ```
- Luego:
  ```bash
  git add -A && git commit -m "feat: produccion lista, bcrypt + supabase + decimales"
  git push origin main
  ```
- Enlazar proyecto en Vercel dashboard con variables de entorno:
  - `DATABASE_URL`
  - `NEXTAUTH_SECRET` (ya generada: `yqI4WjOx3wDMNsDvI3BvDkQCh5a4fP8e9S0cN1mR2tU=`)
  - `NEXTAUTH_URL=https://menugran.vercel.app`
  - `NEXT_PUBLIC_API_URL=https://menugran.vercel.app/api`
- Build + deploy automático via Vercel Git integration
