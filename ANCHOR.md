# ANCHOR — Conversación MenuGram PWA

## Objective
- Simplificar al máximo el registro de comercios en AuthForm.tsx para reducir fricción: reducir el formulario de la pestaña Comercio a solo Nombre del Comercio, Correo electrónico y Contraseña; quitar RIF, Categoría, Descripción y Dirección (se completan luego en el Dashboard del comerciante); redirigir al panel del comerciante; actualizar los tests necesarios y verificar con `npx vitest run` y `npx tsc -b`.

## Important Details
- Archivo principal: `/home/angelo/Escritorio/MenuGran.Pwa-Angelo/src/components/auth/AuthForm.tsx`
- Identificador de pestaña comercio: `registerView === 'merchant_owner'`
- `signUpWithPassword(email, password, fullName, role)` en `auth-context-core.ts` / `AuthContext.tsx` (usa `supabase.auth.signUp` con `options.data { full_name, role }`)
- Redirigir comercio a `/merchant/dashboard` (no usar `from`)
- Campos eliminados del registro inicial: RIF, Categoría, Descripción, Dirección, Teléfono WhatsApp, Modalidades de servicio, Horario de atención, Logo, Banner
- Tests afectados: `src/components/auth/AuthForm.test.tsx`, `src/merchant-register-e2e.test.tsx`, `src/merchant-register-e2e.spec.tsx`
- IMPORTANTE: el `npx vitest run` completo tarda ~152s; el timeout por defecto de 120s del shell lo corta. Ejecutar con timeout mayor (p.ej. 600000 ms).

## Work State
### Completed
- Removidos imports no usados en AuthForm.tsx: `uploadToImgBB` y tipos `MerchantCategory, BusinessHours`
- Removido estado merchant (`logoFile`, `bannerFile`, `merchantData`) en AuthForm.tsx
- Simplificado `handleRegister`: eliminada lógica de subida de imágenes; comercio redirige a `/merchant/dashboard`, cliente a `from`
- Etiqueta "Nombre" dinámica: "Nombre del Comercio" para `merchant_owner`, "Nombre completo" para otros
- Eliminado bloque completo de campos específicos de comercio (RIF, Categoría, Descripción, Dirección, Teléfono, Modalidades, Horario, Logo, Banner)
- Tests actualizados: AuthForm.test.tsx (ruta `/merchant/dashboard`, 3 campos simplificados), ambos e2e (campos quitados, label "Nombre del Comercio")
- Añadido `{ timeout: 15000 }` a los `describe` de los dos archivos e2e (el AuthProvider montado los hace lentos y superaban el default de 5s)
- Verificación: `npx tsc -b` sin errores; `npx vitest run` completo → 45 test files, 317 tests passed (verde)

### Active
- (none)

### Blocked
- (none)

## Next Move
- (none) — tarea completada y verificada en verde

## Relevant Files
- `/home/angelo/Escritorio/MenuGran.Pwa-Angelo/src/components/auth/AuthForm.tsx`: componente modificado (formulario simplificado)
- `/home/angelo/Escritorio/MenuGran.Pwa-Angelo/src/components/auth/AuthForm.test.tsx`: tests actualizados
- `/home/angelo/Escritorio/MenuGran.Pwa-Angelo/src/merchant-register-e2e.test.tsx` y `.spec.tsx`: tests e2e actualizados (timeout subido)
- `/home/angelo/Escritorio/MenuGran.Pwa-Angelo/src/context/auth-context-core.ts`: define `signUpWithPassword`
- `/home/angelo/Escritorio/MenuGran.Pwa-Angelo/src/context/AuthContext.tsx`: implementa `signUpWithPassword`
