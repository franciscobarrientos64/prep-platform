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
git config user.email "franciscobarrientos64@gmail.com"
git config user.name "Francisco Barrientos"
# IMPORTANTE: el email del commit DEBE ser el de la cuenta de Vercel/GitHub
# (franciscobarrientos64@gmail.com). Si el autor del commit no pertenece a tu
# cuenta, Vercel descarta el deploy silenciosamente (el push llega a GitHub pero
# no se construye). NO usar otros emails (ej. francisco@prep.rest).

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
- **bienvenida.html** — Módulo 04 (reservas/anfitrión). Vistas: Agenda (libro de reservas), Timeline (Gantt mesas×horas + turn-time), Mapa (floor plan con asignación drag&drop), Waitlist (prioridades + pantalla pública), Comensales (CRM ligero). Widget público en `/reservar` o `?widget=1`.
  - **Implementados (14/16):** MS-01 (reserva manual + widget), MS-02 (ficha + historial), MS-03 (VIP/alergias/preferencias/tags), MS-04 (floor plan — reusa canvas POS), MS-05 (card hold anti no-show · mock Culqi), MS-06 (waitlist + notify), MS-07 (prioridad salud), MS-08/MS-09 (pantalla pública de waitlist), MS-11 (allergen surface en tarjetas), MS-12 (timeline Gantt), MS-13 (drag&drop reserva→mesa), MS-14 (prioridades obligatorias), MS-15 (registro de comensal), MS-16 (confirmación automática · mock WhatsApp).
  - **Mock (a integrar):** WhatsApp/SMS (Meta API/Resend) y Culqi están simulados (`mockMensaje`, card hold). MS-10 (bot WhatsApp de reservas) queda como punto de integración.
  - **Integración POS:** al "Sentar" una reserva/walk-in se crea un `ca_pedidos` real (con `cliente_id`) y se enlaza vía `ms_reservas.pedido_id`/`mesa_id`. Usa tablas `ms_clientes`, `ms_reservas`, `ms_waitlist`, `ms_card_holds`, `ms_floor_plans` + `ca_mesas`.
  - **CRM de comensales (guest 360):** `ca_pedidos.cliente_id` vincula cada pedido a un comensal. Al cerrar un pedido, el trigger `trg_pedido_visita` registra una fila en `ms_visitas` (spine) y llama a `recompute_cliente_stats(cliente_id)` (SECURITY DEFINER) que recalcula automáticamente en `ms_clientes`: `total_visitas`, `total_gastado`, `ticket_promedio`, `ticket_max`, `primera/ultima_visita`, `dias_entre_visitas`, `propina_pct_prom`, `grupo_tipico`, `dia_habitual`, `platos_favoritos` (jsonb top-5) y `segmento` (nuevo/habitual/vip/en_riesgo/inactivo). Campos manuales añadidos: `aniversario`, `bebida_preferida`, `dieta[]`, `zona_preferida`, `mozo_preferido_id`, `empresa`, `instagram`, `como_nos_conocio`, `platos_no[]`, `idioma`, `foto_url`. Tablas auxiliares: `ms_visitas` (1 fila/visita) y `ms_cliente_fechas` (fechas especiales N:1). Vista `ms_cliente_platos` para reportes. **Consentimiento de marketing (Ley 29733):** `ms_clientes.acepta_marketing` + `consentimiento_at`. Opt-in explícito capturado en el registro de comensal (editor MS-15) y en el widget público de reservas (nunca revoca un consentimiento previo desde el widget). Engagement solo arma audiencias con `acepta_marketing=true`; la ficha permite otorgar/retirar el consentimiento.
- **pos-v2.html** — POS con floor plan realtime + editor de plano + toma de pedido + pantalla de cobro. Conectado a Supabase con datos reales de Casa Italia.
  - **Implementados (21/23):** CA-01, CA-02 (course timing + marchar por tiempo), CA-03 (split por proporción y por ítem), CA-04 + CA-18 (tabs de barra concurrentes con nombre y asientos agrupados), CA-06 (impresión real de comandas por estación, 80mm), CA-07 (cortesías con aprobación de gerente), CA-08 (multipago, fix `mercado_pago`), CA-10 (modificadores priceados), CA-11, CA-12 (audit log → tabla `ca_audit`, RLS por tenant; registra abrir/cancelar pedido, agregar ítem, cortesía con aprobador, cobro; visor en `/audit` accesible desde el header del POS), CA-13 (gift cards: vender + recargar + cobrar), CA-14 (customer-facing display en `/display`, realtime de ítems+total, se abre con el botón `cast` desde la pantalla de pedido), CA-15, CA-16, CA-17, CA-19, CA-20, CA-21, CA-22 (captura/edición de alergias por silla + extrapolación a compartidos), CA-23 (pre-cuenta imprimible).
  - **Pendientes (2/23):** CA-05 (tableside QR — parcialmente cubierto por la carta digital `/m?mesa=` que crea `ca_pedidos`; falta el flujo de mesa con cuenta abierta) y CA-09 (facturación SUNAT/Nubefact, requiere alta del cliente).
  - **Nota DB:** se agregó columna `ca_pedidos.tab_nombre` (text) para las tabs de barra. La impresión usa `li_estaciones.impresora_ip/impresora_nombre`.
  - **Comensal del pedido (CRM):** botón "Comensal" en la pantalla de pedido para buscar/crear y asignar `ca_pedidos.cliente_id` (atribuye walk-ins directos del POS). Al cerrar la cuenta, el trigger `trg_pedido_visita` alimenta el guest 360 (ver módulo Bienvenida). Avisa de alergias del comensal al asignarlo.
- **casa-italia.html** (72K) — Demo con 4 módulos en vivo (Pase, Caja, Línea, Mesa) + 9 previews. Se sirve como index.html en la raíz.

### Módulos legacy (versiones anteriores, mantener como referencia):
- pos-legacy.html, inventario.html, hub.html, reservas-spec.html, reservas-widget.html

### Módulos construidos (al 2026-06-07) — 12/13 + carta pública:
- **casa-italia.html** (= index.html, ruta `/`) — HUB del sistema: tarjetas de módulos (con color por módulo, fondo cuadrícula) + dashboard en vivo (KPIs clicables, ventas 7d, próximas reservas, alertas, inventario). Logo PREP! negro; clic en logo → hub.
- **pos-v2.html** (`/pos`) — POS (19/23 CA features).
- **kds.html** (`/kds`, `/linea`) — Línea/KDS: comandas en vivo de `ca_pedido_items`, estados Oído→Va→En fuego→Servido, filtro por estación, timers, pantalla oscura.
- **bienvenida.html** (`/bienvenida`, `/reservar`) — Reservas/anfitrión (Agenda, Timeline, Mapa, Waitlist, Comensales/CRM).
- **mercado.html** (`/mercado`) — Compras+Inventario: Inventario (PAR, stock exacto vía vista `inv_stock_actual`), Carga rápida (recepción + conteo con doble aprobación + anomalías + unidad editable), Armar pedido (completar PAR, configurar insumo, alertas merma/+20%), Compras (comparativo proveedores+webs con alerta más barato + comprobante PDF/foto + control de pago), Mermas, Movimientos, **Teórico vs real** (consumo por recetas + auto-depleción), Reportes (ahorro, reposición, vendor scoring ME-06, etc., clic→detalle).
- **recetas.html** (`/recetas`) — Costeo/food cost ligado a Mercado (merma por ingrediente, escalado 1→N, precio sugerido, ficha técnica imprimible), carga manual/texto/foto, **Carta** (activar/desactivar + sección), **Menús** (combos con costeo auto). Tablas: inv_recetas (+etapas jsonb), inv_menus.
- **carta.html** (`/carta`, `/menu`, `/m?mesa=`) — Carta digital pública (QR): menú por secciones desde recetas activas; el pedido crea `ca_pedidos` (origen qr)+items en estado oido → entra a POS y KDS. Pedir la cuenta (mock).
- **rrhh.html** (`/rrhh`) — Equipo+fichas, **Asistencia biométrica** (selfie por cámara + geolocalización/geofence; foto a bucket privado `rrhh-files`, visor por URL firmada; bloquea si geofence estricta y fuera de rango), **Planilla Perú** (descuentos ONP 13% / AFP 10%+comisión+prima configurables por persona, renta 5ta estimada, EsSalud 9% empleador, neto y costo empresa), **Turnos**. Tablas: rrhh_* + `rrhh_empleados.{sistema_pension,afp_nombre,afp_comision_pct,afp_prima_pct}` + `rrhh_asistencia.{foto_entrada_url,foto_salida_url,metodo_verif}`.
- **prediccion.html** (`/prediccion`) — IA predictiva **estadística (costo cero, sin API externa)**: pronóstico de ventas/cubiertos próximos 7 días (promedio por día de semana × factor de tendencia), qué preparar mañana (mix de platos por día), horas pico, detección de días atípicos (±2σ). Sobre ca_pedidos/ca_pedido_items. Tile en el hub (mapeado a 'directorio' para acceso).
- **apikeys.html** (`/api`, solo super admin) — API pública: gestión de keys (`prep_api_keys`) + documentación. Edge Function **`public-api`** (auth por API key, scopes ventas/productos/inventario, scoped por marca, CORS). 
- **estrategia.html** (`/estrategia`) — ver Consolas Super Admin.
- **delivery.html** (`/delivery`) — Pedidos (flujo recibido→…→entregado, canal propio/Rappi/PedidosYa), Repartidores, Zonas (tarifa/tiempo). Tablas dl_pedidos/dl_repartidores/dl_zonas.
- **finanzas.html** (`/finanzas`, `/contabilidad`) — Módulo 09 (Finanzas/Contabilidad): presupuesto general (plantilla de partidas + recurrentes), presupuesto vs real con variación y alertas por umbral, real automático desde POS/Mercado/Vuelto. Tablas fin_partidas + fin_real.
- **vuelto.html** (`/vuelto`) — Caja chica: gastos por voz/foto/manual, centro de costo, aprobación de supervisor, cierre diario. "Powered by Haüs". Tabla vu_gastos.
- **el-libro.html** (`/el-libro`, `/libro`) — Intranet: Tablón (comunicados), Procedimientos/SOPs, Checklists (run diario), Bitácora. Tablas lb_posts/lb_checklists/lb_checklist_runs/lb_bitacora.
- **directorio.html** (`/directorio`) — Reportes ejecutivos consolidados (ventas, food cost, labor%, utilidad, top platos, operación, P&L vs presupuesto) por hoy/7d/mes.
- **engagement.html** (`/engagement`) — CRM 360 + Loyalty (niveles+puntos, eng_puntos) + Campañas (audiencias + WhatsApp, eng_campanas).
- **Multi-sede:** `client-name.js` inyecta un selector de sede en el header de todos los módulos cuando la marca tiene 2+ locales (persiste en `prep_ctx`, recarga). Directorio ya consolida por sede (acotado por marca vía RLS).
- **Pasarelas de pago (#7, scaffold multi):** soporta **Niubiz, Culqi e Izipay simultáneamente** por local (Casa Italia usa **Niubiz**). `config_local.{niubiz_activa,niubiz_merchant_id,niubiz_modo, culqi_activa,culqi_public_key, izipay_activa,izipay_public_key,izipay_shop_id}` editable en `/ajustes`; tabla `ca_pagos_online`; Edge Function **`cobro-tarjeta`** (verify_jwt) enruta por `pasarela`:
  - **Niubiz** (multi-paso): `{accion:'session'}` crea sessionKey (front abre checkout) → `{accion:'authorize'}` con el transactionToken autoriza. Secrets `NIUBIZ_USER`/`NIUBIZ_PASSWORD`; merchantId+modo (test/prod) en config.
  - **Culqi**: token→charge síncrono (`CULQI_SECRET_KEY`).
  - **Izipay**: Lyra/PayZen CreatePayment→formToken (`IZIPAY_PASSWORD` + shopId).
  - **Pendiente activación:** cargar llaves sandbox (públicas/merchantId en /ajustes, secretas como env del edge function) + enlazar la tokenización/checkout en el POS (pos-v2).
- **Edge Functions Supabase:** `public-api` (API pública por key) y `cobro-tarjeta` (cobro con tarjeta). Se despliegan vía MCP `deploy_edge_function`.

### Dominios y acceso (al 2026-06-08)
- **prep.rest** → web de marketing (repo prep-landing). Redirige /portal /login /app /prep /admin /negocio → os.prep.rest.
- **os.prep.rest** → la APP completa (este repo prep-platform): login, hub, módulos y consolas super admin. Es la casa del super admin.
- **casa-italia.prep.rest** → subdominio del cliente Casa Italia: carga su data sola (m6/l11) vía `tenant.js`.
- Para un cliente nuevo con su URL: agregar subdominio en Vercel+DNS y mapearlo en `tenant.js` (SUB). Futuro: resolución por `slug` en BD (sin tocar código).

### Auth, multi-tenant y rótulos (scripts compartidos en `<head>`)
- **auth-guard.js** — login obligatorio en toda la app; redirige a /login si no hay sesión. Públicas: /carta /menu /m /pedir /reservar /login.
- **tenant.js** — fija `window.PREP_MARCA`/`window.PREP_LOCAL` desde subdominio cliente, o `?marca=&local=`, o localStorage `prep_ctx`, o default m6/l11. Los módulos leen estas variables (ya NO m6/l11 fijo).
- **client-name.js** — pone el nombre del cliente activo en el header de cada módulo.
- Login: Supabase Auth (email+clave o magic link) en `login.html`. Cuenta super admin: franciscobarrientos64@gmail.com.

### Consolas Super Admin (solo superadmin)
- **portal.html** (/portal) — Portal: herramientas (Consola/Usuarios/Negocio) + dropdown de clientes con grilla de módulos por marca.
- **prep.html** (/prep) — Consola de módulos: activar/desactivar por cliente y **por feature** con dependencias.
- **admin.html** (/admin) — Usuarios & permisos (roles con niveles ver/operar/aprobar/admin).
- **prep-negocio.html** (/prep-negocio) — Negocio: suscripciones (plan/estado/precio), MRR/ARR, morosos, pagos, facturación.
- **estrategia.html** (/estrategia) — Estrategia (solo lectura/planeamiento): tabs Hardware (plan del negocio paralelo de fierro), Comercialización (GTM, planes, canales, métricas), Financiamiento (opciones de capital + checklist), Competidores (nacionales e internacionales). Enlaza al benchmark `/analisis`.
- Tablas: prep_usuarios, prep_roles, prep_marca_modulos, prep_marca_features, prep_suscripciones, prep_pagos.

### Seguridad / RLS (estado al 2026-06-08)
- Helpers en BD: `prep_is_super()`, `prep_marca()`, `prep_can_marca(text)`, `prep_can_local(text)` (SECURITY DEFINER).
- **RLS por tenant ACTIVO** en: prep_* (capa 1), y CRM/loyalty/finanzas/caja/RRHH (capa 2 sensibles) y ventas/inventario/delivery/reservas/El Libro (capa 2 operativas). Verificado: anon solo ve `carta_publica`; super ve su data; ajeno autenticado ve 0.
- **carta_publica** = vista pública con solo columnas no sensibles (sin ingredientes/costos); carta/pedir leen de ahí e insertan con uuid de cliente.
- **Funciones endurecidas** (2026-06-10): `verificar_password_maestra` y `rotar_password_maestra` con `search_path` fijo; `EXECUTE` revocado a anon/authenticated en esas dos + `recompute_cliente_stats` y `trg_pedido_visita` (solo se invocan vía trigger, corren como owner). NO revocar EXECUTE en `prep_is_super/prep_marca/prep_can_marca/prep_can_local/prep_validar_sesion` (se usan dentro de las políticas RLS) ni en `prep_login_master`/`get_tarjeta` (anon los necesita).
- **OJO — proyecto Supabase compartido**: `jmkvphayyhwzootlybde` aloja también otras apps (tablas `health_*`, `cuentos_*`, `farmacias`, `medicamentos`, `tasks`, `projects`, `grafo_*`, `cs_*`, etc.). Los advisors mezclan todo. **Solo tocar tablas/funciones de Prep** (prefijos ca_/ms_/inv_/li_/dl_/rrhh_/fin_/vu_/lb_/eng_/prep_ + config_local, ca_audit, auth_sesiones).
- **Barrido RLS tenant (2026-06-10, HECHO):** 24 tablas Prep pasaron de `always_true` al patrón tenant (`prep_can_local(local_id)` / `prep_can_marca(marca_id)` / join al padre, rol `authenticated`) — migraciones `prep_rls_tenant_sweep_always_true` + `prep_rls_tenant_sweep_rrhh_empleado`. Verificado en vivo: extraño ve 0 filas, staff m6 ve solo su data, `prep_usuarios` oculta al superadmin del staff. `ca_pedidos/ca_pedido_items/dl_pedidos` ya estaban bien (su flag era por el `anon_insert` intencional de la carta pública). Las funciones helper son `postgres`+`bypassrls`, así que no hay recursión al leer prep_usuarios/inv_locales.
- **PENDIENTE seguridad**: 5 tablas siguen `always_true` a propósito porque NO tienen columna de tenant — `inv_proveedores`, `rrhh_formatos`, `rrhh_roles` (catálogos globales: decidir si por-marca con `marca_id`+backfill), `inv_transferencias` (sin FK declarada), `alertas_precio` (no parece de Prep). Bucket `recetas-files` queda público a propósito (fotos de la carta pública). **Rotar service_role key + token GitHub** y activar HIBP/MFA/2FA → acción del dueño en el dashboard.
- Regla: toda tabla nueva → habilitar RLS con política por tenant (no `tmp_all` en producción).

### Pendientes (backlog):
- **Pase** (dashboard ejecutivo dedicado) — hoy cubierto por el hub + Directorio.
- **SUNAT** — facturación electrónica (boleta/factura/NC vía PSE/OSE). CRÍTICO Perú, construir cuando el cliente esté listo.
- v2 por módulo: POS (tips/giftcards/kiosko/offline), OCR de recibos/recetario con IA (requiere API key Anthropic), multi-sucursal en Directorio. (Ya hechos: KDS multicanal, Delivery página pública /pedir, Engagement email+reseñas, Recetas sub-recetas + ingeniería de menú + "qué preparar".)
- Multi-tenant fino: rótulos 100% por cliente, resolución por slug, RLS para que admin_marca solo gestione su marca.

### Landing (repo separado: prep-landing):
- index.html (356K) — Landing v7 con logo animado, 13 módulos, 404 page personalizada
- Pendiente: bilingüe EN/ES, separación FOH/BOH, soporte 24h

## 13. FEATURES POR MÓDULO (IDs estables)

### Pase (#01 · Dashboard)
- PA-01 [MVP] Pase en vivo: cubiertos, ventas, food cost, ticket promedio, labor cost
- PA-02 [MVP] Comparativo entre sedes lado a lado
- PA-03 [MVP] Menu engineering matrix (stars/plowhorses/puzzles/dogs)
- PA-04 [MVP] Alertas push al celular del dueño
- PA-05 [MVP] Reportes cross-module configurables
- PA-06 [F2] Reportes a medida para Directorio
- PA-07 [F3] Analytics predictivo

### POS (#02 · antes Caja)
- CA-01 [MVP] Ingreso de pedidos por mozo
- CA-02 [MVP] Course timing (urgente, marchar, dividir por pasos)
- CA-03 [MVP] Split bills (por ítem o proporción)
- CA-04 [MVP] Open tabs (cuentas abiertas, barra)
- CA-05 [MVP] Tableside ordering con QR
- CA-06 [MVP] Print station routing automático
- CA-07 [MVP] Cortesías con workflow de aprobación
- CA-08 [MVP] Multi-método de pago (efectivo, Yape, Plin, MP, Izipay, tarjetas)
- CA-09 [MVP] Facturación SUNAT vía Nubefact
- CA-10 [MVP] Modificadores complejos por ítem
- CA-11 [MVP] Captura de propinas en cobro
- CA-12 [MVP] Audit log universal
- CA-13 [MVP] Gift cards: vender, recargar, cobrar
- CA-14 [MVP] Customer-facing display
- CA-15 [MVP] Suspended ticket (pausar y retomar)
- CA-16 [MVP] Floor plan en tiempo real, colores por estado
- CA-17 [MVP] Mover clientes entre mesas
- CA-18 [MVP] Sillas de barra visibles, agrupables en un pedido
- CA-19 [MVP] Zoom-in a mesa: posiciones de silla, ítems por silla o compartidos
- CA-20 [MVP] Menú por familias: Cocina (Entradas/Fondos/Postres) y Bar (Cócteles casa/Clásicos/Sin alcohol/Bebidas calientes)
- CA-21 [MVP] Notas por ítem: términos carne, instrucciones cocina
- CA-22 [MVP] Alergias por posición de silla, extrapolable a compartidos
- CA-23 [MVP] Flujo cobro secuencial: Cobrar → total+dividir → pre-cuenta → boleta/factura → método pago → registro+propina

### Línea (#03 · KDS)
- LI-01 [MVP] KDS principal (Pase del expedidor)
- LI-02 [MVP] KDS dedicado para delivery
- LI-07 [MVP] Priorización por course timing
- LI-09 [F2] Alerta de merma anómala
- LI-10 [MVP] Print station routing
- LI-11 [MVP] Colores por tiempo: verde (<5min), amarillo (5-10min), rojo (>10min)
- LI-12 [MVP] Touch para cambiar estado: oído → va → fuego → servido
- LI-13 [MVP] Sonido/vibración al recibir comanda

### Bienvenida (#04 · antes Mesa)
- MS-01 [MVP] Reservas con widget embeddable (0% fee)
- MS-02 [MVP] Ficha de cliente con historial
- MS-03 [MVP] VIP, alergias, pedidos especiales
- MS-04 [MVP] Floor plan editor visual
- MS-05 [MVP] Card hold anti no-show
- MS-06 [MVP] Waitlist con SMS/WhatsApp
- MS-07 [MVP] Waitlist con prioridad por salud
- MS-08 [F2] Pantalla pública de waitlist
- MS-09 [F2] Waitlist visible en web pública
- MS-10 [MVP] WhatsApp Business bot de reservas
- MS-11 [MVP] Allergen surface visible al mozo
- MS-12 [MVP] Vista Gantt: timeline de mesas por hora
- MS-13 [MVP] Floor Plan con drag-and-drop para reservas
- MS-14 [MVP] Prioridades obligatorias: adultos mayores, embarazadas, niños, discapacitados
- MS-15 [MVP] Registro nuevos comensales: nombre, apellido, teléfono, alergias, celebración
- MS-16 [MVP] WhatsApp: botón aceptar → confirmación automática

### Mercado (#05 · Compras + Inventario)
- ME-01 [MVP] Comparativo de compras entre proveedores
- ME-02 [MVP] Tracking histórico de precios
- ME-03 [MVP] Alerta de variación de precio
- ME-04 [MVP] Alerta de impacto en food cost
- ME-05 [MVP] OCR de facturas de proveedor
- ME-06 [F2] Vendor scoring
- ME-07 [MVP] Inventario por sede y almacén
- ME-08 [MVP] Registro de mermas con motivo
- ME-09 [MVP] Alertas de vencimiento (FEFO)
- ME-10 [MVP] Registro automático de facturas para Contabilidad
- ME-11 [F2] Inventario predictivo
- ME-12 [MVP] Conteo físico con modo ciego
- ME-13 [MVP] Órdenes de compra con aprobación
- ME-14 [MVP] FIFO tracking por lotes
- ME-15 [MVP] Multi-sede con transferencias

### Recetas (#06 · Costeo)
- RC-01 [MVP] Ingreso de recetas con ingredientes y gramajes
- RC-02 [MVP] Costeo automático en tiempo real
- RC-03 [MVP] Food cost actualizado permanentemente
- RC-04 [MVP] Recipe scaling automation
- RC-05 [MVP] Alertas de vencimientos
- RC-06 [MVP] Menu engineering matrix
- RC-07 [MVP] Ficha de receta imprimible
- RC-08 [MVP] Alergenos por receta
- RC-09 [F2] Sub-recetas reutilizables

### RRHH (#07 · Personal)
- RH-01 [MVP] Convocatorias y ofertas de trabajo
- RH-02 [MVP] Contratos digitales
- RH-03 [MVP] Manuales del puesto con versionado
- RH-04 [MVP] Ficha completa (CV, historial, The Talk)
- RH-05 [MVP] Intranet operativa
- RH-06 [MVP] Asistencia con geofence
- RH-07 [MVP] Permisos y vacaciones digital
- RH-08 [MVP] Planilla con un click
- RH-09 [MVP] Carrera de servicio y mejora continua
- RH-10 [MVP] Dashboard de status por trabajador
- RH-11 [MVP] Shift scheduling con conflictos
- RH-12 [MVP] Labor cost en tiempo real
- RH-13 [MVP] Shift swap online
- RH-14 [MVP] Tip pooling automation

### Delivery (#08)
- DE-01 [MVP] Pedidos delivery con KDS dedicado
- DE-02 [MVP] Marketplace propio (0% comisión)
- DE-03 [MVP] Online ordering sin Rappi/PedidosYa
- DE-04 [F2] Dark kitchen multi-brand
- DE-05 [F2] Catering y eventos
- DE-06 [F2] Tracking de estado
- DE-07 [F2] Zonas de cobertura con tarifas

### Contabilidad (#09 · antes Tributario)
- TR-01 [MVP] Registro automático de facturas desde Mercado
- TR-02 [MVP] Integración ContaFácil
- TR-03 [F2] Pre-liquidación PDT 621
- TR-04 [F2] Servicio contador Prep!
- TR-05 [MVP] Libro de ventas/compras pre-armado
- TR-06 [MVP] Cierre mensual automatizado

### Vuelto (#10 · Caja chica)
- VU-01 [MVP] OCR de recibos con IA
- VU-02 [MVP] Clasificación automática por centro de costo
- VU-03 [MVP] Cierre diario automático
- VU-04 [MVP] Límites por empleado con alertas
- VU-05 [MVP] Aprobación de gastos por supervisor

### El Libro (#11 · Intranet)
- LB-01 [MVP] Manuales operativos con versiones
- LB-02 [MVP] HACCP digital
- LB-03 [MVP] Recetario consultivo para cocina
- LB-04 [F2] Marketplace de plantillas
- LB-05 [MVP] Onboarding por rol

### Directorio (#12 · Reportes / BI)
- DI-01 [MVP] KPIs estratégicos cross-module
- DI-02 [MVP] Reportes a medida
- DI-03 [MVP] Dashboards, time-series, comparativos, drill-down
- DI-04 [MVP] Exports PDF y Excel
- DI-05 [MVP] Reportes programados WhatsApp/email
- DI-06 [MVP] Alertas cuando KPI se desvía

### Engagement (#13 · Loyalty + CRM)
- TX-01 [F2] Loyalty en WhatsApp
- TX-02 [F2] Multilenguaje del menú
- TX-03 [F2] App nativa iOS/Android
- TX-04 [F2] API pública
- TX-05 [F3] Marketplace plantillas
- EN-01 [F2] Catering y eventos
- EN-02 [F2] Dark kitchen multi-marca
- EN-03 [F3] Analytics predictivo
- EN-04 [F2] Campañas segmentadas

#### Sub-módulo: Voz del Cliente (reemplaza a "Mystery Shopper" como contenedor)
"Mystery Shopper" era demasiado específico. El contenedor ahora se llama **Voz del Cliente** (Voice of Customer) y agrupa TRES formas de medir la experiencia del comensal. Archivo: `voz-cliente.html` (renombrar desde `mystery.html`, manteniendo el contenido de Mystery Shopper como una pestaña interna).

**Pestaña 1 — Mystery Shopper** (ya construido en mystery.html):
- VC-01 [F2] Evaluaciones de comprador incógnito con checklist configurable
- VC-02 [F2] Scoring por categorías (servicio, comida, limpieza, ambiente, tiempos)
- VC-03 [F2] Fotos y evidencia adjunta por evaluación
- VC-04 [F2] Comparativo de evaluaciones entre sedes y en el tiempo

**Pestaña 2 — Encuestas** (nuevo):
- VC-05 [F2] Constructor de encuestas (NPS, CSAT, preguntas abiertas y cerradas)
- VC-06 [F2] Envío post-visita automático por WhatsApp/email (al cerrar cuenta en POS, usando teléfono de Bienvenida)
- VC-07 [F2] QR en mesa/boleta para encuesta rápida
- VC-08 [F2] Dashboard de resultados: NPS, CSAT, tendencias, segmentación por sede/mozo/plato
- VC-09 [F2] Alertas por respuesta negativa para seguimiento inmediato

**Pestaña 3 — Reseñas** (inspirado en Cinquo, tabla `eng_resenas`):
- VC-10 [F2] Monitor de reviews Google + TripAdvisor: rating real (sin redondeo), reviews sin responder, tendencias
- VC-11 [F2] Solicitud automática post-visita: al cerrar cuenta en POS, WhatsApp con link directo a Google review
- VC-12 [F2] QR trackeable por mesero/mesa para saber quién genera mejores reviews
- VC-13 [F2] Respuestas con IA usando contexto del comensal (qué pidió, cuántas visitas, si es VIP) — ventaja sobre Cinquo que solo ve el texto
- VC-14 [F2] Compartir reseñas en redes con templates de marca
- VC-15 [F2] Alertas de reputación (caída de rating, review negativo, reviews sin responder >24h)
- VC-16 [F3] Correlación review↔operación: cruzar review negativo con la mesa/turno/mozo de esa noche para detectar patrones (EXCLUSIVO de Prep!, Cinquo no puede)

**Diferenciador comercial vs Cinquo:** Prep! ya sabe quién comió, qué pidió y cuánto gastó. Cinquo es externo y solo ve el texto del review. Prep! sugiere la respuesta con el contexto real de esa visita y correlaciona reseñas con la operación.

**Integraciones técnicas necesarias:** Google My Business API (lectura + respuesta de reviews), TripAdvisor Content API, WhatsApp Business API (compartida con Bienvenida), LLM para respuestas (Claude API).

## 14. ALFRED — Sistema de Project Management

Alfred es el sistema interno de gestión de proyectos de Francisco. Vive en la MISMA base de datos Supabase (proyecto `jmkvphayyhwzootlybde`).

### Proyecto Prep! en Alfred:
- project_id: `1558b18d-cf1f-4f3a-a36a-5b2e05004aab`
- code: `prep`
- status: `active`

### Tablas de Alfred:
| Tabla | Qué almacena |
|-------|-------------|
| `projects` | Proyectos (Prep! es uno de ellos) |
| `tasks` | Tareas y milestones (is_milestone=true). Campos: title, status, priority, section, parent_task_id, assignee, due_date, estimated_hours |
| `task_comments` | Comentarios en tareas |
| `task_labels` | Etiquetas de tareas |
| `decisions` | Decisiones de arquitectura/producto con contexto y fase (phase_number) |
| `work_sessions` | Sesiones de trabajo registradas |
| `sessions_log` | Log de sesiones |
| `project_costs` | Costos del proyecto |
| `prep_marca_features` | Features por marca/módulo |
| `non_working_days` | Días no laborables |

### Cuándo usar Alfred:
- **Registrar una decisión importante:** INSERT en `decisions` con project_id, decision, context, phase_number
- **Marcar un feature como completado:** UPDATE en `tasks` SET status='done', completed_at=now()
- **Registrar sesión de trabajo:** INSERT en `sessions_log`
- **Ver qué falta:** SELECT de tasks WHERE project_id='1558b18d...' AND status != 'done'

### Cómo acceder desde Code:
Desde Code (en la máquina de Francisco), puedes hacer queries a Supabase via curl o usando el CLI de Supabase. Ejemplo:
```bash
# Query directa via REST API
curl -s "https://jmkvphayyhwzootlybde.supabase.co/rest/v1/tasks?project_id=eq.1558b18d-cf1f-4f3a-a36a-5b2e05004aab&status=neq.done&select=title,status,priority,section" \
  -H "apikey: sb_publishable_0-znERv1Ok0Dw-Re44eksw_QAOqDc8M" \
  -H "Authorization: Bearer sb_publishable_0-znERv1Ok0Dw-Re44eksw_QAOqDc8M"
```

### Al terminar una sesión de trabajo:
1. Actualizar tasks completados en Alfred
2. Registrar decisiones importantes tomadas
3. Actualizar CLAUDE.md sección 12 (estado del proyecto)
