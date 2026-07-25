# Credenciales y Pruebas — MenuGran

## Servidor local

| Comando | URL |
|---------|-----|
| `npm run dev` (en `menugran/`) | http://localhost:3000 |

## Usuarios de prueba

| Rol | Cédula | PIN | Nombre | URL de login | Redirige a |
|-----|--------|-----|--------|-------------|------------|
| **SUPERADMIN** | `00000001` | `1111` | Angelo Superadmin | `/superadmin-login` | `/sa` |
| **ADMIN** | `12345678` | `2222` | María Dueña | `/admin-login` | `/admin` |
| **OPERATOR** | `23456789` | `3333` | Carlos Operador | `/operator-login` | `/operator` |
| **RIDER** | `34567890` | `4444` | Pedro Repartidor | `/login` | `/rider` |
| **CLIENT** | `11111111` | `5555` | Juan Cliente | `/login` | `/client` |
| **CLIENT** | `22222222` | `6666` | Ana García | `/login` | `/client` |

> **Importante**: El login general (`/login`) acepta **cualquier rol** y redirige automáticamente al dashboard según el rol del usuario. Los logins específicos (`/admin-login`, `/operator-login`, `/superadmin-login`) validan que el rol coincida y rechazan otros roles.

## Datos sembrados

- **Negocio**: Grupo Gastronómico Vargas
- **3 restaurantes** manejados por `ADMIN` (María Dueña, cédula `12345678`):
  1. **La Parrilla de Juan** — 8 platos en 4 categorías (Entradas, Platos Fuertes, Bebidas, Postres)
  2. **Arepas Doña Rosa** — 9 platos en 4 categorías (Arepas, Platos, Bebidas, Postres)
  3. **Sushi Express** — 9 platos en 4 categorías (Rolls, Nigiris, Bebidas, Postres)

## Flujo de autenticación

1. Usuario ingresa cédula + PIN de 4 dígitos
2. `NextAuth` valida contra BD vía `CredentialsProvider` (bcrypt)
3. Tras login exitoso, se llama a `POST /api/auth/login` que guarda el usuario en `localStorage`
   - Login general (`/login`): guarda en clave `user`
   - Logins específicos (`/admin-login`, `/operator-login`, `/superadmin-login`): guardan en clave `menugran-user`
4. La protección de rutas es **client-side** (no hay middleware)
5. Las rutas API **no verifican sesión**

## Notas

- La BD apunta a **Supabase PostgreSQL** vía `DATABASE_URL` en `.env.local` (pooler)
- El seed ya fue ejecutado, los 6 usuarios existen en la BD
- Para resetear datos: `npm run prisma:push` (re-sincroniza schema)
