# Design Tokens Board — MenuGram

## 1. Tokens de marca

### Colores primarios

<div style="display:flex; gap:12px; flex-wrap:wrap; margin:16px 0;">
  <div style="width:140px; height:90px; border-radius:16px; background:#EA002A; color:white; display:flex; align-items:flex-end; padding:12px; font-weight:700;">brand-red<br>#EA002A</div>
  <div style="width:140px; height:90px; border-radius:16px; background:#FFBC0B; color:#0F172A; display:flex; align-items:flex-end; padding:12px; font-weight:700;">brand-amber<br>#FFBC0B</div>
</div>

### Neutros base

<div style="display:flex; gap:12px; flex-wrap:wrap; margin:16px 0;">
  <div style="width:120px; height:80px; border-radius:14px; background:#F8FAFC; border:1px solid #E2E8F0; display:flex; align-items:flex-end; padding:10px; font-size:12px;">slate-50<br>#F8FAFC</div>
  <div style="width:120px; height:80px; border-radius:14px; background:#FFFFFF; border:1px solid #E2E8F0; display:flex; align-items:flex-end; padding:10px; font-size:12px; color:#0F172A;">white<br>#FFFFFF</div>
  <div style="width:120px; height:80px; border-radius:14px; background:#E2E8F0; display:flex; align-items:flex-end; padding:10px; font-size:12px; color:#0F172A;">slate-200<br>#E2E8F0</div>
</div>

### Texto

<div style="display:flex; gap:12px; flex-wrap:wrap; margin:16px 0;">
  <div style="width:140px; height:80px; border-radius:14px; background:#0F172A; color:white; display:flex; align-items:flex-end; padding:10px; font-size:12px;">slate-900<br>#0F172A</div>
  <div style="width:140px; height:80px; border-radius:14px; background:#475569; color:white; display:flex; align-items:flex-end; padding:10px; font-size:12px;">slate-600<br>#475569</div>
</div>

## 2. Componentes reutilizables

### Botones

<div style="display:flex; gap:16px; align-items:center; flex-wrap:wrap; margin:16px 0;">
  <button style="padding:12px 18px; border:none; border-radius:14px; background:#EA002A; color:white; font-weight:700;">Primary CTA</button>
  <button style="padding:12px 18px; border:1px solid #E2E8F0; border-radius:14px; background:white; color:#0F172A; font-weight:600;">Secondary</button>
  <button style="padding:12px 18px; border:none; border-radius:999px; background:#FFBC0B; color:#0F172A; font-weight:700;">Promoción</button>
</div>

### Badges

<div style="display:flex; gap:12px; flex-wrap:wrap; margin:16px 0;">
  <span style="display:inline-flex; padding:6px 10px; border-radius:999px; background:#FEE2E2; color:#B91C1C; font-size:12px; font-weight:700;">Agotado</span>
  <span style="display:inline-flex; padding:6px 10px; border-radius:999px; background:#FFF1F2; color:#EA002A; font-size:12px; font-weight:700;">Entrega</span>
  <span style="display:inline-flex; padding:6px 10px; border-radius:999px; background:#FFF7D6; color:#0F172A; font-size:12px; font-weight:700;">Nuevo</span>
</div>

### Tarjetas

<div style="display:grid; grid-template-columns:repeat(3, minmax(180px, 1fr)); gap:16px; margin:16px 0;">
  <div style="border:1px solid #E2E8F0; border-radius:20px; background:white; box-shadow:0 1px 2px rgba(15,23,42,.06); overflow:hidden;">
    <div style="height:80px; background:linear-gradient(135deg,#EA002A,#FFBC0B);"></div>
    <div style="padding:16px;">
      <div style="width:42px; height:42px; border-radius:50%; background:#FEE2E2; margin-top:-28px; border:3px solid white;"></div>
      <h4 style="margin:10px 0 4px; color:#0F172A; font-size:16px;">Comercio</h4>
      <p style="margin:0; color:#475569; font-size:12px;">@merchant</p>
    </div>
  </div>

  <div style="border:1px solid #E2E8F0; border-radius:20px; background:white; padding:16px; box-shadow:0 1px 2px rgba(15,23,42,.06);">
    <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
      <span style="font-size:12px; color:#475569;">Categoría</span>
      <span style="padding:4px 8px; border-radius:999px; background:#FFF7D6; font-size:11px; font-weight:700; color:#0F172A;">Popular</span>
    </div>
    <div style="height:90px; border-radius:16px; background:#F8FAFC; border:1px dashed #E2E8F0;"></div>
  </div>

  <div style="border:1px solid #E2E8F0; border-radius:20px; background:white; padding:16px; box-shadow:0 1px 2px rgba(15,23,42,.06);">
    <div style="display:flex; gap:10px; align-items:center; margin-bottom:10px;">
      <div style="width:44px; height:44px; border-radius:12px; background:#FEE2E2;"></div>
      <div>
        <div style="font-weight:700; color:#0F172A;">Pizza</div>
        <div style="font-size:12px; color:#475569;">$12.50</div>
      </div>
    </div>
    <div style="height:72px; border-radius:12px; background:#F8FAFC; border:1px solid #E2E8F0;"></div>
  </div>
</div>

## 3. Layout y radios

- Base de contenedor: `rounded-2xl`
- Inputs/acciones pequeñas: `rounded-xl`
- Toggle de modalidad: `rounded-full`
- Card y paneles: `shadow-sm`

### Tokens de radii

- `rounded-sm`: 0.125rem
- `rounded-xl`: 0.75rem
- `rounded-2xl`: 1rem
- `rounded-full`: 9999px

## 4. Estados de interacción

### Hover y focus

- CTA activo: rojo intenso, `hover:bg-[#c80024]`
- Foco: ring rojo claro con contraste visible
- tarjetas: leve elevación con `shadow-sm` y `hover:-translate-y-0.5`

### A11y checklist

- texto blanco sobre rojo principal
- texto oscuro sobre ámbar solo en superficie clara
- bordes visibles en fondo blanco
- elementos interactivos con foco detectable

## 5. Uso recomendado por pantalla

### Marketplace
- fondo `slate-50`
- header blanco/semitransparente
- cards con borde suave y fondo blanco
- filtros activos en rojo

### Checkout
- selector de modalidad en `rounded-full`
- campos con `rounded-xl`
- botón principal rojo con texto blanco
- comprobante en borde punteado con acento rojo

### Navegación
- activo en rojo principal
- inactivo en gris suave
- iconos y texto con sufiente contraste

## 6. Resumen rápido

- Marca principal: rojo `#EA002A`
- Marca secundaria: ámbar `#FFBC0B`
- Fondo app: `#F8FAFC`
- Superficie card: `#FFFFFF`
- Texto fuerte: `#0F172A`
- Texto secundario: `#475569`
- Radii clave: `rounded-xl`, `rounded-2xl`, `rounded-full`

Esta tabla visual funciona como reference board para que el equipo mantenga la coherencia del sistema visual sin perder velocidad de implementación.
