# 🔍 Auditoría de Plataforma — Prep! (Go-Live Casa Italia)

> Auditoría de **seguridad** y **funcionalidad** para la puesta en producción de Casa Italia (`m6`/`l11`).
> Fecha: 2026-06-24 · Método: 2 agentes especializados (Security Engineer + Code Reviewer) + advisors de Supabase + verificación en BD.
> Base de datos compartida `jmkvphayyhwzootlybde` — solo se auditaron objetos de Prep.

## Veredicto

- **Seguridad:** el modelo RLS por tenant en las tablas base es **sólido** (verificado: `anon` → 0 filas en tablas sensibles). Había **3 fugas críticas** que saltaban ese modelo: **2 ya fueron cerradas en esta sesión**, 1 requiere acción del dueño (rotar token). Quedan hallazgos Alto/Medio en edge functions y storage.
- **Funcionalidad:** usable como **POS / KDS / floor / inventario / recetas / RRHH / caja**, pero **NO como facturador legal (SUNAT)** ni cobro con tarjeta integrado. 3 blockers, todos resolubles sin escribir código.

---

## PARTE 1 — SEGURIDAD

### 🔴 CRÍTICO

| # | Hallazgo | Estado |
|---|---|---|
| **C1** | **6 vistas `SECURITY DEFINER` con SELECT a `anon`** exponían datos de TODOS los clientes (planilla de sueldos, historial de clientes, stock, pase) con solo la anon key pública. *Probado por el auditor: leyó la planilla de Casa Italia y de otros 2 clientes sin autenticarse.* Vistas: `rrhh_dashboard`, `rrhh_talks_pendientes`, `ms_cliente_platos`, `inv_stock_actual`, `li_pase`, `li_pase_delivery`. | ✅ **ARREGLADO** — `REVOKE ALL ... FROM anon`. Verificado: anon → `permission denied`; autenticados (app RRHH/KDS/Mercado) conservan acceso. |
| **C2** | **Bucket `rrhh-files`** (contratos, DNIs, fotos de empleados) **abierto a `anon` para leer/escribir/borrar** (política `rrhh_files_anon TO public`). PII + riesgo de borrado. | ✅ **ARREGLADO** — policy RESTRICTIVE `st_anon_no_sensitive` niega a `anon` todo acceso a `rrhh-files`/`compras-files`/`vuelto-files`. Verificado: anon ve 0 archivos. |
| **C3** | **Token de GitHub (`ghp_…`) hardcodeado en texto plano** en el edge function `deploy-to-github` (`verify_jwt=false`, invocable por cualquiera). Da **escritura total al repo → auto-deploy a producción**. Está vivo. | 🔴 **ACCIÓN DEL DUEÑO — URGENTE (HOY).** Claude NO puede rotarlo. **Revocar el PAT en GitHub → Settings → Developer settings → Tokens.** Luego borrar el edge function (`deploy-to-github`) o moverlo a `Deno.env`. Es un token distinto al `service_role` de alfred ya conocido. |

### 🟠 ALTO (pendientes)

| # | Hallazgo | Fix recomendado |
|---|---|---|
| **A1** | `reporte-diario` (`verify_jwt=false`) — IDOR: un anon hace `POST {local_id:'l11'}` y recibe el reporte operativo del día + los `reporte_emails`. Los `local_id` son enumerables. | `verify_jwt=true` + validar `prep_can_local(local_id)`; o secreto compartido en header si es para cron. No devolver `html`/`recipients` al cliente. |
| **A2** | `enviar-acceso` (`verify_jwt=false`) — permite enviar correos con credenciales arbitrarias a empleados (vector de phishing/spam). Ya existe `admin-enviar-acceso` con `verify_jwt=true`. | Borrar la anónima y usar solo `admin-enviar-acceso`. |
| **A3** | `anon` puede **escribir/borrar** en buckets no sensibles (`recetas-files`, `alfred-files`) — defacement de fotos de carta. (`rrhh-files` ya fue cerrado en C2.) | Restringir INSERT/UPDATE/DELETE de storage a `authenticated`. *No se cerró aún para no arriesgar la app Alfred que comparte la BD — requiere prueba.* |

### 🟡 MEDIO (deuda, no bloqueante para 1 cliente)

| # | Hallazgo | Nota |
|---|---|---|
| **M1** | `prep_login_master`/`prep_validar_sesion` (auth legacy por master password, `SECURITY DEFINER`, `EXECUTE` a `anon`) — código muerto, superficie de ataque. | Revocar EXECUTE y eliminar. **OJO:** una nota de memoria antigua decía que `prep_validar_sesion` se usa en políticas RLS — **verificar antes de revocar** para no romper RLS. |
| **M2** | Cookie SSO `prep_sso` guarda access+refresh token, **no HttpOnly** (legible por JS), dominio `.prep.rest`, 30 días. Un XSS en cualquier subdominio público roba el refresh_token. | Reducir `max-age`; evaluar si el SSO cross-subdominio es necesario. No bloqueante con 1 subdominio. |
| **M3** | 5 tablas `always_true` (`inv_proveedores`, `inv_transferencias`, `rrhh_formatos`, `rrhh_roles`, `alertas_precio`) — cross-tenant entre clientes autenticados. | Aceptable con Casa Italia sola; **cerrar antes de onboardear el 2.º cliente pagante** con `prep_can_marca()`. |

### 🔵 BAJO / Acción del dueño

- **B1** — `prep_marca()` usa `LIMIT 1` sin `ORDER BY` (no determinista si un email tuviera 2 marcas). Garantizar unicidad de email en `prep_usuarios`.
- **B2** — **Supabase Auth (toggles del dashboard, acción del dueño):** activar **HIBP / Leaked Password Protection** (recomendado antes del go-live); **MFA** para admins; revisar **confirmación de email** y **cerrar el registro público** (`login.html` expone "Crear cuenta" / `signUp`). Una cuenta auto-creada no ve datos por RLS, pero conviene cerrarlo.

### ✅ Verificado OK (no son hallazgos)
Anon key en HTML (por diseño); RLS por tenant en tablas base (probado: anon→0 filas); aislamiento de tenant en frontend; `compras-files`/`vuelto-files` ya privados; `public-api` (auth por API key, scoped por marca); `cobro-tarjeta`/`admin-enviar-acceso` (`verify_jwt=true`); inserts anónimos de carta/encuestas (solo INSERT, sin lectura); service worker no cachea data de Supabase.

---

## PARTE 2 — FUNCIONALIDAD

### 🔴 BLOCKERS de go-live

1. **SUNAT / comprobante electrónico NO se emite.** El POS captura tipo/DNI/RUC pero graba siempre `comprobante_emitido:false` (`pos-v2.html:3963`), sin llamada a Nubefact/PSE. En Perú un restaurante no puede operar sin emitir boleta/factura. **Workaround 2 días:** facturar con el sistema/POS actual del cliente o facturador SUNAT en paralelo.
2. **`config_local` con datos placeholder.** `ruc='20XXXXXXXXX'`, `nombre_comercial=null`, dirección/teléfono genéricos. Completar en `/ajustes` antes de abrir (ver Fase 2 del manual).
3. **Data demo contamina los reportes.** ~4.419 pedidos sintéticos volcados el 2026-06-11. Directorio (food cost, labor%, P&L), Predicción y KPIs del hub mostrarían números falsos el día 1. **Purgar/aislar la data de prueba de m6/l11** antes de abrir (Fase 8 del manual). *No ejecutado por Claude: requiere decisión del dueño y cuidado en BD compartida.*

### 🟡 DEGRADADOS (operables con workaround manual)

| Hallazgo | Workaround |
|---|---|
| Cobro con tarjeta no pasa por pasarela (POS registra el método como pagado sin invocar `cobro-tarjeta`; `niubiz/culqi/izipay_activa=false`) | Cobrar en el POS físico actual y registrar en Prep como pagado. Efectivo/Yape/Plin funcionan. |
| WhatsApp/SMS de Bienvenida (confirmaciones, recordatorios, waitlist) son mock (`bienvenida.html:1460`); card-hold Culqi simulado | Anfitrión llama/escribe manualmente; no usar card-hold. |
| Campañas de Engagement no envían (registran `estado:'enviada'`) | Botón abre `wa.me`/`mailto` uno por uno. |
| Respuestas a reseñas "con IA" = template local, publicación manual | Editar borrador y pegar en Google/TripAdvisor. |
| OCR no implementado en Vuelto/Mercado (la foto se adjunta sin extraer monto). Voz en Vuelto **sí es real** | Digitar el monto a mano (soportado). |
| Reporte de cierre por email no sale (`reporte_emails=[]`, falta `RESEND_API_KEY`) | Revisar el cierre dentro de la app. |

### 💭 Cosméticos
- Carta "Pedir la cuenta" solo muestra toast (`carta.html:128`), no notifica al POS.
- Delivery Rappi/PedidosYa son etiquetas de canal en pedido manual (esperado para MVP).

### Tabla de readiness por módulo
| Módulo | Estado |
|---|---|
| Hub, KDS/Línea, Recetas, Carta, RRHH, Finanzas, El Libro, Ajustes, Consolas super admin | **Listo** |
| POS | Degradado (tarjeta/SUNAT) |
| Bienvenida, Mercado, Vuelto, Engagement, Voz del Cliente, Delivery | Degradado (mock con workaround) |
| Directorio, Predicción | Degradado **por data demo** (lógica OK) |
| Login | Degradado (botón "Crear cuenta" público — ver B2) |
| **Legacy (no usar):** pos-legacy, **caja-chica.html** (el real es `vuelto.html`), inventario, hub.html, nav, reservas-spec, reservas-widget, prd, roadmap, sistema, analisis | Legacy |

---

## ✅ Checklist mínimo de seguridad para go-live (prioridad)
1. ✅ **C1** — vistas SECURITY DEFINER: anon revocado (hecho).
2. ✅ **C2** — `rrhh-files` cerrado a anon (hecho).
3. 🔴 **C3** — **Rotar el PAT de GitHub HOY** + borrar/proteger `deploy-to-github`. *(dueño)*
4. 🟠 **A1 + A2** — `verify_jwt=true`/secreto en `reporte-diario` y `enviar-acceso`.
5. 🟠 **A3** — bloquear escritura anon en `recetas-files`/`alfred-files` (probar contra Alfred).
6. 🔵 **B2** — activar HIBP; cerrar registro público / confirmación de email. *(dueño)*
7. 🟡 **M1, M3** — limpiar auth legacy; cerrar `always_true` antes del 2.º tenant.

> Los blockers funcionales (SUNAT, config_local, data demo) se gestionan en el **Libro de Instalación** (`INSTALACION.md`, Fases 2/6/8).
