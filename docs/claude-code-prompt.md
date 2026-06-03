# CLAUDE CODE PROMPT — Prep! Landing v1

**Para:** Sesión de implementación inicial de la identidad visual de Prep! en Claude Code  
**Fecha:** Junio 2026  
**Fundador:** Francisco Barrientos (Evolving Hospitality)

---

## Contexto rápido

Soy Francisco. Estoy construyendo **Prep!** — software de gestión integral de restaurantes para Latinoamérica (POS + BOH + KDS + reservas + dashboard del dueño + caja chica IA + intranet operativa). Competidores: Toast, Square POS, Clover, Oracle MICROS (USA) y Restaurant.pe (Perú).

Mi diferenciación real **NO es funcional** — es biográfica: **soy operador de restaurantes que construye software**, no programador que vende a restaurantes. Toast/Square/Clover fueron fundadas por tech. Ninguna por restauranteros.

Vengo de una sesión de chat con Claude donde definimos toda la estrategia de marca. **El documento de referencia es `prep-brand-brief.md`** — DEBE leerse completo antes de cualquier decisión visual.

---

## Skills a activar para esta sesión

- **emil-design-eng** — para coherencia de diseño-ingeniería
- **impeccable** — para calidad de código  
- **design-taste-frontend-v1** — para criterio estético
- Cualquier skill de marketing del set coreyhaines31 que aplique al contenido de la landing

---

## Stack técnico (no negociable)

- React 19 + Vite
- Tailwind CSS
- shadcn/ui como base de componentes (modificable visualmente sin perder accesibilidad)
- Supabase para captura de leads (project ID: `jmkvphayyhwzootlybde` — el mismo que uso para Alfred; vamos a crear una tabla `prep_leads`)
- Vercel para deploy (auto-deploy desde push a GitHub)
- Repo: `franciscobarrientos64/prep-platform`
- Auto-deploy: cada push a `main` despliega; mantener `vercel.json` con el rewrite SPA `/((?!api/|favicon\.).*)`

---

## Primer entregable: LA LANDING DE MARKETING

**No el hub interno. No el producto. La página de venta pública.**

URL final: probablemente `prep.rest` (cuando esté listo el DNS) o `prep-landing.vercel.app` como staging.

### Para qué sirve esta landing

1. **Comunicar qué es Prep!** en 10 segundos a un dueño/operador de cadena mediana que nunca lo escuchó.
2. **Diferenciar contra Toast/Square/Clover** sin atacarlos por nombre.
3. **Capturar leads** — email + WhatsApp + nombre del restaurante + cantidad de sedes — para sales outbound posterior.
4. **Demostrar look & feel del producto** — la landing es prueba viva de que el sistema está hecho con criterio.

### Audiencia exacta

**Dueño/Director de Operaciones de cadena mediana de restaurantes LATAM (3-15 sedes).**  
Han superado Excel y Restaurant.pe. No son cliente todavía de Toast Enterprise. Toman decisiones por demos + referencias + boca a boca. Leen español neutro. Conocen el oficio.

---

## Reglas creativas — MÁXIMO RIESGO

Francisco eligió explícitamente **"sorpréndeme"** como nivel de riesgo creativo. Eso significa:

### Permisos activos
- **Romper convenciones de landing SaaS**. Una landing de Prep! NO debe parecer una landing de Toast, Square, Restaurant.pe, ni una plantilla de Vercel.
- **Asumir un look editorial** más que un look SaaS. Pensá Cabana magazine, Pin-Up, Order Design websites (Bonnie's, Foul Witch), no Linear/Notion.
- **Usar color con confianza** — bloques grandes saturados, no acentos tímidos. La paleta la diseñás vos (instrucción específica abajo).
- **Tipografía expresiva en hero** — Stellost + Rundale deben hacer ruido. Permitido tamaños extremos (heroes 120-180px, eyebrow displays de 14px tracking abierto).
- **Layouts asimétricos**, no grid simétrico de 12 columnas centrado.
- **Movimiento sutil con propósito**, no animaciones decorativas. Si algo se mueve, debe decir algo.
- **Interactividad cuando aporta** — un mini demo del KDS o del Pase en el hero es más persuasivo que un mockup estático.
- **Densidad editorial** en algunas secciones — el lector que profundiza debe encontrar mucho contenido bien estructurado.

### Antibrief — NO HACER (lista taxativa)

Aplicar regla: **si una pantalla se ve como esto, reemplazar.**

- Hero con gradiente morado-azul, lavender-rosa, o cualquier "AI gradient"
- Glassmorphism o vidrio esmerilado
- 3D abstractos con esferas/cubos pastel
- Mockup de iPhone flotando con sombra
- Cards uniformes con sombra blanda + hover lift
- Iconos de Lucide/Heroicons en color accent
- Tipografía Inter Display, Cal Sans, o cualquier rounded display de moda 2023
- Toda lowercase como decisión "design-y"
- Botones CTA pill con gradient
- *"Trusted by 10,000+ restaurants"* sin lista verificable
- *"AI-powered"* incluso si internamente usa IA
- Stock photos de restaurantes vacíos perfectamente iluminados
- Avatares con notch de iPhone
- *"Empower your restaurant"* y variantes
- *"Get started for free"* como CTA
- Set genérico de iconos en lavender/teal/mint

### Brief positivo — referentes visuales

#### Referencia principal (ESTUDIAR EN PROFUNDIDAD)

**`https://nynjfwc26.com/`** — sitio oficial del FIFA World Cup 2026 NYNJ, construido por **DD.NYC®**.

Esto es **el nivel de craft que la landing de Prep! debe alcanzar.** Antes de proponer cualquier paleta o hero, abrir este sitio en una pestaña y permanecer ahí 5-10 minutos. Estudiar especialmente:

1. **Hero con video loop a pantalla completa** — footage real, no mockup. Para Prep!: footage de una cocina en servicio real (línea funcionando, manos sobre la plancha, tickets imprimiéndose) con la UI del Pase superpuesta sutilmente.
2. **Tipografía de manifiesto repetida** — la frase principal aparece más de una vez en el hero. Para Prep!: *"ANTES LO OPERAMOS. AHORA LO CONSTRUIMOS."* repetida 2-3 veces con variaciones de tamaño.
3. **Bilingüe nativo** EN/ES — Prep! es LATAM-first, así que español primario, con secciones en inglés cuando aplica (para partners internacionales, integraciones globales).
4. **Marquees animados** — texto corriendo lateralmente en el footer. Para Prep!: *"VA · OÍDO · SERVIDO · ATRÁS · FUEGO · MISE · PREP · CUBIERTO · BRIGADA · "* en loop infinito como pulso de cocina.
5. **Galerías asimétricas** — imágenes editoriales en grid roto, no cuadrícula uniforme. Para Prep!: capturas de módulos (Pase, Línea, Mesa) en sizes diferentes, ángulos diferentes, como un magazine spread.
6. **SVG markers animados** — la rueda FIFA que gira lenta como marca de "sistema vivo". Para Prep!: el **dot atom** rotando o pulsando en momentos clave (loading, focus, "online").
7. **Countdown timer** vivo en el hero — Para Prep!: podría ser un live counter de "X servicios cobrados ahora mismo" o "X cubiertos servidos hoy con Prep!" (cuando haya clientes; mientras tanto, un placeholder honesto).
8. **Concierge button** ("ask the concierge") — punto de entrada conversacional persistente. Para Prep!: *"Hablá con un operador"* en lugar de "Contact us" — un sticky CTA que abre un chat directo con Francisco o un form que pregunta cantidad de sedes/ciudad antes de redirigir.
9. **Carrusel infinito de partners** en negativo (white-on-dark) — para Prep!: cuando haya clientes reales, los logos de las cadenas que usan Prep! en loop. Antes de eso: integraciones técnicas (Nubefact, Mercado Pago, Yape, Plin, Culqi, Izipay) en formato comparable.
10. **Sticky CTA inferior con micro-interacción** — siempre presente, no invasivo. Para Prep!: *"Agendá demo"* con el dot atom pulsando.

#### Referentes secundarios (apoyo)

- **Order Design** clients: Bonnie's, Foul Witch, Le Veau d'Or, Superiority Burger, Cervo's — para sensibilidad gastronómica editorial
- **Empaque gastronómico contemporáneo**: Graza, Omsom, Olipop, Fly By Jing, Fishwife — para paleta y aplicación de color
- **Editorial culture mags**: Cabana, Pin-Up, Apartamento, Toilet Paper — para asimetría de layout
- **Marcas LATAM food-icónicas**: Inka Kola (amarillo radical), Pilsen Callao (oro confiado), mercado peruano — para confianza con color saturado
- **Anti-referente útil**: TODO lo que se parezca a un demo de Vercel templates o Tailwind UI

#### Más allá: dónde Prep! supera a la referencia

DD.NYC hizo un sitio editorial de evento. Prep! es producto. Eso significa **3 oportunidades de ir más lejos** que nynjfwc26 no tomó:

1. **Demo interactivo embebido en el hero, no video.** En lugar de un loop de video, embebé un **mini-Pase real funcional** con datos de mentira pero que reacciona al cursor: pasar el mouse sobre un ticket lo expande, mostrar un cubierto que se cierra, ver un total que actualiza. Es 10x más persuasivo que cualquier video porque comunica "esto es real, funciona" sin decir una palabra. DD.NYC no podía hacer esto porque su producto es un evento; vos sí podés.

2. **Scroll-driven storytelling tipo "mise en place → servicio".** La narrativa de la landing se sincroniza con el scroll. Al principio: cocina vacía al amanecer. Bajás: ingredientes llegan (Mercado). Más abajo: la línea se activa (Línea). Después: la sala se llena (Mesa). Final: cierre de caja (Caja + Vuelto). El usuario *experimenta* un servicio completo como narrativa visual. Inspiración técnica: GSAP ScrollTrigger, IntersectionObserver, sticky sections con video/visuals que avanzan.

3. **Voz tipográfica que cambia con el contexto.** Stellost solo en el wordmark, sí — pero Rundale puede *transformarse* con el momento: itálica fuerte en headlines de urgencia ("3 mesas esperando"), peso más conservador en explicaciones, casi cursivo en quotes. Es decir: la tipografía como **estado emocional del servicio**, no como decoración estática. DD.NYC tiene jerarquía sólida pero plana — Prep! puede tener jerarquía *narrativa*.

**Si la landing logra esos 3 movimientos** — demo interactivo, scroll storytelling, tipografía narrativa — Prep! no compite con Toast ni con DD.NYC: define un género nuevo en software gastronómico LATAM.

---

## Tipografía

### Wordmark
**Stellost Slanted Regular** — solo en lockup "Prep!" y aplicaciones de marca puntual. Nunca en UI funcional. Comprar/instalar como font local; servir vía `@font-face` (no Google Fonts).

### Display / Headlines
**Rundale ExtBdExpIta** — heroes, headlines de sección, eyebrows grandes. Comprar/instalar como font local.

### Body / UI / lectura
**Pendiente** — Francisco está terminando de evaluar opciones. **Por ahora usar `IBM Plex Sans` como placeholder** (open source en Google Fonts). Cuando Francisco confirme la final, reemplazar.

### Datos numéricos / time stamps
**Pendiente** — Francisco está evaluando opciones. **Por ahora usar `IBM Plex Mono` como placeholder.** Reemplazar cuando confirme.

### Reglas tipográficas estrictas
- Stellost: solo wordmark
- Rundale: solo display grande / eyebrows
- IBM Plex Sans (o final): body, formularios, navegación
- IBM Plex Mono (o final): precios, IDs, tiempos, códigos
- **NO mezclar más fuentes que estas cuatro.** Si tentación de agregar otra: parar y argumentar por qué.

---

## Paleta de color — diseñar en esta sesión

**Restricciones absolutas:**
- NO morado/violeta
- NO azul corporate Toast-like
- NO naranja (color de Toast)
- NO verde Clover
- NO negro+blanco minimalista Square
- NO pastel SaaS (lavender, mint, peach)
- NO gradiente AI

**Dirección estratégica:** gastronómica LATAM contemporánea. Tierras saturadas, rojos quemados, ocres, mostazas, créma/hueso para fondos, negro profundo (no gris frío), un acento vivo que respire energía.

**Tu trabajo:** proponé 2-3 direcciones de paleta antes de codear cualquier landing. Para cada dirección: 
- Primary brand color (1)
- Secondary brand color (1)
- Accent / energy color (1)
- 9 neutrals (light a dark)
- Semantic colors (success/warning/error/info) armónicos
- Justificación de por qué esa paleta y no otra
- Aplicación en mockup mínimo (hero con wordmark + un CTA)

Una vez que Francisco apruebe paleta, codeás landing con ella.

---

## Estructura tentativa de la landing

**Esto es una guía, no una camisa de fuerza.** Si tu criterio de diseño sugiere otra arquitectura, proponela primero.

1. **Hero**
   - Wordmark Prep! a tamaño grande
   - Una frase de manifiesto (provisional): *"Antes lo operamos. Ahora lo construimos."*
   - Subcopy de 1-2 líneas con qué es Prep! en concreto (POS + BOH + KDS + reservas + dashboard, hecho por operador LATAM)
   - CTA primario: *"Pedir demo"* → captura email + WhatsApp + cantidad de sedes
   - Visual: un demo interactivo del Pase o del KDS funcionando con datos de mentira (no mockup estático)

2. **Para quién es Prep!**
   - Cadenas medianas en crecimiento (3-15 sedes)
   - Operadores que ya superaron Excel
   - Restaurantes que necesitan SUNAT/boleta nativa
   - Una sección visual que segmente sin sentirse genérica

3. **Qué hace Prep!** — los módulos como capítulos editoriales
   - **Pase** (dashboard del dueño)
   - **Caja** (POS con SUNAT, multi-método)
   - **Línea** (KDS)
   - **Mesa** (reservas 0% fee)
   - **Mercado** (compras + inventario + food cost)
   - **Vuelto** (caja chica con OCR)
   - **El Libro** (intranet operativa)
   - Cada módulo: nombre Prep + nombre técnico + 1 párrafo + 1 visual real

4. **Diferenciación** (la sección crítica)
   - Cómo Prep! se distingue de Toast/Square/Clover sin nombrarlos peyorativamente
   - Argumentos: SUNAT nativo, 0% fee reservas, multi-tenant para cadenas, voz LATAM
   - Posiblemente una tabla comparativa con tono editorial, no SaaS
   - El argumento biográfico ("hecho por operador") debe asomar acá sin gritar

5. **Cómo se ve por dentro** (vitrina del producto)
   - Capturas reales del Pase, Línea, Mesa, Caja
   - Tono editorial, no "screenshots de feature page"

6. **Sobre Francisco / Evolving Hospitality**
   - Breve, biográfico, no auto-elogioso
   - Manuales operados, columna en La República, background real
   - Punto: este software lo construye alguien que cerró servicios a las 2am

7. **Pricing o "Hablemos"**
   - Decidir si mostrar precio (probablemente no en V1; mejor "agendá demo")
   - O un rango / política transparente

8. **CTA final**
   - Captura de lead más fuerte que en hero
   - Email + WhatsApp + sedes + cargo

9. **Footer**
   - Links operativos
   - Legal mínimo
   - Vínculo a hub interno si aplica

---

## Captura de leads — backend

Crear tabla en Supabase (project `jmkvphayyhwzootlybde`):

```sql
CREATE TABLE prep_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  whatsapp TEXT,
  nombre TEXT,
  restaurante TEXT,
  cantidad_sedes INT,
  cargo TEXT,
  ciudad TEXT,
  source TEXT, -- 'hero', 'footer', 'pricing'
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: solo inserts públicos, lectura solo authenticated
ALTER TABLE prep_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "insert_public" ON prep_leads;
CREATE POLICY "insert_public" ON prep_leads
  FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "read_authenticated" ON prep_leads;
CREATE POLICY "read_authenticated" ON prep_leads
  FOR SELECT TO authenticated USING (true);
```

Validación frontend antes de insertar. Toast de confirmación. Sin redirect a página de gracias separada (eso rompe el flow editorial).

---

## Workflow propuesto

1. **Sesión 1: Paleta.** Lees el brief, propones 2-3 direcciones de paleta con mockup de hero mínimo. Yo elijo.
2. **Sesión 2: Hero + estructura.** Codeás hero completo + arquitectura global de secciones. Yo reviso.
3. **Sesión 3: Módulos.** Sección de módulos + sus visuales reales.
4. **Sesión 4: Diferenciación + sobre Francisco.** Las secciones argumentativas/biográficas.
5. **Sesión 5: Captura de leads + tests.** Backend funcionando, validaciones, accesibilidad AA.
6. **Sesión 6: Pulido + responsive + dark mode si aplica.**

No avances dos pasos sin revisión mía. Iteramos secciones, no la landing entera.

---

## Criterios de éxito

La V1 está lista cuando:

1. **Un dueño de cadena de 6 sedes en Lima**, viendo la landing 30 segundos en su celular, entiende: qué es Prep!, para quién es, y por qué Francisco lo hace.
2. **Cero patrones del antibrief** son visibles en ninguna pantalla.
3. **Un diseñador de Order Design**, viendo la landing, diría "este no es un proyecto de IA genérica".
4. **Lighthouse**: Performance >90, Accessibility >95, Best Practices >95.
5. **Mobile-first funciona genuinamente** (no responsive parchado).
6. **Captura de leads** valida + persiste + envía notificación a mi WhatsApp (vía Twilio/N8N posterior).
7. **El wordmark Prep!** se ve memorable a 16px y a 200px sin pérdida de identidad.

---

## Reglas operativas para esta sesión

- **Siempre leé el brief antes de decidir.** Si una decisión no está en el brief, pregúntame.
- **Argumentá tus elecciones.** No "este color es lindo"; "elegí este color porque X contra Y".
- **Mostrá antes de commitear masivamente.** Cada pieza grande: screenshot/preview primero.
- **No metas dependencias nuevas sin justificar.** Stack es estricto.
- **No uses placeholder text de Lorem Ipsum**. Si no tenés copy real, escribilo tú o pedímelo. Lorem mata el criterio.
- **Si dudás entre dos opciones, mostrame ambas con razones.** No elijas por mí cuando hay ambigüedad real.
- **Cero "I'll just add this nice touch"** sin avisar. La marca es un acto disciplinado.

---

## Empieza acá

1. **Abrí `https://nynjfwc26.com/` en una pestaña**. Pasá 5-10 minutos ahí. Estudiá especialmente: hero con video, tipografía repetida, marquees, galerías asimétricas, SVG markers animados, sticky CTA.
2. Leé `prep-brand-brief.md` completo.
3. Confirmá que entendiste los pilares: brigade call, autoría operativa, antibrief, y los 3 movimientos donde Prep! supera a DD.NYC (demo interactivo, scroll storytelling, tipografía narrativa).
4. Proponé **3 direcciones de paleta + 1 mockup mínimo de hero** (con wordmark + manifiesto + CTA + indicación de dónde iría el demo interactivo).
5. Esperá mi feedback antes de seguir.

Vamos.

— Francisco
