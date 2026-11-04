# Instalación Casa Italia — Oxapampa (nov 2026)

Notas de la visita al local (4-nov-2026). Seguir desde aquí en la próxima sesión.

## Impresora encontrada
- **Bienex POS E802L** — térmica 80 mm, 300 mm/s, interfaz **USB + LAN**, comandos **ESC/POS**, salida de gaveta 24 V.
- ⚠️ **El conector RJ45 del cable de red está roto** (sin pestaña, hilos expuestos, amarrado con hilo). Reemplazar por patch cord de fábrica Cat5e/Cat6 o re-crimpar con capuchón. Verificar que vaya al puerto LAN (no al de gaveta) y que prendan los LEDs.
- IP: imprimir hoja de autoprueba (apagada → mantener FEED → encender) y leerla ahí. Fijar IP estática o reserva DHCP en el router.

## Cómo imprime Prep! hoy (hallazgo importante)
- `pos-v2.html` → `imprimirTermico()` usa **`window.print()`** en un iframe 80 mm. Abre el diálogo del sistema.
- `li_estaciones.impresora_ip / impresora_nombre` **se guardan pero ningún código envía a esa IP**. Las 6 estaciones de `l11` las tienen en `null`.
- Consecuencias:
  - La impresora debe estar **instalada en el SO** del equipo que corre el POS.
    - Windows: driver + puerto TCP/IP estándar `IP:9100` (o USB). Lo más confiable.
    - Android: requiere app de servicio de impresión ESC/POS; pide confirmación cada vez.
    - iPad: **no sirve** (solo AirPrint; la E802L no es AirPrint).
  - Impresión silenciosa solo en Chrome de escritorio con `--kiosk-printing` (va a la impresora predeterminada).
  - No hay ruteo automático por estación a distintas impresoras: todas las estaciones salen en la impresora elegida, una tira por estación.
  - Imprimir por LAN/USB **funciona sin internet**.
- Pendiente posible: **puente de impresión local** (agente en la PC de caja → ESC/POS crudo a `IP:9100` por estación). Hacerlo fuera de horario de turno.

## Offline: qué hay y qué no
- Sí: POS y Línea precacheados (`sw.js`), cola de ventas/ítems/cobros en el equipo (`prep-sync.js`), sesión offline.
- No: sin internet **las tablets no se ven entre sí** (realtime va por la nube) → la comanda impresa es el único canal a cocina. Gift cards requieren conexión. Otros módulos solo abren offline si se abrieron antes en ese equipo.
- Recomendado: router con respaldo 4G (probar señal de cada operador en el sitio) + UPS para router e impresora.

## Checklist en el local
1. ☐ Cable de red nuevo en la impresora.
2. ☐ Autoprueba impresa, IP fija configurada y anotada.
3. ☐ Impresora instalada en el equipo del POS + página de prueba.
4. ☐ En cada equipo con internet: login y abrir `/pos`, `/kds` y cada módulo a usar. No cerrar sesión.
5. ☐ Prueba offline: desconectar WAN del router → abrir cuenta, ítems, comanda, pre-cuenta, cobro → reconectar → "ventas por sincronizar" llega a 0 y la cuenta queda cerrada.
6. ☐ Rollo de papel de repuesto.

## Preguntas abiertas (para Francisco)
1. Equipos para POS y Línea: ¿PC Windows, tablet Android o iPad?
2. Cuántas impresoras y dónde (caja / cocina / barra).
3. ¿Casa Italia opera ahora en Oxapampa? El geofence de RRHH sigue en Lima (lat -12.0931, lng -77.0465, 100 m) → bloquearía la asistencia. Pasar coordenadas del local para actualizarlo.
