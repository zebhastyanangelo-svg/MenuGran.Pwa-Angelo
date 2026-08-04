# Guía de Diseño — Rediseño de Interfaz

> Investigación de tipografía y UX/UI basada en KFC Venezuela (kfc.com.ve) y PedidosYa (pedidosya.com.ve). Aplicable al rediseño de la plataforma MenuGran PWA.

---

## 1. Tipografía

### KFC Venezuela
- **Display:** KFC Krunch (Yomar Augusto / Naipe Foundry) — tipografía display handwritten/sketch que rompe con el eje vertical, con alternates OpenType que evitan repetición de caracteres dentro de una misma palabra. Transmite cercanía, espíritu urbano y artesanal.
- **Web app:** Next.js 14 con CSS Modules. 5 fuentes OTF preloadadas (`/_next/static/media/...`). Variables CSS de fuente (`--variable_ff90e7`, etc.).
- **Jerarquía:** Uso de peso y tamaño para crear contraste, no múltiples familias.

### PedidosYa
- **Principal:** TT Commons Pro (TypeType) — sans-serif geométrico, 275+ idiomas, 4 anchos (Condensed, Normal, Compact, Expanded), 11 pesos cada uno.
- **Escala tipográfica limitada a 2 pesos (400 y 600):**

| Elemento | Font | Tamaño | Peso | Altura de línea |
|----------|------|--------|------|-----------------|
| Body | TT Commons Pro | 16px | 400 | normal |
| H1 | TT Commons Pro | 20px | 600 | 24px |
| H2 | TT Commons Pro | 16px | 600 | 20px |
| Nav / Footer / A | TT Commons Pro | 16px | 400 | normal |

- **Principio:** Jerarquía por tamaño, no por estilo. Sin itálica, sin extra-bold. Solo dos grosores para toda la interfaz.

### Recomendación para MenuGran
- Usar **una sola familia tipográfica** con 2 pesos (regular + semibold).
- Escala: 16px body, 20px h1, 16px h2 — evitar más de 3 tamaños distintos.
- Si se necesita display para títulos hero, considerar una fuente display complementaria (tipo KFC Krunch) pero limitada a uso puntual.
- Altura de línea: `normal` para body, `1.25–1.5` para títulos.

---

## 2. Paleta de Colores

### KFC Venezuela
- **Primarios:** Rojo, blanco, negro.
- **Sistema expandido:** "Herbs and Spices" — paleta de especias/colores complementarios al rojo base.

### PedidosYa
- **Signature Pink:** `#FF1744` — rosa vibrante, "energía latina apetitosa".
- **Torch Red:** `#FA0050` — rojo cálido.
- **Sunset Orange:** `#FF4B55` — naranja atardecer.
- **Negro:** `#000000`.
- **Grises neutros** para fondos y texto secundario.
- **Restricción:** Paleta limitada a banderas, rosa signature y grises neutros. Sin sombras ni bordes pesados.

### Recomendación para MenuGran
- Definir **1 color signature** (ej. el `gold`/`brand` actual de Tailwind) como primario.
- Usar **grises neutros** para fondos, bordes y texto secundario.
- **Restringir la paleta a 3–4 colores** totales.
- Aplicar consistencia de colores en: botones primarios, enlaces, estados (success/danger/warning), fondos de tarjetas.

---

## 3. Layout y Espaciado

### PedidosYa (modelo a seguir)
- **Mobile-first:** Contenido centrado, ancho máximo **400px**.
- **Espaciado vertical generoso:** 56px entre items de lista — ritmo vertical digerible.
- **Margenes laterales amplios** — layout centrado con respiro.
- **Sin densidad:** "Patience rather than density" — espacio negativo como elemento de diseño.

### KFC Venezuela
- **Mobile-first** responsive.
- Navegación inferior o superior con CTAs claros.
- Secciones con breathing room entre bloques.

### Recomendación para MenuGran
- **Contenido centrado, max-width 400–480px** en móvil.
- **Ritmo vertical de 48–56px** entre secciones/items.
- **Margenes laterales** de al menos 16px en móvil.
- Evitar diseños densos — cada elemento necesita espacio para respirar.

---

## 4. Componentes

### Patrones observados

| Componente | KFC VE | PedidosYa |
|------------|--------|-----------|
| **Botones CTA** | Primarios rojos, texto claro | Firmes, sin sombra, padding generoso |
| **Listas** | Simples, sin decoración | Items limpios, chevrón derecho sutil, 56px de alto |
| **Navegación** | Barra superior con links | Bottom nav o top bar, minimal |
| **Tarjetas** | Sin sombra, borde sutil | Sin sombra, sin borde pesado |
| **Iconos/Banderas** | — | 24px, ratio 3:2, geometric rectangles |
| **Headers** | Grande, bold | 20px, 600 weight |
| **Formularios** | Campos limpios, labels claros | Inputs con padding generoso |

### Principios de componentes
- **Sin sombras** ni bordes pesados — diseño plano y limpio.
- **Padding generoso** en todos los interactive elements.
- **Chevrón/direccional sutil** para indicar navegación.
- **Iconos geométricos** — rectángulos limpios, sin detalles ornamentales.
- **Todo componente debe funcionar sin shadow/border** como diferenciador visual.

---

## 5. Principios de UX

### KFC Venezuela
1. **Ordenación como flujo principal** — la homepage es una pregunta: "¿Cómo te gustaría ordenar hoy?" con dos opciones claras.
2. **Mobile-first** — toda la experiencia prioriza el teléfono.
3. **Jerarquía visual simple** — un CTA principal por pantalla.

### PedidosYa
1. **Accesibilidad desde el día uno** — contraste, legibilidad, tamaño mínimo de tipografía incorporados en el Design System, no como parche.
2. **Consistencia** — Design System formal con arquitectura atada a problemas reales.
3. **Cultural connection** — banderas, color vibrante, identidad latinoamericana.
4. **Thumb-friendly** — elementos interactivos al alcance del pulgar, centrados.
5. **Patience over density** — espacio negativo como herramienta de UX, no desperdicio.

### Recomendaciones para MenuGran
1. **Cada pantalla debe tener un CTA principal claro.**
2. **Accesibilidad:** contraste mínimo AA, tamaño de fuente legible (≥16px body), touch targets ≥44px.
3. **Mobile-first** — diseñar para móvil primero, luego adaptar a desktop.
4. **Design System formal** — documentar tokens de color, tipografía, espaciado, componentes.
5. **Thumb-friendly** — navegación inferior, botones grandes, contenido centrado.
6. **Consistencia** — mismos patrones en toda la plataforma (misma forma de botones, cards, navegación).

---

## 6. Arquitectura de Diseño (Design System)

### Estructura recomendada

```
design/
├── tokens/
│   ├── colors.md       — paleta de colores con tokens
│   ├── typography.md   — escala tipográfica, pesos, familias
│   ├── spacing.md      — escala de espaciado (4, 8, 12, 16, 24, 32, 48, 56, 64)
│   └── radii.md        — border-radius tokens
├── components/
│   ├── button.md       — variantes, sizes, states
│   ├── card.md         — layout, padding, shadow (none)
│   ├── list-item.md    — chevron, spacing, height
│   ├── nav.md          — top/bottom nav patterns
│   └── input.md        — form fields, labels, error states
├── pages/
│   ├── home.md         — homepage patterns
│   ├── menu.md         — listing patterns
│   ├── cart.md         — cart flow
│   └── checkout.md     — checkout flow
└── principles.md       — diseño principles, dos/don'ts
```

### Tokens clave

**Tipografía:**
- `--font-body: "TT Commons Pro", sans-serif` (o la fuente seleccionada)
- `--font-display: "KFC Krunch", cursive` (solo para títulos hero)
- `--text-base: 16px`
- `--text-lg: 20px`
- `--weight-regular: 400`
- `--weight-semibold: 600`

**Espaciado (4px grid):**
- `--space-1: 4px`
- `--space-2: 8px`
- `--space-3: 12px`
- `--space-4: 16px`
- `--space-6: 24px`
- `--space-7: 32px`
- `--space-8: 48px`
- `--space-9: 56px`

**Colores:**
- `--color-primary: #FF1744` (o el color signature de la marca)
- `--color-bg: #FFFFFF`
- `--color-surface: #F5F5F5`
- `--color-text: #000000`
- `--color-text-secondary: #666666`

---

## 7. Resumen de Reglas

1. **Una familia tipográfica, 2 pesos máximo.**
2. **Escala de 3 tamaños:** 16px body, 20px h1, 16px h2.
3. **Paleta de 3–4 colores.** Sin más.
4. **Sin sombras.** Sin bordes pesados. Diseño plano.
5. **Espaciado generoso.** 48–56px entre secciones.
6. **Mobile-first.** Max-width 400–480px centrado.
7. **Un CTA principal por pantalla.**
8. **Touch targets ≥44px.**
9. **Accesibilidad integrada** — no como parche, como base del Design System.
10. **Componentes reutilizables** — documentar en Design System antes de escribir código.
