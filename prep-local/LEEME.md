# Prep Local — central del local (laptop de caja, Windows)

Si se cae el internet, los mozos siguen tomando pedidos por el wifi del local y las comandas salen en las térmicas.

## Instalar (una sola vez, con internet)
**Rápido:** abre PowerShell **como administrador** y pega:

    irm https://os.prep.rest/prep-local/instalar.ps1 | iex

Hace todo lo de abajo (Node.js, carpeta, firewall, arranque automático) y abre el panel.

**A mano:**
1. Instala **Node.js LTS** desde nodejs.org (siguiente, siguiente).
2. Copia esta carpeta a `C:\PrepLocal`.
3. Doble clic en `iniciar-prep-local.vbs`. Si Windows pregunta por el firewall, marca **Redes privadas** y acepta.
4. Para que arranque solo: `Win + R` → `shell:startup` → pega ahí un acceso directo de `iniciar-prep-local.vbs`.
5. En el router, reserva la IP de la laptop (DHCP estático) para que la dirección no cambie.
6. En la laptop abre `http://localhost:8080/__hub/`: verás la dirección para los mozos, el PIN y las impresoras.
   Asigna la impresora de cada estación (aparecen con la primera comanda) y usa **Imprimir prueba**.

## En cada celular o tablet (una vez, con internet)
1. Conectado al wifi del local, abre la dirección que muestra la laptop (ej. `http://192.168.1.50:8080`).
2. Escribe el PIN, inicia sesión en Prep y agrégalo a la pantalla de inicio.
3. Desde ahí en adelante, usa siempre ese ícono (no `casa-italia.prep.rest`).

## Durante una caída
- Los pedidos se ven en todos los equipos y las comandas imprimen. Arriba a la derecha sale cuántos cambios faltan subir.
- Al volver el internet, se suben solos y en orden. Los cobros con tarjeta (Niubiz) siguen dependiendo de su POS.
- La laptop debe estar prendida y enchufada (ideal con UPS, igual que el router).
