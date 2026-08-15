# Theme Guide — MenuGram

Este documento define la identidad visual de MenuGram para mantener consistencia entre la UI, componentes y experiencias de compra.

## 1. Principios de marca

MenuGram usa una identidad limpia, cálida y de alto contraste con foco en conversiones rápidas y una experiencia moderna para pedidos.

- Marca principal: rojo intenso y enérgico
- Marca secundaria: ámbar cálido para energía o promociones
- Superficies neutras: fondo gris claro y tarjetas blancas
- Sensación visual: cercana, moderna, clara y móvil-first

## 2. Tokens de color

### Colores principales

- `brand-red`: `#EA002A`
  - Uso principal en CTAs, toggle activo, contador del carrito, estados seleccionados, foco principal.
- `brand-amber`: `#FFBC0B`
  - Uso para ratings, novedades, etiquetas destacadas y avisos de atención.

### Neutros

- Fondo principal: `#F8FAFC` (`slate-50`)
- Fondo de tarjetas: `#FFFFFF` (`white`)
- Bordes suaves: `#E2E8F0` (`slate-200`)
- Texto principal: `#0F172A` (`slate-900`)
- Texto secundario: `#475569` (`slate-600`)

### Escala recomendada

```js
brand: {
  red: '#EA002A',
  amber: '#FFBC0B',
  50: '#fff1f2',
  100: '#ffe4e6',
  200: '#fecdd3',
  300: '#fda4af',
  400: '#fb7185',
  500: '#f43f5e',
  600: '#e11d48',
  700: '#be123c',
  800: '#9f1239',
  900: '#881337',
}
```

## 3. Directrices de uso

### CTA y acciones primarias

Usar `brand-red` en:
- botones principales
- enlaces de compra
- estados activos
- contador flotante del carrito
- selección de tabs o filtros

Ejemplo:

```tsx
<button className="rounded-xl bg-brand-red px-4 py-2.5 text-white hover:bg-[#c80024]">
  Confirmar pedido
</button>
```

### Acentos secundarios

Usar `brand-amber` en:
- badges de novedad
- ratings de comercios
- estados destacados o avisos de prioridad media
- indicadores visuales que no son críticos

Ejemplo:

```tsx
<span className="rounded-full bg-brand-amber/20 px-2 py-1 text-slate-800">
  Nuevo
</span>
```

### Superficies y layout

- Fondo general: `bg-slate-50`
- Tarjetas y paneles: `bg-white`
- Bordes: `border-slate-200`
- Radios principales: `rounded-2xl`
- Radios pequeños: `rounded-xl`
- Sombras suaves: `shadow-sm`

## 4. Patrones de componentes

### Feed de categorías

Implementar en formato Bento/Grid con:
- fondo blanco o muy claro
- bordes finos
- radio `rounded-2xl`
- foco visual en la categoría activa con `bg-brand-red text-white`

### Selector de modalidad

El toggle de delivery / recoger debe:
- tener fondo neutro `bg-slate-100`
- redondearse a `rounded-full`
- usar el rojo principal en la opción activa
- mantener texto claro y legible sobre el fondo rojo

Ejemplo:

```tsx
<div className="flex rounded-full bg-slate-100 p-1">
  <button className="flex-1 rounded-full bg-brand-red text-white">Delivery</button>
  <button className="flex-1 rounded-full text-slate-600">Recoger</button>
</div>
```

### Botones y inputs

Reglas:
- `rounded-xl` o `rounded-full` según el componente
- hover suave
- focus visible con anillo rojo
- texto blanco sobre fondos rojos
- bordes neutros sobre fondos blancos

## 5. Accesibilidad y contraste

Se debe mantener contraste conforme a WCAG AA para texto y elementos interactivos.

Recomendaciones:
- Texto blanco sobre `brand-red` es válido para CTAs y botones
- Texto oscuro sobre `brand-amber` debe usarse con cuidado y en fondos claros
- Bordes y texto secundarios deben mantenerse con suficiente contraste frente al fondo blanco
- Los estados hover/focus deben reforzar la legibilidad, no debilitarla

### Contraste mínimo recomendado

- Texto principal sobre fondo blanco: `slate-900` / `#0F172A`
- Texto secundario sobre fondo blanco: `slate-600` / `#475569`
- Botón principal con texto blanco sobre rojo: cumple con contexto de acción visible

## 6. Implementación Tailwind

Usar los tokens como base en Tailwind:

```js
colors: {
  brand: {
    red: '#EA002A',
    amber: '#FFBC0B',
  },
}
```

Y componentes con clases como:

```tsx
className="rounded-2xl border border-slate-200 bg-white shadow-sm"
className="bg-brand-red text-white hover:bg-[#c80024]"
className="bg-brand-amber/20 text-slate-800"
```

## 7. Checklist de revisión visual

Antes de cerrar una tarea visual, revisar:

- ¿El CTA principal usa `brand-red`?
- ¿El toggle activo se ve claramente resaltado?
- ¿Hay suficiente contraste entre texto y fondo?
- ¿Los fondos principales son neutros y la tarjeta sigue siendo legible?
- ¿Los botones e inputs tienen bordes y focos consistentes?
- ¿Los badges de urgencia o novedad no pierden legibilidad?

## 8. Referencias rápidas

- Fondo app: `bg-slate-50`
- Fondo tarjeta: `bg-white`
- Borde: `border-slate-200`
- CTA: `bg-brand-red text-white`
- Accent: `bg-brand-amber/20 text-slate-800`
- Radio base: `rounded-2xl`
- Radio botón: `rounded-xl` o `rounded-full`

Este guide sirve como referencia de diseño visual para todas las nuevas pantallas, componentes y mejoras del sistema UI de MenuGram.
