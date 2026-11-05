# Prep! · POS · Casa Italia

Módulo POS del sistema Prep!, desplegado en `casa-italia.prep.rest`.

**Stack**: HTML estático + ES modules + Supabase JS client.
**Hosting**: Vercel (estático).
**DB**: Supabase PostgreSQL con RLS por `marca_id` + `local_id`.
**Realtime**: Websockets nativos de Supabase para sincronización entre tablets.

## Estado actual · MVP Bloque 1 (jun 2026)

### ✅ Implementado
- Login con master password (bcrypt + RPC `prep_login_master`)
- Sesión persistente 12h en `localStorage` + validación contra DB
- Floor plan con las 13 mesas de Casa Italia en coordenadas reales (`pos_x`/`pos_y`)
- Estados visuales: libre / ocupada / cuenta pedida (`estado_servicio`)
- Tiempo transcurrido en cada mesa (auto-refresh cada 30s)
- Drag & drop para mover clientes entre mesas
- Abrir turno + abrir pedido con selección de mozo
- Vista de pedido con items agrupados por course/tiempo
- Menú navegable: Cocina (Antipasti, Pastas, Pizzas, Risotti, Carnes, Postres) + Bar (Cócteles, Vinos, Aguas)
- Agregar items al pedido con cálculo automático de totales (subtotal + servicio + IGV)
- Marchar items a cocina ("En fuego") con `enviado_cocina_at`
- Routing automático a estación según `inv_recetas.estacion_id`
- Suspender / cancelar pedido
- Realtime sync entre tablets (cambios visibles instantáneamente)
- Audit log universal en cada acción
- Neo-brutalismo cálido aplicado (tokens del brand system)
- Responsive mobile-first (tablet de mesero)

### 🔜 Próxima iteración (bloque 2)
- Sillas y alergias por silla (CA-18 / CA-22) — schema ya migrado con `seat_position`
- Modificadores complejos por ítem (CA-10) — campo `modificadores jsonb` listo
- Cobro completo: split por ítem o proporción (CA-03)
- Métodos de pago: efectivo, Yape, Plin, tarjetas, MP, Izipay (CA-08)
- Propinas con distribución a RRHH (CA-11)
- Cortesías con workflow de aprobación (CA-07)
- Gift cards (CA-13) — tabla `ca_gift_cards` lista
- Customer-facing display (CA-14) — vista `caja_customer_display` ya creada
- Tableside ordering con QR (CA-05)
- Comprobante: decisión pendiente entre PDF interno o Nubefact (CA-09)
- Cierre de turno con totales y cuadre

## Estructura

```
pos/
├── index.html              # Shell + router + bootstrap
├── env.js                  # SUPABASE_URL + ANON_KEY (públicas)
├── vercel.json             # Headers + cache
├── css/
│   ├── brand.css           # Design tokens · neo-brutalismo cálido
│   └── pos.css             # Layouts de pantallas
└── js/
    ├── supabase-client.js  # Cliente + auth + audit
    ├── state.js            # Estado global reactivo + realtime subs
    ├── utils.js            # DOM, money, toast, modal
    ├── login.js            # Pantalla de ingreso
    ├── floor-plan.js       # Vista de mesas + drag&drop + realtime
    ├── pedido.js           # Vista de pedido en mesa
    └── menu.js             # Navegación de menú Cocina/Bar
```

## RPCs activos en DB

- `prep_login_master(p_marca, p_local, p_password)` → valida bcrypt, bloquea tras 5 intentos, devuelve token de 32 bytes
- `prep_validar_sesion(p_token)` → verifica expira_at y refresca `ultima_actividad`

## Migraciones aplicadas

1. `prep_pos_estado_servicio_y_auth_rpcs` — columna `estado_servicio` en `ca_pedidos`, extensión pgcrypto, RPCs de auth
2. `prep_pos_rpcs_fix_search_path` — corrección de `search_path` para resolver `crypt()` desde schema `extensions`
3. `prep_pos_seat_position_y_customer_display_v2` — columnas `seat_position`, `urgente` en `ca_pedido_items`, `alergias_por_silla` en `ca_pedidos`, y vista `caja_customer_display`

## Credenciales

La master password de Casa Italia está almacenada como hash bcrypt en `auth_master_passwords` para `marca_id='m6'`. **No se versiona en este repo**. Se entrega por canal seguro al gerente del local.

## Próximos pasos sugeridos

1. Validar visualmente que las 13 mesas se vean en posición correcta
2. Hacer un pedido de prueba end-to-end (abrir → agregar items → marchar → ver en sidebar)
3. Configurar dominio `casa-italia.prep.rest` apuntando al deploy de Vercel
4. **Tarea futura**: limpiar las 105 tablas del proyecto Supabase (vestigios de proyectos anteriores) o migrar Prep a un proyecto Supabase nuevo dedicado

---

Prep! · Mise en place
