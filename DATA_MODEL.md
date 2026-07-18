# REGICAP — Propuesta de esquema de datos

Este documento describe el esquema de datos que usa el mockup (`assets/js/data.js`) y que persiste en el navegador vía `assets/js/store.js`. El objetivo no es modelar una base de datos de producción, sino tener **una sola fuente de verdad** para que Empresa, Participante y Administrador vean siempre el mismo dato — nada de números repetidos a mano por pantalla.

Todo lo que en el mockup anterior era un número fijo (score de una capacitación, score de un módulo, distribución alto/medio/bajo) se **calcula** en `store.js` a partir de las entidades de abajo. Los únicos datos "planos" son los históricos de cohortes (2024-A/2024-B), porque representan períodos anteriores al dataset de ejemplo.

## Diagrama de relaciones

```
Empresa 1───* Capacitacion 1───* Modulo 1───* Capitulo   (pdf | texto | video)
                                     └────1───* Pregunta   (examen opcional del módulo)

Participante 1───* Inscripcion *───1 Capacitacion
Participante 1───* Respuesta *───1 Modulo
Respuesta 1───1 Calificacion                              (output simulado de CU-4)

Administrador 1───* Feedback *───1 Participante
                        Feedback *───1 Capacitacion

Cohorte 1───* Decision
```

## Entidades

### Empresa
Proveedor externo de capacitaciones (CU-8).

| Campo | Tipo | Notas |
|---|---|---|
| `id` | string | `e-camara` |
| `nombre` | string | "Cámara de Comercio" |
| `tipo` | string | cámara · banco · plataforma · universidad · gobierno |
| `email` | string | login de la Empresa |

### Capacitacion
Registrada por una Empresa (CU-8). El catálogo del Participante solo muestra las `publicada`.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | string | `c-emp-digital` |
| `empresaId` | string → Empresa | |
| `nombre` | string | |
| `duracion` | string | "8 semanas" |
| `estado` | enum | `borrador` \| `publicada` \| `despublicada` |
| `createdAt` | string (fecha) | |

### Modulo
Unidad de contenido dentro de una Capacitación (CU-9). El orden define en qué secuencia aparece.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | string | `m-ideacion` |
| `capacitacionId` | string → Capacitacion | |
| `nombre` | string | |
| `orden` | number | 1, 2, 3… reordenable |

### Capitulo
Contenido de un Módulo (CU-9): PDF, texto o video de YouTube.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | string | |
| `moduloId` | string → Modulo | |
| `titulo` | string | |
| `tipo` | enum | `pdf` \| `texto` \| `video` |
| `contenido` | string | nombre de archivo, texto plano, o URL de YouTube |
| `orden` | number | |

### Pregunta
Examen opcional al final de un Módulo (CU-9). El `tipo` es exactamente el que usa la IA para calificar (CU-4) — cada tipo trae su propio campo de configuración.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | string | |
| `moduloId` | string → Modulo | |
| `texto` | string | enunciado de la pregunta |
| `tipo` | enum | `simple` \| `texto_libre` \| `cuantitativa` \| `cualitativa` |
| `peso` | number | % dentro del examen del módulo |
| `opciones` | string[] | solo si `tipo=simple` |
| `respuestaCorrecta` | string | solo si `tipo=simple` |
| `valorEsperado` / `tolerancia` | number / number(%) | solo si `tipo=cuantitativa` |
| `rubrica` | string | solo si `tipo=texto_libre` o `cualitativa` — qué se espera en la respuesta |

### Participante
Persona inscrita en capacitaciones (CU-1/2/3).

| Campo | Tipo |
|---|---|
| `id` | string |
| `nombre` | string |
| `email` | string |

### Administrador
Persona que consulta resultados y entrega feedback (CU-5/6/7).

| Campo | Tipo |
|---|---|
| `id` | string |
| `nombre` | string |
| `email` | string |

### Inscripcion
Relación Participante↔Capacitación (CU-1). **Nunca se borra** — cancelar solo cambia el `estado`, así queda como historial. Esto es lo que reemplaza el bug del mockup anterior donde cancelar movía la capacitación completa de vuelta al catálogo (una capacitación la comparten muchos participantes, no le pertenece a uno solo).

| Campo | Tipo | Notas |
|---|---|---|
| `id` | string | |
| `participanteId` | string → Participante | |
| `capacitacionId` | string → Capacitacion | |
| `estado` | enum | `pendiente` \| `en_curso` \| `completada` \| `cancelada` |
| `fechaInscripcion` | string (fecha) | |

### Respuesta
Lo que el Participante envía al resolver un Módulo (CU-3).

| Campo | Tipo | Notas |
|---|---|---|
| `id` | string | |
| `participanteId` | string → Participante | |
| `moduloId` | string → Modulo | |
| `contenido` | string | texto libre / respuestas del examen |
| `entregable` | string \| null | enlace o archivo opcional |
| `estado` | enum | `borrador` (flujo alterno de "Guardar") \| `enviada` |
| `fechaEnvio` | string (fecha) | |

### Calificacion
Resultado del CU-4 (IA) sobre una Respuesta enviada. 1:1 con `Respuesta`.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | string | |
| `respuestaId` | string → Respuesta | |
| `puntaje` | number (0–100) | |
| `nivel` | enum | `alto` (≥80) \| `medio` (60–79) \| `bajo` (<60) — derivado de `puntaje` |
| `criterioMasBajo` | string | insumo para el feedback (CU-7), ej. "claridad" |
| `fecha` | string (fecha) | |

### Feedback
Comentario del Administrador sobre el desempeño de un Participante en una Capacitación (CU-7). **Se acumula**, nunca se sobrescribe — es el historial que ve el Participante en CU-2.

| Campo | Tipo |
|---|---|
| `id` | string |
| `administradorId` | string → Administrador |
| `participanteId` | string → Participante |
| `capacitacionId` | string → Capacitacion |
| `texto` | string |
| `fecha` | string (fecha) |

### Cohorte
Agregado histórico por período (CU-6). Los períodos pasados (2024-A/B) son datos precalculados porque exceden el dataset de ejemplo; el período actual (2025-A) sí puede recalcularse a partir de las inscripciones vigentes.

| Campo | Tipo |
|---|---|
| `id` | string |
| `periodo` | string ("2025-A") |
| `scorePromedio` | number |
| `participantes` | number |
| `actual` | boolean |

### Decision
Recomendación del Administrador sobre una Cohorte (CU-6), con estado aplicada/pendiente.

| Campo | Tipo |
|---|---|
| `id` | string |
| `cohorteId` | string → Cohorte |
| `tipo` | enum: `info` \| `warning` \| `success` |
| `texto` | string |
| `aplicada` | boolean |

## Ejemplo de dataset (recorte — el set completo está en `assets/js/data.js`)

El hilo conductor de la demo es **Luis Pérez** (`p-luis`), inscrito en 4 capacitaciones con los 4 estados posibles, para poder mostrar Activas/Historial en CU-1 y progreso real en CU-3:

```json
{
  "empresas": [
    { "id": "e-camara", "nombre": "Cámara de Comercio", "tipo": "cámara" }
  ],
  "capacitaciones": [
    { "id": "c-emp-digital", "empresaId": "e-camara", "nombre": "Emprendimiento Digital", "duracion": "8 semanas", "estado": "publicada" }
  ],
  "modulos": [
    { "id": "m-ideacion", "capacitacionId": "c-emp-digital", "nombre": "Ideación y validación", "orden": 1 },
    { "id": "m-modelo", "capacitacionId": "c-emp-digital", "nombre": "Modelo de negocio", "orden": 2 }
  ],
  "capitulos": [
    { "id": "cap-video-idea01", "moduloId": "m-ideacion", "titulo": "¿Qué es un problema validable?", "tipo": "video", "contenido": "https://youtube.com/watch?v=idea01", "orden": 1 }
  ],
  "preguntas": [
    { "id": "q-cuant-costo-fijo", "moduloId": "m-modelo", "texto": "Calcula el costo fijo mensual estimado de tu modelo (USD)", "tipo": "cuantitativa", "peso": 100, "valorEsperado": 500, "tolerancia": 15 }
  ],
  "participantes": [
    { "id": "p-luis", "nombre": "Luis Pérez", "email": "luis.perez@correo.com" }
  ],
  "inscripciones": [
    { "id": "i-201", "participanteId": "p-luis", "capacitacionId": "c-mkt-redes", "estado": "en_curso", "fechaInscripcion": "2026-05-04" },
    { "id": "i-202", "participanteId": "p-luis", "capacitacionId": "c-emp-digital", "estado": "en_curso", "fechaInscripcion": "2026-05-04" },
    { "id": "i-203", "participanteId": "p-luis", "capacitacionId": "c-fin-pyme", "estado": "completada", "fechaInscripcion": "2026-04-02" },
    { "id": "i-204", "participanteId": "p-luis", "capacitacionId": "c-liderazgo", "estado": "cancelada", "fechaInscripcion": "2026-05-10" }
  ],
  "respuestas": [
    { "id": "r-010", "participanteId": "p-luis", "moduloId": "m-modelo", "contenido": "Mi modelo se basa en...", "estado": "enviada", "fechaEnvio": "2026-06-27" }
  ],
  "calificaciones": [
    { "id": "cal-010", "respuestaId": "r-010", "puntaje": 66, "nivel": "medio", "criterioMasBajo": "estructura de costos", "fecha": "2026-06-27" }
  ],
  "feedbacks": [
    { "id": "f-001", "administradorId": "a-diego", "participanteId": "p-luis", "capacitacionId": "c-emp-digital", "texto": "Buen avance en tu modelo de negocio. Revisa la estructura de costos antes de continuar con finanzas.", "fecha": "2026-06-28" }
  ]
}
```

Nótese cómo el mismo `p-luis` y el mismo `c-emp-digital` conectan `Inscripcion` → `Respuesta` → `Calificacion` → `Feedback`: cualquier pantalla que pida "el score de Luis en Emprendimiento Digital" llega al mismo 66, y el feedback que ve en CU-2 corresponde exactamente a esa calificación — no a un texto suelto sin relación.
