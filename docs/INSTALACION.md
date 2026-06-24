# 📕 Libro de Instalación — Prep! para Casa Italia

> Manual completo de puesta en marcha del sistema operativo de restaurante **Prep!**
> Cliente: **Casa Italia** · Marca `m6` · Local `l11` · Lima, Perú
> Dominio del cliente: **casaitalia.rest** · App: **prep-platform** (Vercel + Supabase)
> Versión del documento: 1.0 · Generado el 2026-06-24 · Meta de go-live: **≤ 2 días**

---

## Cómo usar este libro

El libro está ordenado en **fases secuenciales**. Cada fase tiene: objetivo, responsable, pasos y un mini-check. Al final hay un **Checklist Maestro imprimible** (§13) para llevar al restaurante y marcar en sitio.

- 🟢 **Listo / sembrado** — ya está en el sistema, solo validar.
- 🟡 **Requiere configuración** — hay que completar datos reales en sitio.
- 🔴 **Bloqueante** — sin esto no se puede operar.
- ⚪ **Opcional / fase 2** — mejora, no bloquea el go-live.

**Orden recomendado:** Fase 0 (relevamiento) → 1 (prerrequisitos) → 2 (config negocio) → 3 (datos maestros) → 4 (usuarios) → 5 (dispositivos) → 7 (pruebas) → 8 (limpieza + go-live) → 9 (capacitación). La Fase 6 (integraciones) es paralela y mayormente opcional.

---

## 1. Visión general del sistema

**Qué es:** Prep! es una PWA (app web instalable) de operaciones para restaurantes. No se instala nada nativo: se abre en el navegador de cualquier dispositivo y se puede "instalar" como app desde el navegador. Funciona en tablets, celulares, laptops y pantallas.

**Dónde vive:**
| Recurso | Dónde | Notas |
|---|---|---|
| App (este sistema) | `casaitalia.rest` → Vercel (repo `prep-platform`) | Subdominio alterno: `casa-italia.prep.rest` |
| Base de datos | Supabase `jmkvphayyhwzootlybde` | Postgres + Realtime + Storage |
| Carta pública (QR) | `casaitalia.rest/carta` | No requiere login |
| Encuesta pública (QR) | `casaitalia.rest/encuesta?id=…` | No requiere login |
| Consolas super admin | `os.prep.rest/portal` `/prep` `/admin` `/prep-negocio` | Solo Francisco (dueño Prep) |

**Conectividad:** todo es en la nube y en tiempo real (websockets). **Requiere internet estable.** Hay un modo offline básico (service worker) para tolerar microcortes, pero el cobro, KDS y realtime necesitan conexión.

**Mapa de módulos activos para Casa Italia (16):** Pase (hub), POS, Línea (KDS), Bienvenida (reservas), Mercado (compras+inventario), Recetas, Carta QR, RRHH, Delivery, Contabilidad/Finanzas, Vuelto (caja chica), El Libro (intranet), Directorio (reportes), Engagement (CRM+loyalty), Predicción, Voz del Cliente (mystery+encuestas+reseñas).

---

## 2. FASE 0 — Relevamiento (antes de ir / al llegar) 🟡

**Objetivo:** saber con qué contamos antes de armar. Responsable: instalador + administrador del restaurante.
Llena este cuestionario **antes** de empezar. Sin esto, la instalación se improvisa.

### 2.1 Equipos disponibles (hardware)
| # | Pregunta | Respuesta |
|---|---|---|
| 1 | ¿Cuántas **tablets/celulares** hay para mozos? ¿Marca/modelo? | _____ |
| 2 | ¿Hay una **tablet o PC fija para la Caja/POS**? | _____ |
| 3 | ¿Cuántas **pantallas para cocina/barra (KDS)**? ¿Son TV con navegador / tablet? | _____ |
| 4 | ¿Hay tablet/PC en **recepción/anfitrión** (reservas)? | _____ |
| 5 | ¿Cuántas **impresoras térmicas** (comandas/boletas) y de qué tipo (USB/red/Bluetooth)? | _____ |
| 6 | ¿Las impresoras son de **red (con IP)** o están conectadas por USB a un equipo? | _____ |
| 7 | ¿Hay **lector de QR / cámara** en los dispositivos? (para carta y asistencia) | _____ |
| 8 | ¿Equipo del **administrador/gerente** (laptop) para reportes? | _____ |

### 2.2 Red e internet
| # | Pregunta | Respuesta |
|---|---|---|
| 9 | ¿Proveedor de internet y velocidad aprox.? | _____ |
| 10 | ¿Hay **WiFi** que cubra salón + cocina + barra? ¿Nombre de red? | _____ |
| 11 | ¿El router permite ver/fijar **IPs** de las impresoras de red? | _____ |
| 12 | ¿Hay **plan de datos** de respaldo (4G) por si cae el WiFi? | _____ |

### 2.3 Usuarios y roles
| # | Pregunta | Respuesta |
|---|---|---|
| 13 | ¿Cuántas personas usarán el sistema y en qué rol? (gerente, caja, mozos, cocina, anfitrión, almacén, contador) | _____ |
| 14 | ¿Quién será el **administrador** (gestiona usuarios y ve todo)? | Milena Romero / Fernando Barrientos (ya creados) |
| 15 | ¿Los mozos usan **cuenta propia** o **cuenta de estación compartida**? | _____ |
| 16 | ¿Correos reales del gerente/administradores para notificaciones? | _____ |

### 2.4 Datos del negocio (para facturación y ticket)
| # | Dato | Valor actual en sistema | Valor real a poner |
|---|---|---|---|
| 17 | **RUC** | `20XXXXXXXXX` (placeholder) 🔴 | _____ |
| 18 | **Razón social** | Casa Italia S.A.C. 🟢 | confirmar |
| 19 | **Dirección** | "Lima, Perú" (genérica) 🟡 | _____ |
| 20 | **Teléfono** | "+51 " (incompleto) 🟡 | _____ |
| 21 | **Logo del restaurante** | vacío 🟡 | archivo PNG |
| 22 | **IGV** | 18% 🟢 | confirmar |
| 23 | **Servicio sugerido** | 10% (no obligatorio) 🟢 | confirmar % y si es obligatorio |
| 24 | **Moneda** | PEN (acepta USD, TC 3.75) 🟢 | confirmar TC |
| 25 | **Geofence** (asistencia por GPS) | lat -12.0931, lng -77.0465, radio 100m | confirmar coordenadas reales |

**Mini-check Fase 0:** ☐ Cuestionario completo ☐ Foto del local/estaciones ☐ Lista de IPs de impresoras ☐ Correos reales recolectados.

---

## 3. FASE 1 — Prerrequisitos técnicos 🔴

**Objetivo:** que la app cargue en `casaitalia.rest` y la base responda. Responsable: instalador (Francisco/Prep).

1. **Dominio `casaitalia.rest`:**
   - En el registrador (GoDaddy u otro): apuntar el dominio a Vercel (registro `A`/`CNAME` según Vercel indique).
   - En Vercel (proyecto `prep-platform`): agregar `casaitalia.rest` (y `www.casaitalia.rest`) como dominios. **Redirigir `www` → apex** (o se rompe el roster de staff, porque `tenant.js` resuelve la marca por el primer label del host).
   - Verificar que `tenant.js` mapea el host: ya está `'casaitalia':{marca:'m6',local:'l11'}` ✓ (commit aplicado).
2. **HTTPS:** Vercel emite certificado automático. Verificar candado en el navegador. (La PWA y `crypto.randomUUID` requieren HTTPS.)
3. **Supabase activo:** proyecto `jmkvphayyhwzootlybde` en línea. Confirmar que no esté pausado.
4. **Prueba de humo:** abrir `https://casaitalia.rest` → debe redirigir a login. Abrir `https://casaitalia.rest/carta` → debe cargar la carta pública.

**Mini-check Fase 1:** ☐ Dominio resuelve con HTTPS ☐ `/login` carga ☐ `/carta` carga ☐ www redirige a apex.

---

## 4. FASE 2 — Configuración del negocio 🟡

**Objetivo:** completar los datos reales de Casa Italia. Responsable: administrador + instalador.
**Dónde:** módulo **Ajustes** → `casaitalia.rest/ajustes` (login como gerente/admin).

Completar (hoy están a medias):
- [ ] **RUC** real (reemplazar `20XXXXXXXXX`).
- [ ] **Dirección** real del local.
- [ ] **Teléfono** completo.
- [ ] **Logo** (subir PNG; aparece en headers, tickets y reportes PDF).
- [ ] **Pie de ticket** (hoy: "Gracias por visitarnos · www.casaitalia.pe" — actualizar a casaitalia.rest si corresponde).
- [ ] **% de servicio** y si es obligatorio.
- [ ] **Tipo de cambio USD** del día/política.
- [ ] **Correos de reporte** (`reporte_emails`) — para el reporte de cierre diario.
- [ ] **Geofence** (coordenadas reales del local) para asistencia con GPS — módulo RRHH.

> Estos valores viven en `config_local` (local `l11`). Si Ajustes no expone algún campo, se completa por base de datos (instalador).

**Mini-check Fase 2:** ☐ Datos fiscales reales ☐ Logo cargado ☐ Servicio/IGV confirmados ☐ Correos de reporte cargados ☐ Geofence real.

---

## 5. FASE 3 — Datos maestros (validar lo sembrado) 🟢→🟡

**Objetivo:** confirmar que el catálogo operativo refleja el restaurante real. Hoy ya hay datos sembrados de Casa Italia:

| Dato | Sembrado | Acción |
|---|---|---|
| **Mesas** | 14 (M1–M12 + Barra, 4 zonas) | Validar plano real en POS → editor de plano. Ajustar nº de mesas/zonas. |
| **Estaciones** | 6 (caliente, fría/antipasti, forno/pizza, dolci, bar, delivery) | Validar y asignar impresora a cada una (Fase 5). |
| **Menú / recetas** | 68 ítems | Revisar precios, disponibilidad y carta activa en Recetas → Carta. |
| **Empleados** | 8 | Validar fichas en RRHH (nombres, puestos, sueldos, sistema de pensión AFP/ONP). |
| **Proveedores** | 9 | Validar en Mercado → Compras. |
| **Inventario / PAR** | — | Cargar stock inicial y niveles PAR en Mercado (conteo físico inicial). |

**Importante:** parte de los datos transaccionales son **demo** (reservas de prueba: 11; respuestas de encuesta/mystery/reseñas sembradas). Se limpian en la **Fase 8** antes del go-live.

**Mini-check Fase 3:** ☐ Plano real ☐ Carta/precios reales ☐ Fichas de empleados ☐ Proveedores ☐ Conteo de inventario inicial.

---

## 6. FASE 4 — Usuarios y accesos 🟢

**Objetivo:** que cada persona entre con su acceso y el rol correcto.
**Estado:** ya hay **7 accesos** creados para Casa Italia:

| Nombre | Email | Rol | Cómo entra | Clave inicial |
|---|---|---|---|---|
| Milena Romero | `milena.romero@casaitalia.pe` | Gerente / Admin | escribe su email | `CasaItalia2026` → **cambia al 1er ingreso** |
| Fernando Barrientos | `fernando.barrientos@casaitalia.pe` | Gerente / Admin | escribe su email | `CasaItalia2026` → **cambia al 1er ingreso** |
| (Hermano Barrientos) | `gerente@casaitalia.pe` | Gerente / Admin | escribe su email | (existente) |
| Caja | `caja@casaitalia.pe` | Cajero | dropdown del login | `CasaItalia2026` (fija, compartida) |
| Mesero 1 | `mesero1@casaitalia.pe` | Mozo | dropdown del login | `CasaItalia2026` (fija) |
| Mesero 2 | `mesero2@casaitalia.pe` | Mozo | dropdown del login | `CasaItalia2026` (fija) |
| Mesero 3 | `mesero3@casaitalia.pe` | Mozo | dropdown del login | `CasaItalia2026` (fija) |

**Reglas de acceso:**
- En `casaitalia.rest/login`, el **personal operativo** (Caja, meseros) elige su nombre del **desplegable** y pone la clave compartida.
- Los **gerentes** escriben su email + clave; al primer ingreso el sistema les **obliga a crear su clave privada**.
- Para **crear más usuarios** (otro cajero, cocina, almacén, contador): consola `os.prep.rest/admin` (super admin) o procedimiento de alta (auth.users + identity + `prep_usuarios`). Roles disponibles para m6: Cajero, Chef, Mozo, Almacén, Contador.

**Recomendación de seguridad:** cambiar la clave compartida `CasaItalia2026` después del go-live y rotarla periódicamente. Para cuentas de gerente, exigir clave fuerte.

**Mini-check Fase 4:** ☐ Cada gerente cambió su clave ☐ Caja y meseros entran por dropdown ☐ Roles correctos ☐ Cuentas extra creadas si hacen falta (cocina/almacén/contador).

---

## 7. FASE 5 — Dispositivos y periféricos 🟡🔴

**Objetivo:** dejar cada estación con su dispositivo, la app instalada y las impresoras ruteadas.

### 7.1 Mapa de dispositivos por estación
| Estación | Dispositivo | Módulo / URL | Modo |
|---|---|---|---|
| **Caja / POS** | Tablet o PC fija | `/pos` | App instalada, pantalla siempre encendida |
| **Cocina (caliente/fría/forno/dolci)** | Pantalla TV o tablet | `/kds` o `/linea` | Modo oscuro, sin reposo |
| **Barra** | Tablet/pantalla | `/kds` (filtro barra) | — |
| **Anfitrión / recepción** | Tablet | `/bienvenida` | Para reservas y waitlist |
| **Pantalla al comensal** (opcional) | Monitor 2º | `/display` | Se abre desde el POS (botón cast) |
| **Mozos** | Celular/tablet | `/pos` | App instalada por mozo |
| **Gerencia** | Laptop | `/` (hub) + `/directorio` | Reportes |
| **Mesas (comensal)** | — | QR → `/carta` o `/m?mesa=` | Impreso en mesa |

### 7.2 Instalar la PWA (en cada dispositivo)
1. Abrir `casaitalia.rest` en Chrome/Safari.
2. **Android/Chrome:** menú ⋮ → "Agregar a pantalla de inicio / Instalar app".
3. **iPad/iPhone Safari:** Compartir → "Agregar a inicio".
4. Iniciar sesión una vez (queda la sesión). Para KDS/Caja: activar "mantener pantalla encendida".

### 7.3 Impresoras térmicas (comandas y boletas) 🔴
- Prep imprime por estación usando `li_estaciones.impresora_ip` / `impresora_nombre` (comandas 80mm) y la boleta/pre-cuenta desde el POS.
- **Por cada estación**, en el módulo correspondiente (Línea/Ajustes de estación): cargar **nombre e IP** de su impresora de red.
- Para impresoras **USB/Bluetooth**: imprimen desde el navegador del dispositivo conectado (diálogo de impresión). Definir qué equipo hostea cada impresora.
- **Probar una comanda real** por estación y la **boleta** en caja antes del go-live.

### 7.4 Carta y encuestas por QR
- Generar el **QR de la carta**: `casaitalia.rest/carta` (o por mesa `…/m?mesa=M1`). Imprimir y poner en mesas.
- Generar el **QR de la encuesta** desde Voz del Cliente → Encuestas → "QR / Link" (también admite `?mesa=&mozo=` para atribuir).

**Mini-check Fase 5:** ☐ App instalada en cada dispositivo ☐ KDS sin reposo ☐ Impresora por estación configurada y probada ☐ Boleta de caja prueba ☐ QR de carta en mesas.

---

## 8. FASE 6 — Integraciones (paralelo, mayormente opcional) ⚪🔴

Estado actual de integraciones externas (ver detalle en **AUDITORIA.md**). Varias están **simuladas (mock)** y se activan en Fase 2 del producto:

| Integración | Estado | ¿Bloquea go-live? | Qué falta |
|---|---|---|---|
| **Pasarela de pago** (Niubiz/Culqi/Izipay) | Scaffold listo, `pasarela_tipo=ninguna` | ⚪ No, si cobran en efectivo/Yape/POS externo | Cargar llaves (públicas en Ajustes, secretas como env del edge function `cobro-tarjeta`) y enlazar checkout en POS |
| **Facturación electrónica SUNAT** | No implementado (CA-09) | 🔴/🟡 **Crítico en Perú** | Integrar PSE/OSE (Nubefact). Mientras tanto: boleta interna sin valor tributario o facturador externo |
| **WhatsApp / SMS** (reservas, waitlist, reseñas) | Mock (`mockMensaje`) | ⚪ No | WhatsApp Business API (Meta) |
| **Email de reporte de cierre** (Resend) | Edge function lista, sin API key | ⚪ No | `RESEND_API_KEY` + dominio verificado |
| **OCR de recibos / IA** (Vuelto, recetario) | Mock | ⚪ No | API key de Anthropic |
| **Reseñas Google/TripAdvisor** | Lectura/respuesta manual; respuesta IA = borrador template | ⚪ No | Google My Business API + TripAdvisor + API key Claude |
| **Pago anti-no-show (card hold)** | Mock (Culqi) | ⚪ No | Activar pasarela |

> **Decisión clave de go-live:** definir el **método de facturación**. Si Casa Italia emite comprobantes formales, SUNAT es el bloqueante #1. Si por ahora factura con un sistema externo, Prep opera para gestión interna (pedidos, cocina, inventario, caja) y la boleta formal se emite aparte.

**Mini-check Fase 6:** ☐ Decisión de facturación tomada ☐ Método de cobro definido (efectivo/Yape/pasarela) ☐ (Opc.) Resend/pasarela/WhatsApp activados.

---

## 9. FASE 7 — Pruebas de aceptación (end-to-end) 🔴

**Objetivo:** validar el flujo real antes de abrir al público. Hacer con el equipo, simulando un servicio.

1. **Flujo de pedido completo:**
   - Anfitrión sienta una mesa (o mozo abre mesa en POS).
   - Mozo toma pedido (ítems, modificadores, notas, alergias).
   - Verificar que la **comanda imprime** en la estación correcta y aparece en **KDS**.
   - Cocina cambia estados (Oído → Va → En fuego → Servido).
   - Caja **cobra** (dividir cuenta, propina, método de pago) y **imprime boleta**.
   - Verificar que la venta aparece en **Directorio** (reportes) y en **Finanzas**.
2. **Reserva:** crear reserva en Bienvenida → sentar → se enlaza a un pedido real.
3. **Carta QR:** escanear QR de mesa → pedir → el pedido entra a POS y KDS.
4. **Inventario:** registrar una compra y una merma en Mercado; ver que descuenta stock.
5. **Asistencia:** un empleado marca entrada con selfie + GPS (validar geofence).
6. **Caja chica (Vuelto):** registrar un gasto y aprobarlo.
7. **Voz del Cliente:** responder la encuesta por QR → ver la respuesta en el dashboard; responder una reseña.
8. **Reporte de cierre:** ejecutar el reporte diario (El Libro) — validar contenido (si Resend está activo, que llegue el correo).

**Criterio de aprobación:** los 7 primeros flujos funcionan sin intervención técnica. Anotar incidencias.

**Mini-check Fase 7:** ☐ Pedido→cocina→cobro OK ☐ Reserva OK ☐ Carta QR OK ☐ Inventario OK ☐ Asistencia OK ☐ Vuelto OK ☐ Voz del Cliente OK.

---

## 10. FASE 8 — Limpieza de datos demo + Go-Live 🔴

**Objetivo:** arrancar limpio. Responsable: instalador (vía Supabase).

Antes de abrir al público, **limpiar datos de prueba** de Casa Italia (m6/l11) **sin tocar el catálogo** (mesas, menú, empleados, proveedores):
- [ ] Pedidos de prueba (`ca_pedidos`/`ca_pedido_items` de pruebas).
- [ ] Reservas demo (`ms_reservas` — hoy 11 de prueba).
- [ ] Respuestas demo de encuestas (`vc_respuestas`/`vc_resp_items` sembradas) y, si se desea, las reseñas/mystery demo.
- [ ] Caja chica / movimientos de prueba.

> ⚠️ Hacerlo con cuidado y **solo sobre m6/l11** (la base es compartida con otras marcas y otras apps). Confirmar con el instalador antes de borrar.

**Go-Live:**
- [ ] Confirmar que todos los dispositivos tienen sesión y la app instalada.
- [ ] Confirmar impresoras y QR en mesas.
- [ ] Cambiar la clave compartida `CasaItalia2026`.
- [ ] Comunicar al equipo el inicio.

**Mini-check Fase 8:** ☐ Datos demo limpiados (solo m6/l11) ☐ Catálogo intacto ☐ Clave compartida rotada ☐ Equipo avisado.

---

## 11. FASE 9 — Capacitación del personal (por rol)

Sesiones cortas (15–30 min) por rol, con el sistema en vivo:
- **Mozos:** instalar app, login por dropdown, abrir mesa, tomar pedido, modificadores/notas/alergias, marchar, pedir la cuenta.
- **Caja:** cobro, dividir cuenta, propina, métodos de pago, pre-cuenta y boleta, cortesías con aprobación, cierre.
- **Cocina/Barra (KDS):** leer comandas, cambiar estados, prioridades por tiempo (colores), sonido.
- **Anfitrión:** reservas, waitlist, asignar mesa, fichas de comensal (alergias/VIP).
- **Almacén/Compras:** recepción, conteo, mermas, armar pedido, comparativo de proveedores.
- **Gerente/Admin:** Directorio (reportes), Finanzas (presupuesto vs real), gestión de usuarios, Voz del Cliente, El Libro (comunicados/checklists).

**Material:** dejar esta guía + un one-pager por rol con los 5 pasos clave. Designar un **referente interno** (probablemente Caja o un gerente) como primer punto de soporte.

---

## 12. Anexos

### 12.1 URLs clave
- App: `https://casaitalia.rest` (alt: `casa-italia.prep.rest`)
- Login: `/login` · Hub: `/` · POS: `/pos` · KDS: `/kds` · Reservas: `/bienvenida`
- Mercado: `/mercado` · Recetas: `/recetas` · RRHH: `/rrhh` · Finanzas: `/finanzas` · Vuelto: `/vuelto`
- El Libro: `/el-libro` · Directorio: `/directorio` · Engagement: `/engagement` · Predicción: `/prediccion`
- Voz del Cliente: `/voz-cliente` · Carta pública: `/carta` · Encuesta pública: `/encuesta?id=…`
- Super admin (solo Prep): `os.prep.rest/portal` `/prep` `/admin` `/prep-negocio`

### 12.2 Datos sembrados de Casa Italia (al 2026-06-24)
14 mesas · 6 estaciones · 68 ítems de menú · 8 empleados · 7 accesos · 9 proveedores · 16 módulos activos.

### 12.3 Soporte
- Responsable técnico: Francisco Barrientos (Prep) — `franciscobarrientos64@gmail.com`.
- Incidencias: registrar en El Libro (Eventualidades) o reportar al referente interno.

---

## 13. ✅ CHECKLIST MAESTRO (imprimible)

**FASE 0 — Relevamiento**
- ☐ Inventario de equipos (tablets, PC caja, pantallas KDS, impresoras)
- ☐ Red/WiFi cubre salón+cocina+barra · IPs de impresoras
- ☐ Lista de usuarios y roles · correos reales
- ☐ Datos fiscales (RUC, dirección, teléfono, logo)

**FASE 1 — Prerrequisitos**
- ☐ `casaitalia.rest` resuelve con HTTPS · www→apex
- ☐ `/login` y `/carta` cargan · Supabase activo

**FASE 2 — Configuración del negocio**
- ☐ RUC real · dirección · teléfono · logo · pie de ticket
- ☐ IGV/servicio/TC confirmados · correos de reporte · geofence real

**FASE 3 — Datos maestros**
- ☐ Plano de mesas real · carta/precios reales
- ☐ Fichas de empleados · proveedores · conteo de inventario inicial

**FASE 4 — Usuarios**
- ☐ Gerentes cambiaron su clave · Caja/meseros entran por dropdown
- ☐ Roles correctos · cuentas extra creadas (cocina/almacén/contador)

**FASE 5 — Dispositivos**
- ☐ App instalada en cada dispositivo · KDS sin reposo
- ☐ Impresora por estación configurada y **probada** · boleta de caja probada
- ☐ QR de carta en mesas

**FASE 6 — Integraciones**
- ☐ **Decisión de facturación (SUNAT)** · método de cobro definido
- ☐ (Opc.) pasarela / Resend / WhatsApp

**FASE 7 — Pruebas**
- ☐ Pedido→cocina→cobro · reserva · carta QR · inventario · asistencia · vuelto · voz del cliente

**FASE 8 — Go-Live**
- ☐ Datos demo limpiados (solo m6/l11) · catálogo intacto
- ☐ Clave compartida rotada · equipo avisado

**FASE 9 — Capacitación**
- ☐ Capacitación por rol hecha · one-pagers entregados · referente interno designado

---

> 📎 Este libro se complementa con **AUDITORIA.md** (qué no funciona / brechas de seguridad) en esta misma carpeta `docs/`.
