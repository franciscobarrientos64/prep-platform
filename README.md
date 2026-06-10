# Prep — Sistema operativo para restaurantes

SaaS multi-tenant que cubre toda la operación de un restaurante en módulos. Cliente piloto: **Casa Italia** (`marca_id=m6`, `local_id=l11`).

> Documentación operativa completa para desarrollo: ver **[CLAUDE.md](CLAUDE.md)**. Diccionario de datos: **[docs/esquema.md](docs/esquema.md)**.

## Stack
- **Frontend:** HTML estático por módulo (un `.html` por módulo) + CSS custom + JS vanilla. Sin frameworks, sin build.
- **Backend:** Supabase (PostgreSQL + Auth + Storage + Realtime), proyecto `jmkvphayyhwzootlybde`.
- **Deploy:** Vercel (auto-deploy en cada push a `main`). `vercel.json` mapea las rutas limpias a los `.html`.
- **Diseño:** neo-brutalismo cálido (Bagel Fat One + IBM Plex Sans/Mono, Material Symbols). Español LATAM.

## Dominios
| Dominio | Qué es |
|---|---|
| `prep.rest` | Web de marketing (repo aparte `prep-landing`). Redirige `/portal`, `/login`, etc. a la app. |
| `os.prep.rest` | La app + consolas super admin (este repo). |
| `casa-italia.prep.rest` | Subdominio del cliente (carga su data sola vía `tenant.js`). |

## Scripts compartidos (en el `<head>` de cada módulo)
- `auth-guard.js` — exige login (redirige a `/login`). Públicas: `/carta /menu /m /pedir /reservar /login`.
- `tenant.js` — resuelve `window.PREP_MARCA` / `PREP_LOCAL` (subdominio → `?marca/?local` → localStorage → default m6/l11).
- `client-name.js` — pone el nombre del cliente en los encabezados.
- `offline.js` + `prep-sync.js` — PWA + cola de escritura offline (outbox) para POS/KDS/Conteo/Delivery.

## Módulos (rutas)
`/` hub · `/pase` · `/pos` · `/kds` (Línea) · `/bienvenida` · `/mercado` · `/recetas` · `/carta` (QR) · `/rrhh` · `/delivery` · `/finanzas` (Contabilidad) · `/vuelto` · `/el-libro` · `/directorio` · `/engagement` · `/pedir` (delivery público) · `/display` (pantalla comensal) · `/audit` · `/ajustes`.

**Consolas super admin:** `/portal` · `/prep` (módulos+features) · `/admin` (usuarios/roles) · `/prep-negocio` (suscripciones/pagos).

## Multi-tenant y seguridad
- Cada tabla lleva `marca_id`/`local_id`. **RLS por tenant** activo (helpers `prep_is_super`, `prep_can_marca`, `prep_can_local`).
- La carta pública lee de la vista `carta_publica` (solo columnas no sensibles). Buckets de comprobantes privados (URL firmada).
- **Regla:** toda tabla nueva → habilitar RLS con política por tenant (no `tmp_all` en producción).

## Desarrollo
- Editar el `.html` del módulo y `git push` → Vercel despliega en ~60s. Commits **con `franciscobarrientos64@gmail.com`** (si no, Vercel descarta el deploy).
- Cambios de BD: vía MCP de Supabase (`apply_migration` para DDL, `execute_sql` para DML). No usar `curl` a supabase.co.
- Validación antes de commitear: extraer el `<script>` más grande y `node --check`. (Hay un workflow de CI en `.github/` que automatiza esto — requiere token con scope `workflow`.)

## Pendiente (requiere credenciales/decisión externa)
SUNAT/Nubefact · ContaFácil · WhatsApp (bot + loyalty) · push · OCR/IA · impresoras (print routing) · app nativa · API pública · PowerSync (offline Nivel 3) · rotar `service_role` + token GitHub.
