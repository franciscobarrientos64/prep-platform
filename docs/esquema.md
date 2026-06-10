# Diccionario de datos — Prep

Tablas de Prep en Supabase (`public`), agrupadas por módulo. Todas con RLS por tenant (`marca_id`/`local_id`).
La base aloja además otras apps (Alfred, salud, etc.) cuyas tablas **no** se listan aquí.

> Generado del esquema real. Para columnas exactas de cualquier tabla: `information_schema.columns`.

## POS / Ventas (`ca_*`)
- **ca_pedidos** — comanda/cuenta. Claves: `ticket_num, marca_id, local_id, turno_id, mesa_id, comensales, mozo_id, estado` (abierta/cerrada/cancelada/suspended), `estado_servicio` (abierta/ordenando/comiendo/cuenta_pedida/pagando), `origen, abierta_at, cerrada_at, subtotal, igv, servicio_pct, servicio_monto, descuento, propina_monto, total, moneda, alergias_por_silla(jsonb), tab_nombre, cliente_id`.
- **ca_pedido_items** — `pedido_id, receta_id, nombre, qty, precio_unit, precio_total, modificadores(jsonb), estado` (oido/va/fuego/servido), `station, course_step, es_cortesia, seat_position, urgente, enviado_cocina_at, servido_at`.
- **ca_pagos** — `pedido_id, metodo, monto, moneda, gift_card_id, recibido, vuelto, pagado_at`.
- **ca_propinas** — `pedido_id, mozo_id, turno_id, monto, metodo` (sin local_id; tenant vía pedido).
- **ca_cortesias** — `pedido_id, item_id, tipo, monto, motivo, solicitada_por, aprobada_por`.
- **ca_gift_cards** — `codigo, marca_id, valor_inicial, saldo, estado, expira_at`.
- **ca_mesas** — `id(text), marca_id, local_id, numero, capacidad, forma, zona, pos_x/pos_y/ancho/alto, activa`.
- **ca_turnos** — `marca_id, local_id, fecha, nombre, hora_inicio/fin, estado, total_ventas/propinas/cubiertos`.
- **ca_audit** — log de acciones POS: `pedido_id, usuario, accion, detalle, monto, created_at`.

## Bienvenida / CRM (`ms_*`)
- **ms_clientes** — guest 360. Identidad + métricas auto (`total_visitas, total_gastado, ticket_promedio, ticket_max, primera/ultima_visita, dias_entre_visitas, segmento, platos_favoritos(jsonb)`) + gustos (`alergias[], dieta[], bebida_preferida, zona_preferida...`) + **`acepta_marketing, consentimiento_at`** (Ley 29733).
- **ms_reservas** — `cliente_id, fecha, hora, comensales, mesa_id, estado` (confirmada/sentada/completada/no_show/cancelada/reagendada), `origen` (manual/widget/whatsapp/walk_in/telefono/api), `pedido_id`.
- **ms_waitlist** — `nombre_walkin, telefono_walkin, comensales, prioridad, estado` (esperando/avisado/...), `posicion, visible_publico`.
- **ms_visitas** — spine 1 fila/visita (alimenta stats). **ms_cliente_fechas** — fechas especiales. **ms_floor_plans** — plano. **ms_card_holds** — pre-autorizaciones.

## Mercado / Inventario (`inv_*`)
- **inv_productos** — insumo: `id(text), nombre, categoria, unidad, costo, par_level, dias_caducidad, marca_id`.
- **inv_recetas** — `id(uuid), nombre, precio_venta, ingredientes(jsonb [{pid|rid,cantidad,merma}]), etapas(jsonb), traducciones(jsonb), tipo, categoria_menu, alergenos[], activo, rendimiento, estacion_id, emoji, foto_url, orden_menu, marca_id`.
- **inv_movimientos** — kardex: `producto_id, tipo` (entrada/salida/merma/...), `cantidad, costo_unitario, valor_total, fecha, referencia, motivo, responsable`.
- **inv_ordenes_compra** — `numero, proveedor_id, estado, items(jsonb), subtotal, igv, total, comprobante_url, pago_estado/monto/metodo/fecha`.
- **inv_mermas** — `producto_id, cantidad, motivo, valor_perdido, fecha`.
- **inv_sesiones_conteo** — conteo con aprobación: `area, modo, estado, lineas(jsonb), total_diferencias, valor_diferencia`.
- **inv_precios_hist** — histórico de costo por insumo. **inv_precios_mercado** — comparador de precios web/proveedores.
- **inv_proveedores / inv_proveedor_productos** — proveedores y su catálogo. **inv_menus** — combos.
- **inv_marcas** (id, nombre, emoji) · **inv_locales** (id, marca_id, nombre) — base multi-tenant (lectura anon de nombres).
- Vista **inv_stock_actual** — stock derivado. Vista **carta_publica** — carta pública segura (sin costos/ingredientes).

## RRHH (`rrhh_*`)
- **rrhh_empleados** — `id(text), marca_id, local_id, nombre, apellidos, rol, area, sueldo, estado, tipo_contrato, restricciones(jsonb)` + datos personales/bancarios.
- **rrhh_asistencia** — `empleado_id, fecha, hora_entrada/salida, horas_trabajadas` + geofence.
- **rrhh_programacion** — turnos: `empleado_id, fecha, turno, hora_ini/fin, rol`.
- **rrhh_permisos** — vacaciones/permisos con aprobación.
- **rrhh_postulantes** — ATS: `nombre, puesto, estado` (nuevo/entrevista/prueba/contratado/descartado).
- **rrhh_the_talk** / **rrhh_evaluaciones** — desempeño (conversaciones versionadas + evaluaciones).
- **rrhh_doc_versiones** — contratos/manuales por puesto con versión activa.
- **rrhh_swaps** — cambios de turno. **rrhh_tip_pool** — repartos de propina. **rrhh_examenes / rrhh_examen_resultados** — intranet de exámenes.
- Otras: rrhh_documentos, rrhh_capacitaciones, rrhh_eventos, rrhh_roles, rrhh_geofence, rrhh_formatos(_instancias).

## Línea/KDS (`li_*`) · Delivery (`dl_*`)
- **li_estaciones** — `nombre, emoji, color, impresora_ip/nombre, es_delivery, orden_pase`.
- **dl_pedidos** — `codigo, nombre, telefono, direccion, canal, detalle, subtotal, delivery_fee, total, estado` (recibido/preparando/listo/en_camino/entregado), `repartidor_id, zona, eta_min`.
- **dl_repartidores** (`nombre, vehiculo, estado, activo`) · **dl_zonas** (`nombre, tarifa, tiempo_min`).

## Finanzas (`fin_*`) · Vuelto (`vu_*`) · El Libro (`lb_*`)
- **fin_partidas** — presupuesto: `grupo, nombre, tipo, monto, recurrente, frecuencia, fuente` (manual/ventas/compras/vuelto). **fin_real** — real por `partida_id + mes`.
- **vu_gastos** — caja chica: `fecha, monto, categoria, descripcion, metodo, estado` (registrado/aprobado/rechazado), `comprobante_url`. **vu_arqueos** — conciliación (fondo/esperado/contado/diferencia).
- **lb_posts** — tablón/procedimientos: `tipo, titulo, categoria, contenido, prioridad, fijado, vigente`. **lb_checklists** (+ `lb_checklist_runs`) · **lb_bitacora**.

## Engagement (`eng_*`)
- **eng_puntos** — loyalty (`cliente_id, tipo, puntos`). **eng_campanas** — campañas (`audiencia, canal, mensaje, n_destinatarios`).
- **eng_resenas** — reseñas (`fuente, rating, comentario, respuesta, estado`). **eng_eventos** — catering. **eng_marcas_virtuales** — dark kitchen.

## Plataforma (`prep_*`) · Config
- **prep_usuarios** (`email, nombre, rol_sistema, marca_id, local_id, rol_id, empleado_id, activo`) · **prep_roles** (`nombre, permisos(jsonb)`).
- **prep_marca_modulos** (módulos activos por marca) · **prep_marca_features** (features por marca).
- **prep_suscripciones** (`plan, estado, precio_mensual, ciclo, proximo_cobro`) · **prep_pagos**.
- **config_local** — ajustes del local: `igv_pct, servicio_pct_default, moneda_default, tipo_cambio_usd, ruc, razon_social, direccion, ticket_footer...`. Vista **config_publica** (TC para la carta).
