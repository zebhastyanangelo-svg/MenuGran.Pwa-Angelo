# 🍽️ MenuGran - PWA de Gestión de Pedidos y Entregas

Una aplicación web progresiva (PWA) moderna construida con **Next.js 14**, diseñada para gestionar pedidos de comida con múltiples roles de usuario (cliente, operador, administrador, repartidor y superadministrador).

## 📋 Tabla de Contenidos

- [Características](#características)
- [Requisitos](#requisitos)
- [Instalación](#instalación)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Configuración Inicial](#configuración-inicial)
- [Dependencias Principales](#dependencias-principales)
- [Scripts Disponibles](#scripts-disponibles)
- [Guía de Desarrollo](#guía-de-desarrollo)
- [Roles y Permisos](#roles-y-permisos)
- [Arquitectura](#arquitectura)

---

## ✨ Características

### PWA Completa
- ✅ Instalable en dispositivos (iOS y Android)
- ✅ Funciona offline con Service Worker (Serwist)
- ✅ Web App Manifest configurado
- ✅ Soporte para safe areas (notch de iPhone)
- ✅ Caché inteligiente de recursos

### Múltiples Roles
- 👤 **Cliente**: Ver menú, hacer pedidos, historial
- 👨‍💼 **Operador**: Gestionar pedidos en cocina
- 📋 **Admin**: Gestionar menú y negocio
- 🚴 **Rider**: Seguimiento GPS en tiempo real
- 👑 **Superadmin**: Gestión multi-negocio

### Stack Moderno
- **Framework**: Next.js 14 (App Router)
- **Auth**: NextAuth v5 beta + Prisma Adapter
- **BD**: Supabase (PostgreSQL)
- **ORM**: Prisma
- **State Management**: Zustand
- **Queries**: TanStack React Query
- **Maps**: Leaflet + React-Leaflet
- **UI**: Tailwind CSS v4 + Lucide Icons
- **Validación**: Zod

---

## 🔧 Requisitos

- **Node.js**: v18.0.0 o superior
- **npm**: v9.0.0 o superior
- **Git**: Versionamiento de código
- **Cuenta Supabase**: Base de datos y auth
- **Variables de entorno**: `.env.local`

---

## 📦 Instalación

### 1. Clonar el repositorio
```bash
git clone https://github.com/zebhastyanangelo-svg/MenuGran.Pwa-Angelo.git
cd MenuGran.Pwa-Angelo/menugran
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno
Crear archivo `.env.local` en la raíz:

```env
# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/menugran

# API
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

### 4. Configurar base de datos
```bash
# Generar Prisma Client
npm run prisma:generate

# Sincronizar schema con BD
npm run prisma:push

# (Opcional) Abrir Prisma Studio
npm run prisma:studio
```

### 5. Ejecutar en desarrollo
```bash
npm run dev
```

La aplicación estará disponible en: **http://localhost:3000**

---

## 📁 Estructura del Proyecto

```
menugran/
├── 📂 public/
│   ├── icons/
│   │   ├── icon-192x192.png          # Icono PWA pequeño
│   │   ├── icon-512x512.png          # Icono PWA grande
│   │   ├── maskable-icon-192x192.png # Icono maskable
│   │   └── apple-touch-icon.png      # Icono iOS
│   ├── manifest.webmanifest          # Configuración PWA
│   └── offline.html                  # Página sin conexión
│
├── 📂 src/
│   ├── 📂 app/                       # Next.js App Router
│   │   ├── 📂 (public)/              # Grupo: Rutas públicas
│   │   │   └── page.tsx              # Home
│   │   │
│   │   ├── 📂 (auth)/                # Grupo: Autenticación
│   │   │   ├── layout.tsx
│   │   │   └── 📂 login/
│   │   │       └── page.tsx
│   │   │
│   │   ├── 📂 (client)/              # Grupo: Cliente
│   │   │   └── 📂 client/
│   │   │       ├── layout.tsx
│   │   │       └── 📂 orders/
│   │   │           └── page.tsx
│   │   │
│   │   ├── 📂 (operator)/            # Grupo: Operador (Cocina)
│   │   │   └── 📂 operator/
│   │   │       ├── layout.tsx
│   │   │       └── 📂 orders/
│   │   │           └── page.tsx
│   │   │
│   │   ├── 📂 (admin)/               # Grupo: Admin
│   │   │   └── 📂 admin/
│   │   │       ├── layout.tsx
│   │   │       └── 📂 menu/
│   │   │           └── page.tsx
│   │   │
│   │   ├── 📂 (rider)/               # Grupo: Repartidor
│   │   │   └── 📂 rider/
│   │   │       ├── layout.tsx
│   │   │       └── 📂 active/[orderId]/
│   │   │           └── page.tsx
│   │   │
│   │   ├── 📂 (superadmin)/          # Grupo: SuperAdmin
│   │   │   └── 📂 sa/
│   │   │       ├── layout.tsx
│   │   │       └── 📂 businesses/
│   │   │           └── page.tsx
│   │   │
│   │   ├── 📂 api/                   # API Routes
│   │   │   ├── 📂 auth/[...nextauth]/
│   │   │   │   └── route.ts
│   │   │   ├── 📂 orders/
│   │   │   │   └── route.ts
│   │   │   └── 📂 rider/location/
│   │   │       └── route.ts
│   │   │
│   │   ├── layout.tsx                # Layout raíz
│   │   └── globals.css               # Estilos globales + Tailwind
│   │
│   ├── 📂 modules/                   # Lógica modular por dominio
│   │   ├── auth/                     # Autenticación
│   │   ├── orders/                   # Gestión de pedidos
│   │   ├── menu/                     # Gestión de menú
│   │   └── delivery/                 # Logística de entregas
│   │
│   ├── 📂 components/                # Componentes reutilizables
│   │   ├── ui/                       # Componentes de UI (button, input, etc)
│   │   └── shared/                   # Componentes compartidos
│   │
│   ├── 📂 lib/                       # Utilidades y helpers
│   │   ├── db.ts                     # Configuración DB
│   │   ├── supabase.ts               # Cliente Supabase
│   │   ├── auth.ts                   # Helpers autenticación
│   │   ├── validators.ts             # Esquemas Zod
│   │   └── geo.ts                    # Utilidades geolocalización
│   │
│   ├── 📂 server/                    # Funciones servidor
│   │   ├── services/                 # Lógica de negocio
│   │   └── repositories/             # Acceso a datos
│   │
│   └── 📂 pwa/                       # Configuración PWA
│       ├── sw.ts                     # Service Worker
│       └── cache.ts                  # Estrategias de caché
│
├── 📂 prisma/
│   └── schema.prisma                 # Schema de base de datos
│
├── 📄 next.config.ts                 # Configuración Next.js
├── 📄 tsconfig.json                  # Configuración TypeScript
├── 📄 tailwind.config.ts             # Temas y extensiones Tailwind
├── 📄 package.json                   # Dependencias y scripts
├── 📄 postcss.config.js              # Configuración PostCSS
└── 📄 .env.local                     # Variables de entorno (NO commitear)
```

---

## 🎯 Configuración Inicial

### 1. TypeScript Paths (Alias)
En `tsconfig.json` ya está configurado:
```json
"paths": {
  "@/*": ["./src/*"]
}
```

Uso:
```tsx
import Button from '@/components/ui/Button';
import { getOrders } from '@/modules/orders/services';
```

### 2. Tailwind CSS v4
El archivo `globals.css` está configurado con:
- Directivas Tailwind (`@tailwind base`, `components`, `utilities`)
- Variables CSS para safe areas (notch)
- Reset CSS global
- Estilos de antialiasing

### 3. Safe Areas (iPhone Notch)
Variables CSS disponibles:
```css
:root {
  --sat: env(safe-area-inset-top);      /* Top */
  --sar: env(safe-area-inset-right);    /* Right */
  --sab: env(safe-area-inset-bottom);   /* Bottom */
  --sal: env(safe-area-inset-left);     /* Left */
}

/* Usar en componentes */
.safe-area {
  padding-top: var(--sat);
  padding-right: var(--sar);
  padding-bottom: var(--sab);
  padding-left: var(--sal);
}
```

---

## 📚 Dependencias Principales

| Paquete | Versión | Propósito |
|---------|---------|----------|
| **next** | ^14.2.0 | Framework React con SSR |
| **react** | ^18.3.0 | Biblioteca UI |
| **@prisma/client** | ^5.15.0 | ORM para BD |
| **@supabase/supabase-js** | ^2.43.0 | Cliente Supabase |
| **next-auth** | 5.0.0-beta.19 | Autenticación |
| **zustand** | ^4.5.0 | State management ligero |
| **@tanstack/react-query** | ^5.45.0 | Gestión de datos async |
| **zod** | ^3.23.0 | Validación de esquemas |
| **leaflet** | ^1.9.4 | Mapas interactivos |
| **react-leaflet** | ^4.2.1 | Integración Leaflet-React |
| **tailwindcss** | ^3.4.0 | Utility CSS framework |
| **lucide-react** | ^0.378.0 | Iconos SVG |
| **serwist** | ^9.0.0 | Service Worker PWA |

---

## 🚀 Scripts Disponibles

```bash
# Desarrollo
npm run dev              # Inicia servidor dev en puerto 3000

# Producción
npm run build           # Compila el proyecto
npm start               # Inicia servidor producción

# Prisma
npm run prisma:generate # Genera Prisma Client
npm run prisma:push     # Sincroniza schema con BD
npm run prisma:studio   # Abre Prisma Studio (admin BD)

# Utilidades
npm run lint            # Ejecuta ESLint
npm run type-check      # Verifica tipos TypeScript
```

---

## 👥 Roles y Permisos

### 🟢 Cliente
- Ver menú disponible
- Realizar pedidos
- Seguimiento de pedido en tiempo real
- Historial de pedidos
- Gestionar dirección de entrega

### 🟡 Operador
- Ver cola de pedidos
- Cambiar estado de preparación (En espera → Preparando → Listo)
- Asignar a repartidor
- Notificaciones en tiempo real

### 🟠 Administrador
- CRUD de menú (crear, editar, eliminar items)
- Gestionar categorías
- Horarios de funcionamiento
- Reportes de ventas
- Configuración del negocio

### 🔵 Repartidor (Rider)
- Ver pedidos asignados
- Compartir ubicación GPS en tiempo real
- Cambiar estado (En ruta → Entregado)
- Historial de entregas
- Rating de clientes

### 🔴 Superadmin
- Gestionar múltiples negocios
- Crear/editar negocios
- Aprobar operadores
- Reportes globales
- Gestión de facturación

---

## 🏗️ Arquitectura

### Flujo de Datos

```
Cliente (UI)
    ↓
Componentes React (TSX)
    ↓
React Query (Fetch + Caché)
    ↓
API Routes (Next.js)
    ↓
Services (Lógica de negocio)
    ↓
Repositories (Acceso a datos)
    ↓
Prisma ORM
    ↓
Base de Datos (Supabase/PostgreSQL)
```

### State Management

- **Zustand**: Estado global (usuario, autenticación, preferencias)
- **React Query**: Caché de datos del servidor
- **Proveedor Auth**: NextAuth v5 con sesiones

### Type Safety

- **TypeScript** en 100% del código
- **Zod** para validación runtime
- **Prisma Types** para modelos BD

---

## 📱 PWA Features

### Instalación
- Instalable en iPhone/Android
- Acceso directo desde home screen
- Tema personalizable (colores)
- Splash screen nativo

### Offline
- Service Worker con caché inteligente
- Sincronización en background
- Página offline HTML
- Funcionalidad limitada sin conexión

### Performance
- HTTP/2 Push
- Compresión de assets
- Lazy loading de componentes
- Optimización de imágenes

---

## 🔐 Seguridad

- ✅ HTTPS en producción
- ✅ CORS configurado correctamente
- ✅ Validación de entrada (Zod)
- ✅ Protección CSRF (NextAuth)
- ✅ Rate limiting en API
- ✅ Variables de entorno para secretos

---

## 📊 Convenciones de Código

### Estructura de Carpetas
```
Características → Componentes
    ↓
UI reutilizable → Compartida
    ↓
Lógica → Independiente de UI
```

### Naming
- **Componentes**: PascalCase (`HomePage.tsx`)
- **Funciones**: camelCase (`getOrders()`)
- **Constantes**: UPPER_SNAKE_CASE (`API_URL`)
- **Variables**: camelCase (`userId`)

### Imports
```tsx
// Sistema
import type { ReactNode } from 'react';

// Externas
import { create } from 'zustand';
import { useQuery } from '@tanstack/react-query';

// Internas (con alias @/)
import Button from '@/components/ui/Button';
import { useAuthStore } from '@/modules/auth/store';

// Tipos
import type { Order } from '@/types/orders';
```

---

## 🐛 Debugging

### Logs
```bash
# Iniciar con debug
DEBUG=* npm run dev

# Ver requests HTTP
NEXT_DEBUG_REQUESTS=true npm run dev
```

### Chrome DevTools
- Pestaña **Application** → **Manifest** (PWA)
- Pestaña **Application** → **Service Workers** (offline)
- Pestaña **Application** → **Cache Storage** (caché)

---

## 🚀 Deployment

### Vercel (Recomendado para Next.js)
```bash
vercel deploy
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

---

## 📞 Soporte

- **Issues**: GitHub Issues
- **Documentación**: Ver README.md
- **NextAuth Docs**: https://authjs.dev/
- **Supabase Docs**: https://supabase.com/docs

---

## 📄 Licencia

Proyecto privado - Todos los derechos reservados © 2026

---

**Versión**: 0.1.0 | **Última actualización**: 29 de Abril, 2026
