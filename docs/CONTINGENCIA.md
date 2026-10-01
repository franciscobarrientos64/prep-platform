# Plan de contingencia del turno

El objetivo de Prep! es simple: **el turno no se detiene**. Este documento dice qué hacer cuando algo falla en pleno servicio y cómo preparar el local para que casi nunca pase.

Prep! está hecho para seguir vendiendo aunque falle una pieza:

- **Cada equipo trabaja solo.** No hay un servidor en el local. Si una tablet falla, las demás siguen.
- **Las ventas no se pierden sin internet.** El POS guarda cada pedido, ítem y cobro en el equipo y los sube cuando vuelve la conexión. Arriba aparece "N ventas por sincronizar".
- **Prep! vigila el turno.** Cada 2 minutos revisa equipos sin señal, ventas en cola, ventas rechazadas, comandas que no avanzan y la velocidad de la base de datos. Si algo falla, abre un incidente en **/portal › Salud del turno** y avisa por WhatsApp.

---

## Checklist de 5 minutos antes de abrir

1. **Internet:** abre `os.prep.rest` en cada tablet. Debe cargar sin la barra roja de "Sin conexión".
2. **Equipos cargados:** todas las tablets sobre 80% o enchufadas. La tablet de respaldo, cargada y con sesión iniciada.
3. **POS:** abre una cuenta de prueba, agrega un ítem, mándalo a la barra y cancélalo. Debe aparecer en Línea en segundos.
4. **Impresora:** imprime la pre-cuenta de esa prueba. Revisa que haya papel y un rollo de repuesto a la mano.
5. **Sin ventas en cola:** ninguna tablet debe mostrar "ventas por sincronizar" de la noche anterior. Si aparece, deja la tablet conectada hasta que llegue a 0 antes de cerrar sesión.
6. **Turno abierto:** abre el turno en el POS con el fondo de caja.

---

## Si se cae el internet del local

**Qué ves:** barra roja "Sin conexión" abajo y el contador "N ventas por sincronizar".

**Qué hacer:**

1. **Sigue vendiendo.** Abre cuentas, agrega cócteles y cobra con normalidad. Todo queda guardado en la tablet.
2. **No cierres sesión ni borres datos del navegador** en ninguna tablet mientras haya ventas en cola. Ahí están guardadas.
3. **No recargues la página varias veces.** No hace falta.
4. **Gift cards:** el cobro con gift card necesita conexión (para que dos tablets no usen el mismo saldo). Mientras no haya internet, cobra con otro medio o anota el código para cargarlo después.
5. **Comandas:** sin internet, las tablets no se ven entre sí. El mesero avisa en voz alta o lleva la pre-cuenta impresa a la barra. Si el local tiene router con respaldo 4G, esto no pasa: el router cambia solo.
6. **Activa el respaldo:** si el router no tiene 4G, comparte datos desde un celular a las tablets del POS y la barra.
7. **Cuando vuelva la conexión,** las ventas suben solas. Espera a que el contador llegue a 0 y revisa que las cuentas cobradas aparezcan cerradas.

## Si se cae Prep! (la nube)

**Qué ves:** hay internet (otras webs cargan), pero Prep! no responde o tarda mucho. En /portal aparece "Base de datos lenta" o el monitor deja de actualizar.

**Qué hacer:**

1. **El POS sigue vendiendo** igual que sin internet: las ventas quedan en cola y se suben cuando el servicio vuelve.
2. Avisa al soporte de Prep! por WhatsApp con la hora y lo que ves.
3. **Soporte de Prep!:** revisa `status.supabase.com` y `vercel-status.com`, y los incidentes en /portal. Si el problema vino de un cambio publicado ese día, haz rollback (ver "Reglas de turno" en `CLAUDE.md`).

## Si falla una tablet

1. Toma la **tablet de respaldo**, que ya tiene sesión iniciada. Sigue el servicio con ella.
2. **No borres nada** de la tablet que falló. Si tenía ventas en cola, se suben cuando vuelva a encenderse con internet.
3. Si la tablet no vuelve a encender, avisa a soporte: en /portal se ve cuántas ventas quedaron en cola en el local.

## Si la impresora no imprime

1. Revisa papel, tapa cerrada y luz de error.
2. Revisa que la impresora esté **cableada** al router y encendida. Una impresora por WiFi se desconecta más.
3. Apaga y prende la impresora. Espera 30 segundos.
4. Mientras tanto, las comandas siguen llegando a la pantalla de Línea. Cobra y entrega el comprobante cuando la impresora vuelva.

---

## Hardware recomendado por local

| Equipo | Para qué | Por qué |
|---|---|---|
| Router con respaldo 4G (SIM de datos) | Internet que no se corta | Si cae la fibra, cambia solo a 4G en segundos y las tablets siguen viéndose entre sí |
| UPS pequeña (600–1000 VA) | Router e impresora de la barra | Un corte de luz de minutos no apaga la red ni la impresión |
| 1 tablet de respaldo cargada | Reemplazo inmediato | Con sesión iniciada y Prep! abierto; se usa si falla otra |
| Impresora térmica de red **cableada** | Comandas y pre-cuentas | Más estable que WiFi o Bluetooth en hora punta |
| Cargadores fijos en barra y caja | Tablets siempre sobre 50% | Una tablet sin batería es la caída más común |
| Celular del encargado con datos | Último respaldo de internet | Compartir datos si todo lo demás falla |

---

## Para el equipo de Prep! (soporte)

- **/portal › Salud del turno** muestra en vivo, por cliente, equipos conectados, ventas en cola, cuentas abiertas, incidentes y la latencia de la base de datos.
- **Alertas por WhatsApp:** llegan a `config_local.alerta_whatsapp` del local y a `ALERTA_WHATSAPP_ADMIN` (secret de la función `turno-alertas`). Requieren `WA_TOKEN` y `WA_PHONE_ID`. Sin esas llaves, el incidente queda como `pendiente_llave` y solo se ve en /portal.
- **Horario de turno de cada local:** `config_local.horario_turno` (día de la semana 0=domingo … 6=sábado, horas de Lima). Fuera de ese horario el monitor igual revisa al local si tiene un turno de caja abierto o un equipo activo.
- **No se publican cambios en horario de servicio:** ver "Reglas de turno" en `CLAUDE.md`.
