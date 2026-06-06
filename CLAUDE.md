# CLAUDE.md — Guía operativa para Prep!
# LEE ESTE ARCHIVO COMPLETO ANTES DE ESCRIBIR UNA SOLA LÍNEA DE CÓDIGO.

## 1. QUÉ ES PREP!
Software de operaciones para restaurantes. PWA responsive. Primer cliente: Casa Italia (restaurante italiano en Lima). Owner: Francisco Barrientos. Deadline: 25 junio 2026.

## 2. STACK TÉCNICO
- **Frontend:** HTML estático + CSS custom (NO React, NO framework, NO Tailwind en la app). Cada módulo es un archivo .html standalone.
- **Backend:** Supabase PostgreSQL (proyecto `jmkvphayyhwzootlybde`)
- **Deploy:** Vercel auto-deploy desde GitHub. Push = deploy en ~60s.
- **Realtime:** Supabase Realtime (websockets) para sync entre dispositivos.
- **Auth:** Master password → sesión con marca_id. Supabase anon key + RLS.

## 3. CÓMO DEPLOYAR (CRÍTICO)

```bash
# 1. Clonar (solo la primera vez)
cd /home/claude
git clone https://$GITHUB_TOKEN@github.com/franciscobarrientos64/prep-platform.git
cd prep-platform

# 2. Configurar (solo la primera vez)
git config user.email "francisco@prep.rest"
git config user.name "Francisco Barrientos"

# 3. Después de editar archivos:
git add .
git commit -m "Descripción clara del cambio"
git push origin main

# Si el remote no tiene el token (error 403):
git remote set-url origin https://$GITHUB_TOKEN@github.com/franciscobarrientos64/prep-platform.git
```

**IMPORTANTE:** Vercel redeploya automáticamente al pushear. Espera ~60s y el cambio está en `casa-italia.prep.rest`.

## 4. ESTRUCTURA DE ARCHIVOS

```
prep-platform/
├── CLAUDE.md          ← ESTE ARCHIVO (léelo primero)
├── vercel.json        ← Rewrites de rutas (cleanUrls: true)
├── index.html         ← Copia de casa-italia.html (se sirve en /)
├── casa-italia.html   ← App principal de Casa Italia (demo con 13 módulos)
├── hub.html           ← Hub de navegación del proyecto
├── pos.html           ← Módulo POS (versión anterior)
├── inventario.html    ← Módulo de inventario (tiene Supabase client real)
├── nav.html           ← Navegación simple (legacy)
├── vercel.json        ← Config de rutas
└── [otros .html]      ← Specs, análisis, roadmap (documentación)
```

**Cuando crees un nuevo módulo:** crea el archivo .html en la raíz Y agrega el rewrite en vercel.json.

## 5. SISTEMA DE DISEÑO — NEO-BRUTALISMO CÁLIDO

### CSS Variables (USAR SIEMPRE ESTAS, no valores hardcodeados):
```css
:root {
  --primary: #1e5af9;        /* cobalto eléctrico */
  --secondary: #ff3b30;      /* rojo */
  --tertiary: #ffcc00;       /* amarillo */
  --bg: #fcf9f8;             /* crema */
  --surface: #ffffff;
  --ink: #171c20;            /* texto */
  --outline: #000000;
  --primary-soft: #d6e2ff;
  --primary-dark: #001a47;
  --gray-soft: #dfe3e8;
  --shadow-sm: 4px 4px 0 0 #000;
  --shadow: 8px 8px 0 0 #000;
  --shadow-lg: 12px 12px 0 0 #000;
  --font-display: 'Bagel Fat One', system-ui, sans-serif;
  --font-body: 'IBM Plex Sans', system-ui, sans-serif;
  --font-mono: 'IBM Plex Mono', ui-monospace, monospace;
}
```

### Google Fonts (incluir en TODOS los .html):
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bagel+Fat+One&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/icon?family=Material+Symbols+Outlined" rel="stylesheet">
```

### Patrones CSS brutalistas:
```css
/* Card brutalista */
.card {
  background: var(--surface);
  border: 2px solid var(--outline);
  border-radius: 16px;
  box-shadow: var(--shadow);
  padding: 20px;
  transition: transform 0.15s, box-shadow 0.15s;
}
.card:hover {
  transform: translate(-2px, -2px);
  box-shadow: var(--shadow-lg);
}

/* Botón pill */
.btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 18px;
  border: 2px solid var(--outline);
  border-radius: 999px;
  font-family: var(--font-body);
  font-weight: 600; font-size: 14px;
  cursor: pointer;
  box-shadow: var(--shadow-sm);
  transition: transform 0.1s, box-shadow 0.1s;
}
.btn:hover {
  transform: translate(-2px, -2px);
  box-shadow: var(--shadow);
}
.btn:active {
  transform: translate(2px, 2px);
  box-shadow: none;
}
.btn.primary { background: var(--primary); color: white; }
.btn.danger { background: var(--secondary); color: white; }
.btn.warn { background: var(--tertiary); color: var(--ink); }
.btn.dark { background: var(--ink); color: var(--bg); }

/* Icono Material Symbols */
/* Siempre usar: <span class="material-symbols-outlined">icon_name</span> */
/* NUNCA usar Font Awesome, Lucide, Heroicons, ni emojis como íconos de UI */

/* Texto mono para datos */
.mono { font-family: var(--font-mono); }

/* Badge de estado */
.badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
```

### Micro-copy (estados del sistema):
| Estado | Palabra | Uso |
|--------|---------|-----|
| Loading | **Oído** | Algo se está procesando |
| Complete | **Servido** | Acción completada |
| Error | **Atrás** | Algo falló |
| Confirm | **Va** | Confirmación de acción |
| Sent to kitchen | **En fuego** | Pedido enviado a cocina |
| Setup | **Mise en place** | Configuración inicial |

## 6. SUPABASE — REGLAS CRÍTICAS

### Conexión desde HTML (client-side):
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script>
const SB_URL = 'https://jmkvphayyhwzootlybde.supabase.co';
const SB_KEY = 'sb_publishable_0-znERv1Ok0Dw-Re44eksw_QAOqDc8M';
const sb = supabase.createClient(SB_URL, SB_KEY);
</script>
```

### Desde Claude (server-side):
- **SIEMPRE usar Supabase MCP** (execute_sql, apply_migration, list_tables)
- **NUNCA usar curl/fetch a supabase.co** — el dominio NO está en el allowlist de red
- **DDL (CREATE/ALTER/DROP)** → usar `apply_migration`
- **DML (SELECT/INSERT/UPDATE)** → usar `execute_sql`

### Multi-tenant:
- Casa Italia: `marca_id = 'm6'`, `local_id = 'l11'`
- TODAS las queries deben filtrar por marca_id/local_id
- RLS actual: políticas temporales `tmp_all` (TODO: reemplazar antes de producción)

### Realtime:
```javascript
sb.channel('floor')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'ca_mesas' }, handleChange)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'ca_pedidos' }, handleChange)
  .subscribe()
```

## 7. LO QUE NUNCA DEBES HACER

1. **NO uses Tailwind en los archivos de la app** — la app usa CSS custom con variables. Tailwind solo se usa en la landing (repo separado prep-landing).
2. **NO uses React/Vue/Svelte** — son archivos HTML standalone con vanilla JS.
3. **NO uses Font Awesome, Heroicons, ni Lucide** — solo Material Symbols Outlined.
4. **NO hagas curl a supabase.co desde bash** — usa el MCP de Supabase.
5. **NO cambies el vercel.json sin agregar el rewrite del archivo nuevo.**
6. **NO uses colores hardcodeados** — usa las CSS variables (--primary, --secondary, etc.)
7. **NO uses inglés en la UI** — el sistema es en español (LATAM neutral, tuteo).
8. **NO inventes nombres de módulos** — los nombres son: Pase, POS (antes Caja), Línea, Bienvenida (antes Mesa), Mercado, Recetas, RRHH, Delivery, Contabilidad, Vuelto, El Libro, Directorio, Engagement.
9. **NO uses "clientes"** para referirse a los comensales del restaurante — usar "comensales", "invitados" o "huéspedes" según contexto.
10. **NO uses estas palabras en la UI:** revolucionario, game changer, AI-powered, disruptivo, innovador, artesanal, gastro (en inglés suena a gastroenterología).
11. **NO toques la landing (prep-landing)** desde un chat de módulo — la landing es un repo separado y se actualiza en su propio chat.

## 8. PROTOCOLO DE ACTUALIZACIÓN

Cuando construyas o modifiques un módulo:
1. **Edita el archivo .html del módulo** y pushea al repo `prep-platform`
2. **Si agregas un feature nuevo**, actualiza este CLAUDE.md: agrega el ID del feature (ej: CA-24) a la lista del módulo correspondiente en la sección de features
3. **NO actualices la landing** (prep.rest / repo prep-landing) — eso se hace en un chat separado de Landing que lee este CLAUDE.md como fuente de verdad
4. **NO modifiques archivos de otros módulos** a menos que el feature lo requiera explícitamente (ej: POS necesita leer inv_recetas, pero NO edita recetas.html)

La fuente de verdad del producto es este archivo. La landing se sincroniza desde aquí.

## 9. ARQUITECTURA MULTI-CLIENTE

```
prep.rest                     → Landing + Hub (/hub) — repo: prep-landing
casa-italia.prep.rest         → App operativa Casa Italia — repo: prep-platform
[restaurante].prep.rest       → App operativa de otro cliente — mismo repo: prep-platform
```

- Cada restaurante = subdominio apuntando al mismo `prep-platform`
- `marca_id` de la sesión filtra datos. Estética siempre igual.
- Nuevo cliente: INSERT marca+local+config en Supabase + CNAME en GoDaddy + dominio en Vercel

| Recurso | URL |
|---------|-----|
| Landing + Hub | prep.rest → repo `prep-landing` |
| App (todos) | [nombre].prep.rest → repo `prep-platform` |
| Supabase | jmkvphayyhwzootlybde.supabase.co |
| GitHub | github.com/franciscobarrientos64/ |

## 10. CASA ITALIA — DATOS SEED

- marca_id: `m6`, local_id: `l11`
- 13 mesas (M1-M12 + Barra) en 4 zonas (salón, terraza, reservado, barra)
- 6 estaciones: caliente, fría/antipasti, forno/pizza, dolci, bar, delivery
- 8 empleados: gerente, chef, anfitriona, 2 mozos, bartender, pizzaiolo, ayudante
- 18 items de menú (cocina + bar)
- Master password: `casaitalia2026`
- Geofence: lat -12.0931, lng -77.0465, radio 100m

## 11. TEMPLATE PARA NUEVO MÓDULO

Cada módulo nuevo debe seguir esta estructura HTML:
```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>[Nombre Módulo] · Prep!</title>
  <!-- Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Bagel+Fat+One&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link href="https://fonts.googleapis.com/icon?family=Material+Symbols+Outlined" rel="stylesheet">
  <!-- Supabase -->
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <style>
    :root {
      --primary: #1e5af9;
      --secondary: #ff3b30;
      --tertiary: #ffcc00;
      --bg: #fcf9f8;
      --surface: #ffffff;
      --ink: #171c20;
      --outline: #000000;
      --primary-soft: #d6e2ff;
      --primary-dark: #001a47;
      --gray-soft: #dfe3e8;
      --shadow-sm: 4px 4px 0 0 #000;
      --shadow: 8px 8px 0 0 #000;
      --shadow-lg: 12px 12px 0 0 #000;
      --font-display: 'Bagel Fat One', system-ui, sans-serif;
      --font-body: 'IBM Plex Sans', system-ui, sans-serif;
      --font-mono: 'IBM Plex Mono', ui-monospace, monospace;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--font-body);
      background: var(--bg);
      color: var(--ink);
      -webkit-font-smoothing: antialiased;
    }
    /* [agregar estilos del módulo aquí] */
  </style>
</head>
<body>
  <!-- Header -->
  <header style="padding: 12px 16px; display: flex; align-items: center; gap: 12px; border-bottom: 2px solid var(--outline);">
    <span style="font-family: var(--font-display); font-size: 24px; color: var(--primary);">prep<span style="color: var(--secondary);">!</span></span>
    <span style="font-family: var(--font-mono); font-size: 11px; color: var(--ink); opacity: 0.5;">[NOMBRE MÓDULO]</span>
  </header>

  <!-- Contenido del módulo -->
  <main style="padding: 16px;">
    <!-- Construir aquí -->
  </main>

  <script>
    const SB_URL = 'https://jmkvphayyhwzootlybde.supabase.co';
    const SB_KEY = 'sb_publishable_0-znERv1Ok0Dw-Re44eksw_QAOqDc8M';
    const sb = supabase.createClient(SB_URL, SB_KEY);

    // Inicialización
    async function init() {
      // Cargar datos de Casa Italia
      // marca_id = 'm6', local_id = 'l11'
    }
    init();
  </script>
</body>
</html>
```

**Después de crear el archivo:**
1. Agregar rewrite en vercel.json: `{ "source": "/nombre-modulo", "destination": "/nombre-modulo.html" }`
2. Actualizar index.html si el módulo reemplaza al actual
3. `git add . && git commit -m "Módulo X" && git push origin main`

## 12. ESTADO ACTUAL DEL PROYECTO (actualizar conforme se avance)

### Módulos construidos:
- **pos-v2.html** (126K) — POS con 3 bloques: floor plan realtime + editor de plano + toma de pedido + pantalla de cobro. Conectado a Supabase con datos reales de Casa Italia.
- **casa-italia.html** (72K) — Demo con 4 módulos en vivo (Pase, Caja, Línea, Mesa) + 9 previews. Se sirve como index.html en la raíz.

### Módulos legacy (versiones anteriores, mantener como referencia):
- pos-legacy.html, inventario.html, hub.html, reservas-spec.html, reservas-widget.html

### Módulos por construir:
- Bienvenida (bienvenida.html)
- Línea/KDS (linea.html)
- Pase/Dashboard (pase.html)
- Mercado (mercado.html)
- Recetas (recetas.html)
- RRHH (rrhh.html)
- Delivery (delivery.html)
- Contabilidad (contabilidad.html)
- Vuelto (vuelto.html)
- El Libro (el-libro.html)
- Directorio (directorio.html)
- Engagement (engagement.html)

### Landing (repo separado: prep-landing):
- index.html (356K) — Landing v7 con logo animado, 13 módulos, 404 page personalizada
- Pendiente: bilingüe EN/ES, separación FOH/BOH, soporte 24h
