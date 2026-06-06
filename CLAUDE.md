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
