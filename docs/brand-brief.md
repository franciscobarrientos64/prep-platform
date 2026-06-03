# Prep! — Brand Brief & Voice System

**Versión:** 1.0 — Junio 2026  
**Autor:** Francisco Barrientos (Evolving Hospitality)  
**Estado:** Listo para implementación  
**Próximo paso:** Implementación visual en Claude Code

---

## 1. Identidad

| Campo | Valor |
|---|---|
| Nombre | **Prep!** (signo de cierre, no de apertura) |
| Dominio | prep.rest |
| Repo | franciscobarrientos64/prep-platform |
| Hub actual | https://prep-platform-seven.vercel.app/hub |
| Stack | React 19 + Tailwind + shadcn/ui + Supabase + Vercel + Nubefact API |
| Tagline al lanzamiento | **Sin tagline.** Se destilará después de tracción real. |
| Manifiesto al lanzamiento | A definir en uso. Tres semillas en reserva: "Salido de cocina. Listo para la tuya." / "Por operadores. Para tu próximo servicio." / "Hecho en cocina. Pensado para la tuya." |

---

## 2. Cliente objetivo (primeros 18 meses)

**Cadenas medianas en crecimiento.** Específicamente:

- 3 a 15 sedes
- Frecuentemente familiares en proceso de profesionalización
- Han superado Excel + Restaurant.pe
- No son cliente todavía de Toast Enterprise
- Decisor: dueño + jefe/director de operaciones (a veces IT)
- Mercados core: Perú, Colombia, México, Argentina, Chile (LATAM hispanohablante)

**Cómo decide este cliente:** demos lado-a-lado, referencias, comunidad de operadores. NO se vende por ads en Instagram. SÍ se vende por presencia en eventos gastronómicos, columnas de Francisco en La República, recomendaciones boca a boca entre dueños.

---

## 3. Diferenciación estratégica

### El flanco real de la categoría

Ningún competidor (Toast, Square, Clover, Lightspeed, Restaurant.pe) fue **fundado por restauranteros u operadores**. Todos vienen de tech. Esa es la única diferenciación real, biográfica e imposible de copiar.

**Prep! es software construido por un operador (Francisco Barrientos, Evolving Hospitality) que conoce el oficio desde la línea.** Esa biografía es el activo no replicable.

### Las cuatro diferenciaciones operativas concretas

1. **SUNAT / boleta / factura nativos** — Toast y Square no manejan facturación electrónica peruana ni equivalentes regionales.
2. **0% fee en reservas** — Mesa247 cobra por cubierto. Prep! no.
3. **Multi-sede multi-tenant nativo con RLS** — pensado para cadenas, no parchado para ellas.
4. **Voz y cultura operativa LATAM** — el producto habla el idioma de la cocina latinoamericana.

### Lo que NO se dice nunca contra Toast/Square/Clover/Restaurant.pe

- Nada de "matar gigantes", "disruptar", "killer feature"
- Nada de "es lo mismo pero más barato"
- Tono: el operador veterano que sabe que el gringo no entiende SUNAT y lo dice con calma, no con rabia

---

## 4. Story core: brigade call

El signo `!` del nombre **no es decoración**. Es una **llamada de cocina**.

En una línea profesional la comunicación es monosilábica y termina en exclamación: *"¡Va!"*, *"¡Oído!"*, *"¡Servido!"*, *"¡Atrás!"*, *"¡Fuego!"*. *"Prep!"* se escribe como se grita en cocina.

Este frame es el motor narrativo de **toda** la marca:

- Justifica el `!` como código de oficio, no signo decorativo
- Define la voz del producto (corta, seca, sin adorno)
- Habilita el diccionario interno (módulos con nombres de cocina)
- Diferencia estructuralmente contra el lenguaje corporativo americano de Toast

---

## 5. Sistema tipográfico

| Rol | Tipografía | Uso |
|---|---|---|
| **Wordmark** | Stellost Slanted Regular | Solo el lockup "Prep!" y aplicaciones de marca |
| **Display / titulares** | Rundale ExtBdExpIta | Headlines marketing, heroes, key visuals, eyebrows |
| **Body / UI / lectura** | *Pendiente — Francisco evaluando* | Texto largo, formularios, tablas, navegación |
| **Datos numéricos** | *Pendiente — Francisco evaluando* | Precios, time stamps, IDs, códigos, totales |

### Reglas de uso tipográfico

1. **Stellost vive solo en el wordmark** y en momentos específicos de marca (splash, OG images). Nunca en UI funcional.
2. **Rundale vive en titulares y headers de marketing**. Nunca en body. Nunca en columnas de datos.
3. **La sans pendiente** carga el peso del producto: 80%+ del texto que el usuario lee.
4. **Si se elige mono**, se usa exclusivamente para datos numéricos y códigos, no para palabras.

### Nota sobre Stellost

Es una tipografía **expresiva con commitment de slant**. Decisión consciente: prioriza memorabilidad y diferenciación contra la categoría sobre atemporalidad. Vida útil estimada: 5-7 años antes de rebrand de identidad.

---

## 6. Wordmark + Dot Atom

### Wordmark
**"Prep!"** en Stellost Slanted Regular. El `!` nativo de la fuente (slanted, con dot incluido en el diseño). El wordmark se trata como **un acto tipográfico íntegro** — no se descompone, no se modifica.

### Dot Atom (el activo escalable)
Un **círculo sólido perpendicular**, geométricamente puro, diseñado como pieza independiente. **NO es el dot del `!` extraído**, sino un símbolo paralelo que **ecoa** el wordmark sin copiarlo literalmente.

Aplicaciones del dot atom:
- Favicon
- App icon (iOS, Android, escritorio)
- Loading state ("Prep está pensando")
- Notification badge
- Cursor activo / focus indicator
- Bullet en listas internas del producto
- Marca de "online" en dashboards
- Iconografía de sistema cuando aplica

### Lógica conceptual
- **Wordmark** = servicio (dinámico, urgente, en movimiento)
- **Dot atom** = sistema (estable, predecible, perpendicular)
- Juntos encarnan la dualidad real del oficio: la cocina es caliente *y* organizada.

---

## 7. Paleta de color — a definir en Code

**Decisión: la paleta se desarrolla en Claude Code** porque requiere iteración visual con accessibility ratios, tokens, dark mode y aplicación real en componentes.

### Restricciones de paleta (qué NO puede ser)

- **NO morado/violeta** (cliché de IA y SaaS)
- **NO azul corporate Toast-like**
- **NO naranja Toast** (su color)
- **NO verde Clover** (su color)
- **NO negro+blanco Square** (su color)
- **NO gradiente morado-azul de hero**
- **NO pastel-tech (lavender, mint, peach SaaS)**

### Dirección estratégica de la paleta

Debe sentirse **gastronómica latinoamericana contemporánea**, no SaaS. Referentes:

- Tonos tierra saturados (terracota, ocre, mostaza, oliva profundo)
- Rojos quemados / colorados (achiote, tomate maduro)
- Crema / hueso para fondos (no blanco puro tech)
- Negro profundo (no gris frío)
- Un acento vivo (puede ser un amarillo solar, un verde mate, un rosa carne)

### Referentes visuales para la paleta

- **Order Design** clients: Bonnie's, Foul Witch, Le Veau d'Or
- **Marcas LATAM food**: Inka Kola (amarillo), Pilsen (oro), mercado peruano de barrio
- **Empaque gastronómico contemporáneo**: Graza (verde + amarillo), Omsom (rojo + colores saturados), Olipop (cremas pastel cálidas), Fly By Jing (rojo intenso + crema)

### Sistema de paleta esperado (Claude Code debe producir)

- Primary brand color (1)
- Secondary brand color (1)
- Accent / energy color (1)
- Neutrals: 9 pasos del más claro al más oscuro
- Semantic colors: success, warning, error, info (deben armonizar, no chocar)
- Light mode + dark mode
- Tokens Tailwind / CSS vars

---

## 8. Voz y persona

### Quién habla cuando Prep! habla

**Un sous chef veterano que ahora opera una cadena.** Conoce la línea desde adentro. Sabe leer P&L. Habla corto. No pierde tiempo. Tiene humor seco. Respeta al que está en cocina sin paternalizarlo. No pretende ser amigo, pretende ser útil. Es **par** del operador, no proveedor de software.

Todo copy del producto, marketing y comunicación debe sonar como si lo escribiera esa persona.

### Cómo habla

- **Frases cortas. Punto. Otra frase.**
- **Imperativos directos sin "por favor"**: *"Cobra"*, *"Cierra el día"*, *"Imprime"*. Sin pedir permiso.
- **Números concretos > adjetivos abstractos**: *"184 cubiertos en 4 horas"* > *"máxima eficiencia"*.
- **Lenguaje de cocina cuando aplica naturalmente**: pase, línea, fuego, oído, va, mise, prep, servicio, cubierto, brigada, plancha, tapeo.
- **Humor seco, nunca slapstick**: *"3 mesas esperando, manda algo"* ✓ / *"¡Uy! 😅 mesitas esperandito"* ✗
- **Castellano LATAM neutro**: funciona en Lima, CDMX, Bogotá, BsAs, sin regionalismos que bloqueen.

### Cómo NO habla nunca

**Lista explícita de prohibidos** — cualquier copy que contenga estos términos se reescribe:

> revolucionario · game changer · all-in-one · solución integral · empoderar · potenciar · transformar · optimizar · streamline · platform · plataforma (excepto en contextos técnicos/legales) · escalar · 10x · disruptivo · innovador · next-gen · cutting-edge · seamless · sin fricción · AI-powered · IA potenciada · centro de comando · ecosistema · journey · funnel · stack · onboarding (usar *"primer día"*) · churn (usar *"clientes que se van"*) · MRR · TAM · GTM (en copy visible)

---

## 9. Diccionario interno

Los módulos y estados del producto se nombran en código de brigada cuando el frame lo permite. **No se aplica forzosamente a todo** — si una palabra de cocina aplica naturalmente, se usa; si no, se usa el nombre estándar.

| Concepto SaaS | Cómo lo llama Prep! |
|---|---|
| Dashboard del dueño | **Pase** |
| KDS (cocina) | **Línea** |
| Compras / inventario | **Mercado** |
| Caja chica | **Vuelto** |
| Intranet de formatos | **El Libro** |
| Reservas | **Mesa** |
| POS | **Caja** |
| Setup inicial | **Mise en place** *(no confundir con la app personal de Francisco; aquí es su uso original)* |
| Loading / procesando | **Oído** |
| Operación completada | **Servido** |
| Error / atención | **Atrás** |
| Confirmación de acción | **Va** |

**Algunos conceptos se llaman por su nombre técnico** (factura SUNAT, P&L, RUC, AFP/ONP) porque no admiten reemplazo.

---

## 10. Antibrief visual — lo que Prep! NO se ve nunca

Esta lista es **el promedio estadístico** que cualquier IA (incluida Claude Code) va a producir si no recibe contrabrief explícito. Es la antimuestra:

### Layouts y estética
- Hero con fondo gradiente morado-azul o lavanda-rosa
- Glassmorphism / vidrio esmerilado
- 3D abstractos con esferas/cubos pastel flotando
- Mockup de iPhone flotando con sombra blanda
- Cards con sombra blanda + hover lift
- Iconos lineales de Heroicons en lavender o teal

### Tipografía
- Inter Display en headlines
- Cal Sans en heroes (cualquier rounded display de moda 2023)
- Tipografía toda en lowercase como decisión "design-y"
- Combinaciones serif+sans de plantilla SaaS premium

### Copy
- *"Empower your restaurant"* y variantes en español
- *"Trusted by 10,000+ restaurants"* sin lista verificable
- *"AI-powered"* aunque internamente sí use IA
- Testimoniales con stock photos
- Botones con *"Get started for free"*

### Imágenes
- Stock photos de restaurantes vacíos perfectamente iluminados
- Avatares con notch de iPhone visible
- Cocineros sonriendo a cámara con uniforme demasiado limpio
- Comida hiper-estilizada estilo food blogger

### Iconografía
- Set genérico de Lucide/Heroicons en color accent
- Iconos de "rocket" para growth, "lightning" para speed, "sparkles" para AI

**Regla operativa para Claude Code:** si una pantalla generada se ve como cualquiera de estos patterns, reemplazar. La antimuestra es la prueba de fuego.

---

## 11. Aplicaciones inmediatas a construir

Prioridad para la primera sesión de Claude Code:

1. **Hub principal** — `prep-platform-seven.vercel.app/hub` con el branding nuevo aplicado
2. **Lockup oficial del wordmark** (SVG, PNG, en variantes de tamaño y color)
3. **Dot atom como sistema** (favicon, app icon en múltiples tamaños, loading state component)
4. **Sistema de tokens** (colores, tipografía, espaciado, radios, sombras en CSS vars + Tailwind config)
5. **Componentes base** con la nueva identidad: botones, inputs, cards, tablas, navegación
6. **Aplicación a un módulo de referencia** — el Pase (dashboard del dueño) como vitrina del sistema funcionando

### Lo que NO se construye en esta sesión

- Brand book como sitio web independiente (se hace después)
- Aplicaciones de marketing (landing comercial, decks de venta)
- Iconografía custom completa
- Sistema de ilustraciones de marca

---

## 12. Lo que queda abierto

Decisiones registradas como pendientes, no como debilidades:

| Pendiente | Cuándo se resuelve | Cómo |
|---|---|---|
| Tipografía sans para body/UI | Próximo turno de Francisco | Francisco está evaluando opciones |
| Tipografía mono para datos | Próximo turno de Francisco | Francisco está buscando |
| Paleta de color completa | Sesión de Claude Code | Con iteración visual contra el brief |
| Tagline definitivo | Mes 6-12 después de lanzamiento | Destilación de cómo hablan clientes reales |
| Iconografía custom | Fase 2 de branding | Después de tener producto en uso |

---

## Apéndice: contexto del fundador

**Francisco Barrientos** — fundador de Evolving Hospitality (consultoría en CX, operaciones y finanzas en hospitality). Background operativo real: manuales de operación para Yumcha, franquicia hamburguesera (V4, 2,877 párrafos, 25 capítulos incluyendo HACCP, P&L, recetario tipo Starbucks). Columnista de La República en CX. Construye software desde la operación real, no desde tech.

Esa biografía **es el activo de marca no replicable**. El brand book debe reflejarla sin proclamarla.

---

*Documento generado en sesión de definición de marca, junio 2026.*  
*Próximo paso: prompt específico de Claude Code para iniciar la implementación.*
