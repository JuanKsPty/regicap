# REGICAP — Especificación del Sistema

**Nombre:** REGICAP — Sistema de Registro Inteligente para Capacitaciones
**Tipo:** Web app de escritorio (portal de administración + portal de participante + portal de empresa)
**Tono visual:** Profesional, técnico, confiable. Similar a herramientas SaaS de analítica (Notion, Linear, Power BI, Mixpanel).
**Plataforma objetivo:** Navegadores modernos, desktop-first, resolución mínima 1280px de ancho.

## Concepto del sistema

Las **empresas** (proveedores de capacitación externos: cámaras de comercio, bancos, universidades, programas gubernamentales) gestionan sus **capacitaciones** y los **módulos** de cada una directamente en REGICAP — incluyendo el contenido de cada módulo, organizado en **capítulos** (PDF, texto o video). Los **participantes** administran su inscripción a esas capacitaciones desde una interfaz única, reciben feedback, y resuelven los módulos de las que están matriculados. La **Inteligencia Artificial** procesa y califica esas respuestas automáticamente, sin interfaz propia. Sobre esos datos ya calificados, el **Administrador** consulta, analiza y entrega feedback a los participantes.

---

## 1. ACTORES Y CASOS DE USO

El sistema tiene **4 actores**: 3 humanos (Participante, Administrador, Empresa) y 1 actor de sistema (Inteligencia Artificial).

### Participante *(interfaz ✅)*

**CU-1 — Administrar capacitaciones**
El participante visualiza las capacitaciones activas y disponibles, se inscribe en nuevas capacitaciones, y puede **cancelar su inscripción** en aquellas que aún no haya iniciado (o que el sistema permita cancelar).

> **`<extend>` CU-2 — Recibir feedback** — Extensión de CU-1: el participante revisa los comentarios que el Administrador le ha enviado, tanto de capacitaciones vigentes como de aquellas que ya no está cursando (historial completo, no solo las activas).

**CU-3 — Tomar capacitaciones**
El participante resuelve los módulos de la capacitación en la que está matriculado — visualiza el contenido de cada módulo (capítulos en PDF, texto o video, definidos por la Empresa) y envía sus respuestas. Las capacitaciones y su contenido son creados por un actor externo al sistema (Empresa); REGICAP sí aloja la interfaz de resolución, pero no la autoría del contenido.

### Inteligencia Artificial *(actor de sistema · interfaz ❌)*

**CU-4 — Procesar resultados**
La IA calcula automáticamente las calificaciones de las respuestas recibidas de cada módulo — respuestas simples, texto libre, e información cuantitativa y cualitativa. **Este caso de uso no tiene interfaz propia**: se ejecuta de forma automática e inmediata cada vez que un participante envía respuestas en CU-3; sus resultados quedan disponibles para el Administrador en CU-5/CU-6/CU-7.

**Cálculos y procesos que ejecuta la IA:**

1. **Normalización y tipificación** — por cada respuesta entrante se identifica su tipo, según el esquema de la pregunta definido por la Empresa al registrar el módulo: *simple, texto libre, cuantitativa o cualitativa.*

2. **Cálculo de puntaje según el tipo de respuesta:**
   | Tipo | Cálculo |
   |---|---|
   | **Simple** (opción múltiple / verdadero-falso / escala) | Comparación exacta contra la clave de respuesta → 100 pts si es correcta, 0 si es incorrecta (proporcional en escalas tipo Likert) |
   | **Compuesta** (pregunta con sub-ítems) | Promedio ponderado de sub-ítems, cada uno puntuado según su propio tipo: `Σ(peso_i × puntaje_i) / Σ(peso_i)` |
   | **Texto libre** | Pipeline NLP: (1) embedding semántico de la respuesta, (2) similitud contra una rúbrica de referencia (respuestas ejemplo de alto/medio/bajo desempeño), (3) clasificación en 3 criterios — *pertinencia, claridad, profundidad* (0–100 c/u), (4) puntaje = promedio de los 3 criterios |
   | **Cuantitativa** (cálculos numéricos: costos, flujo de caja, proyecciones) | Validación contra el valor/fórmula esperada con un margen de tolerancia (%); el puntaje decrece proporcionalmente al error absoluto, hasta un mínimo de 0 |
   | **Cualitativa** (justificación, análisis de decisión) | Clasificación de calidad argumentativa vía LLM — coherencia, viabilidad, profundidad del razonamiento — puntaje 0–100 por rúbrica ponderada |

3. **Agregación del módulo:**
   `puntaje_módulo = Σ(peso_pregunta × puntaje_pregunta) / Σ(peso_pregunta)`
   Los pesos de cada pregunta son definidos por la Empresa al registrar el módulo (CU-9).

4. **Agregación de la capacitación:**
   `puntaje_capacitación = promedio simple de los puntajes de los módulos completados`

5. **Clasificación de nivel:** Alto ≥ 80 pts · Medio 60–79 pts · Bajo < 60 pts.

6. **Insumos para feedback:** la IA marca automáticamente qué criterio obtuvo el puntaje más bajo (ej. "claridad" en una respuesta de texto libre) para que el Administrador lo use como base al redactar el feedback (CU-7).

### Administrador *(interfaz ✅)*

**CU-5 — Consultar resultados**
Consulta el dashboard, filtra información (capacitación, cohorte, participante, período, estado) y ve las calificaciones de los participantes — incluyendo el comportamiento por capacitación y por módulo.

> **`<extend>` CU-6 — Analizar resultados** — Extensión de CU-5: revisa los resultados agregados (evolución por cohorte, capacitaciones más débiles/fuertes) para definir caminos de mejora para los participantes (decisiones recomendadas: rediseñar contenido, reforzar acompañamiento, replicar buenas prácticas).

**CU-7 — Entregar feedback**
Comparte comentarios sobre el desempeño del participante en sus capacitaciones — revisa la lista de participantes (priorizando bajo rendimiento), lee su respuesta ya clasificada por la IA (CU-4), y le envía retroalimentación personalizada. Ese comentario es lo que el participante ve en CU-2.

### Empresa *(interfaz ✅)*

**CU-8 — Gestionar capacitaciones**
La empresa registra nuevas capacitaciones (nombre, duración). Cada capacitación registrada aparece automáticamente en el catálogo de inscripción del Participante (CU-1).

> **`<extend>` CU-9 — Gestionar módulos** — Extensión de CU-8: desde cada capacitación registrada, la empresa gestiona sus módulos, y **dentro de cada módulo genera capítulos de contenido**. Cada capítulo tiene un título y un tipo de contenido: **PDF**, **texto** (datos/instrucciones escritas) o **video de YouTube** (enlace). Este es el contenido que el Participante consulta al resolver el módulo en CU-3.

---

## Relación entre casos de uso

```
Empresa ──CU-8──▶ Capacitaciones ──CU-9──▶ Módulos ──▶ Capítulos (PDF · texto · video)
                                                              │
                                                              ▼ visibles en catálogo (CU-1)
Participante ──CU-1──▶ se inscribe / cancela inscripción
Participante ──CU-1──<extend>──▶ CU-2 recibe feedback (vigente o histórico)
Participante ──CU-3──▶ consulta contenido y resuelve módulos
                                                              │
                                                              ▼ (respuestas enviadas)
Inteligencia Artificial ──CU-4──▶ calcula calificaciones (sin interfaz, automático)
                                                              │
                                                              ▼
Administrador ──CU-5──▶ consulta resultados ──<extend>──▶ CU-6 analiza y define mejoras
Administrador ──CU-7──▶ entrega feedback ──▶ visible para el Participante en CU-2
```

---

## 2. SISTEMA DE DISEÑO (Design Tokens)

### Colores

```
Primario principal:   #0F1B3D  (azul noche — sidebar, headers)
Primario acción:      #185FA5  (azul — botones, links, activos)
Primario claro:       #EBF3FD  (fondo chips activos, selecciones)

Fondo general:        #F4F6FA
Fondo card:           #FFFFFF
Fondo secundario:     #EFF1F7

Borde normal:         #DDE2EC
Borde sutil:          #EFF1F7

Texto principal:      #1A2140
Texto secundario:     #5C6480
Texto terciario:      #9AA0B8

Éxito / Alto:         #1D9E75  (verde)
Éxito fondo:          #E1F5EE
Éxito texto:          #0F6E56

Advertencia / Medio:  #EF9F27  (ámbar)
Advertencia fondo:    #FAEEDA  /  #FFFBEB
Advertencia texto:    #854F0B

Peligro / Bajo:       #E24B4A  (rojo)
Peligro fondo:        #FCEBEB
Peligro texto:        #A32D2D

Acento info:          #378ADD  (azul medio — gráficas neutrales)
```

### Tipografía

```
Fuente principal: Inter (alternativa: Segoe UI)

Tamaños:
  Título de pantalla:     16px  Bold
  Subtítulo / card:       13px  SemiBold
  Label uppercase:        10px  Bold · letter-spacing 0.5px · UPPERCASE
  Cuerpo:                 12px  Regular
  Dato numérico grande:   24–28px  Bold
  Micro / badge:          9–10px  Regular o Bold
```

### Bordes, radios y espaciado

```
Card / contenedor:   border-radius 10px
Botón:               border-radius 8px
Badge / pill:        border-radius 20px (full)
Input:               border-radius 8px
Sidebar:             sin radius (ocupa full height)
Sombra card:         0px 4px 24px rgba(0,0,0,0.08)

Padding interno card:       14–16px
Gap entre cards:            12px
Padding lateral contenido:  20px
Gap entre secciones:        18–24px
```

---

## 3. ESTRUCTURA DE NAVEGACIÓN (Shell)

Layout de 2 columnas fijas: **sidebar** (200px, fondo `#0F1B3D`) + **topbar** (blanca) + **contenido** (scrollable) + **bottom bar** opcional en pantallas con acciones principales.

Solo 3 actores inician sesión (la IA es un actor de sistema sin login, sin interfaz). Cada uno tiene su color de acento que tiñe el item activo del sidebar y el avatar (mismo fondo base `#0F1B3D`):

| Actor | Color de rol |
|---|---|
| **Administrador** | `#185FA5` azul |
| **Participante** | `#1D9E75` verde |
| **Empresa** | `#854F0B` ámbar |

### Sidebar por actor

| Actor | Sección | Ítems (→ CU) |
|---|---|---|
| Participante | Principal | Administrar capacitaciones (CU-1, incluye CU-2) · Tomar capacitaciones (CU-3) |
| Administrador | Resultados | Consultar resultados (CU-5) · Analizar resultados (CU-6) |
| Administrador | Gestión | Entregar feedback (CU-7) · Flujos de excepción |
| Empresa | Principal | Gestionar capacitaciones (CU-8, incluye CU-9) |

---

## 4. PANTALLAS

### Login / Autenticación

Split horizontal 50/50. Izquierda (`#0F1B3D`): logo + tagline + 3 bullets de valor. Derecha (`#F4F6FA`): card blanca centrada con selector de rol (3 chips: **Administrador · Participante · Empresa**), campos de correo/contraseña, botón full-width "Ingresar al sistema".

### Participante — CU-1 Administrar capacitaciones (+ CU-2 Recibir feedback)

- 3 métricas: capacitaciones matriculadas / pendientes por completar / completadas.
- **Mis capacitaciones**: tarjetas con proveedor, barra de progreso, pill de estado (Completada/En curso/Pendiente). Si el estado es *Pendiente* (aún no iniciada), aparece el botón **"Cancelar inscripción"**, que la devuelve al catálogo.
- **Recibir feedback (CU-2)**: panel lateral con los comentarios del Administrador — de capacitaciones vigentes y de las ya finalizadas/canceladas.
- **Capacitaciones disponibles**: catálogo alimentado por CU-8/CU-9 (Empresa), con botón "Inscribirme →".

### Participante — CU-3 Tomar capacitaciones

- Selector de capacitación matriculada (si hay más de una) → grid de sus módulos (completado con puntaje / por resolver).
- Detalle del módulo: **contenido del módulo** — lista de capítulos con su ícono según tipo (📄 PDF · 📝 Texto · ▶ Video), definidos por la Empresa en CU-9 — seguido del formulario de respuestas y el botón "Enviar respuestas ✓" (dispara CU-4 automáticamente).

### Administrador — CU-5 Consultar resultados

- Filtros: Capacitación · Cohorte · Participante · Período · Estado.
- 4 métricas: participantes / puntaje promedio / tasa de completitud / rendimiento alto.
- 3 columnas: barras por capacitación + insight sobre la más débil / donut de distribución (Alto-Medio-Bajo) / tabla de participantes.
- Bottom bar: precondición + botones "Ver histórico" / "Exportar reporte" / "Consultar dashboard →".

### Administrador — CU-6 Analizar resultados (extiende CU-5)

- Topbar: badge "Cohorte 2025-A" + badge verde "Datos actualizados ✓".
- 4 métricas: total inscritos / tasa de participación / capacitación más débil (rojo) / capacitación más fuerte (verde).
- **Evolución por cohorte** + **Decisiones recomendadas** (con acción "Marcar como aplicada") + **Distribución de resultados**.
- Bottom bar: última actualización + botones "Exportar informe" / "Distribuir resultados →".

### Administrador — CU-7 Entregar feedback

**Columna izquierda**: tabla de participantes (nombre, puntaje IA, estado, feedback) priorizando bajo rendimiento.
**Columna derecha**: panel de feedback del participante seleccionado — respuesta procesada por IA, clasificación IA, textarea editable, botones "Descartar" / "Enviar feedback ✓" (ese envío es lo que el participante ve en CU-2).

### Empresa — CU-8 Gestionar capacitaciones (+ CU-9 Gestionar módulos y capítulos)

- Alert informativo: lo registrado aparece automáticamente en el catálogo del Participante.
- Formulario: nombre de la capacitación + duración estimada → "Registrar capacitación →".
- **Mis capacitaciones registradas**: por cada una, un mini-formulario "+ Módulo" (CU-9) y, dentro de cada módulo ya creado, la lista de sus **capítulos** (ícono por tipo + título) más un formulario "+ Capítulo" con: título, tipo (**PDF / Texto / Video de YouTube**) y contenido (archivo, URL o texto).

### Flujos de excepción

3 cards: **Sin resultados procesados** (borde rojo, "Ir a consultar resultados →"), **Error al cargar información** (borde ámbar, Cancelar/Reintentar), **Filtro sin resultados** (área punteada, "Limpiar filtros").

---

## 5. COMPONENTES REUTILIZABLES

| Componente | Variantes |
|---|---|
| **Metric card** | default / con tendencia up / con tendencia down |
| **Pill / Badge de estado** | Alto (verde) / Medio (ámbar) / Bajo (rojo) / En curso (azul) / Pendiente (gris) |
| **Barra de progreso horizontal** | con % / sin % / coloreada por valor |
| **Sidebar item** | default / active / hover |
| **Filter chip** | default / active |
| **Alert / Insight box** | info azul / warning ámbar / success verde / error rojo |
| **Botón** | primary / secondary / danger / full-width |
| **Donut chart** | placeholder SVG con leyenda lateral |
| **Capacitación card** | matriculada (con progreso + cancelar si pendiente) / disponible en catálogo |
| **Módulo card** | completado (con puntaje) / por resolver |
| **Capítulo row** | tipo PDF / Texto / Video, con ícono propio |
| **Decisión / insight card** | pendiente / aplicada (toggle) |
| **Role chip** | seleccionado / no seleccionado |
| **Input** | default / focused / error |

---

## 6. DATOS DE EJEMPLO

```
Capacitaciones activas (gestionadas por Empresa vía CU-8/CU-9):
  Emprendimiento Digital     · Cámara de Comercio     · 520 participantes · 74 pts (Medio)
  Finanzas para PyMEs        · Banco Nacional          · 410 participantes · 81 pts (Alto)
  Marketing en Redes Sociales· Google Actívate         · 356 participantes · 58 pts (Bajo, más débil)
  Liderazgo y Equipos        · Universidad Nacional    · 300 participantes · 69 pts (Medio)

Catálogo disponible para inscripción (CU-8/9 → CU-1):
  Ventas Consultivas         · Cámara de Comercio · 2 módulos · 6 semanas
  Comercio Internacional     · ProColombia         · 5 módulos · 8 semanas
  Innovación y Producto      · MIT xPRO             · 6 módulos · 10 semanas

Ejemplo de capítulos dentro de un módulo ("Fundamentos de venta consultiva"):
  📄 PDF   — "Introducción a la venta consultiva" (manual-venta-consultiva.pdf)
  ▶ Video  — "Caso práctico" (youtube.com/watch?v=abc123)
  📝 Texto — "Técnicas de respuesta a objeciones" (contenido escrito directamente)

Distribución de rendimiento global:
  Alto  (≥ 80 pts):  41%
  Medio (60–79 pts): 35%
  Bajo  (< 60 pts):  24%

Historial de cohortes:
  2024-A:  67 pts promedio
  2024-B:  70 pts promedio
  2025-A:  72 pts promedio  ← actual

Participantes de ejemplo:
  Ana Torres    · Emprendimiento Digital      · 88 pts · Alto
  Luis Pérez    · Marketing en Redes Sociales · 61 pts · Medio
  María Gómez   · Finanzas para PyMEs         · 45 pts · Bajo
  Carlos Ruiz   · Emprendimiento Digital      · 92 pts · Alto
  Sofia Lara    · Liderazgo y Equipos         · 74 pts · Medio
  Diana Vega    · Marketing en Redes Sociales · 38 pts · Bajo
```
