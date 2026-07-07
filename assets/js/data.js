/* ===================================================================
   REGICAP — dataset semilla (ver ../../DATA_MODEL.md para el esquema)
   Este objeto se copia una sola vez a localStorage la primera vez que
   se abre el sitio (ver store.js). Todo lo demás — scores, distribución,
   historial — se calcula a partir de estas entidades, nunca a mano.
   =================================================================== */

const SEED_DATA = {

  empresas: [
    { id: 'e-camara',      nombre: 'Cámara de Comercio', tipo: 'cámara',      email: 'contacto@camaracomercio.org' },
    { id: 'e-banco',       nombre: 'Banco Nacional',     tipo: 'banco',       email: 'capacitacion@banconacional.com' },
    { id: 'e-google',      nombre: 'Google Actívate',    tipo: 'plataforma',  email: 'activate@google.com' },
    { id: 'e-uni',         nombre: 'Universidad Nacional', tipo: 'universidad', email: 'extension@unal.edu' },
    { id: 'e-procolombia', nombre: 'ProColombia',        tipo: 'gobierno',    email: 'capacitaciones@procolombia.co' },
    { id: 'e-mit',         nombre: 'MIT xPRO',           tipo: 'universidad', email: 'programs@mitxpro.mit.edu' },
    { id: 'e-utp',         nombre: 'Universidad Tecnológica de Panamá', tipo: 'universidad', email: 'redes@utp.ac.pa' },
  ],

  administradores: [
    { id: 'a-diego', nombre: 'Diego Ramírez', email: 'diego.ramirez@regicap.edu' },
  ],

  participantes: [
    { id: 'p-ana',       nombre: 'Ana Torres',      email: 'ana.torres@correo.com' },
    { id: 'p-luis',      nombre: 'Luis Pérez',      email: 'luis.perez@correo.com' },
    { id: 'p-maria',     nombre: 'María Gómez',     email: 'maria.gomez@correo.com' },
    { id: 'p-carlos',    nombre: 'Carlos Ruiz',     email: 'carlos.ruiz@correo.com' },
    { id: 'p-sofia',     nombre: 'Sofia Lara',      email: 'sofia.lara@correo.com' },
    { id: 'p-diana',     nombre: 'Diana Vega',      email: 'diana.vega@correo.com' },
    { id: 'p-jorge',     nombre: 'Jorge Salazar',   email: 'jorge.salazar@correo.com' },
    { id: 'p-valentina', nombre: 'Valentina Ríos',  email: 'valentina.rios@correo.com' },
    { id: 'p-andres',    nombre: 'Andrés Molina',   email: 'andres.molina@correo.com' },
    { id: 'p-camila',    nombre: 'Camila Ortiz',    email: 'camila.ortiz@correo.com' },
  ],

  capacitaciones: [
    { id: 'c-emp-digital', empresaId: 'e-camara',      nombre: 'Emprendimiento Digital',      duracion: '8 semanas',  estado: 'publicada', createdAt: '2026-01-15' },
    { id: 'c-fin-pyme',    empresaId: 'e-banco',       nombre: 'Finanzas para PyMEs',          duracion: '4 semanas',  estado: 'publicada', createdAt: '2026-01-20' },
    { id: 'c-mkt-redes',   empresaId: 'e-google',      nombre: 'Marketing en Redes Sociales',  duracion: '5 semanas',  estado: 'publicada', createdAt: '2026-02-01' },
    { id: 'c-liderazgo',   empresaId: 'e-uni',         nombre: 'Liderazgo y Equipos',          duracion: '6 semanas',  estado: 'publicada', createdAt: '2026-02-05' },
    { id: 'c-ventas',      empresaId: 'e-camara',      nombre: 'Ventas Consultivas',           duracion: '6 semanas',  estado: 'publicada', createdAt: '2026-03-01' },
    { id: 'c-comercio',    empresaId: 'e-procolombia', nombre: 'Comercio Internacional',       duracion: '8 semanas',  estado: 'publicada', createdAt: '2026-03-10' },
    { id: 'c-innovacion',  empresaId: 'e-mit',         nombre: 'Innovación y Producto',        duracion: '10 semanas', estado: 'publicada', createdAt: '2026-03-12' },
    { id: 'c-redes',       empresaId: 'e-utp',         nombre: 'Fundamentos de Redes',         duracion: '6 semanas',  estado: 'publicada', createdAt: '2026-06-01' },
    { id: 'c-inventarios', empresaId: 'e-camara',      nombre: 'Gestión de Inventarios',       duracion: 'Por definir', estado: 'borrador',  createdAt: '2026-06-29' },
  ],

  modulos: [
    { id: 'm-ideacion',            capacitacionId: 'c-emp-digital', nombre: 'Ideación y validación',   orden: 1 },
    { id: 'm-modelo',              capacitacionId: 'c-emp-digital', nombre: 'Modelo de negocio',        orden: 2 },
    { id: 'm-finanzas-basicas',    capacitacionId: 'c-emp-digital', nombre: 'Finanzas básicas',         orden: 3 },
    { id: 'm-mkt-digital',         capacitacionId: 'c-emp-digital', nombre: 'Marketing digital',        orden: 4 },
    { id: 'm-escalamiento',        capacitacionId: 'c-emp-digital', nombre: 'Escalamiento',             orden: 5 },

    { id: 'm-contabilidad',        capacitacionId: 'c-fin-pyme', nombre: 'Contabilidad básica', orden: 1 },
    { id: 'm-flujo-caja',          capacitacionId: 'c-fin-pyme', nombre: 'Flujo de caja',        orden: 2 },

    { id: 'm-estrategia-contenido', capacitacionId: 'c-mkt-redes', nombre: 'Estrategia de contenido', orden: 1 },
    { id: 'm-publicidad-pagada',    capacitacionId: 'c-mkt-redes', nombre: 'Publicidad pagada',        orden: 2 },

    { id: 'm-comunicacion',      capacitacionId: 'c-liderazgo', nombre: 'Comunicación efectiva', orden: 1 },
    { id: 'm-gestion-equipos',   capacitacionId: 'c-liderazgo', nombre: 'Gestión de equipos',     orden: 2 },
    { id: 'm-toma-decisiones',   capacitacionId: 'c-liderazgo', nombre: 'Toma de decisiones',     orden: 3 },

    { id: 'm-fundamentos-venta', capacitacionId: 'c-ventas', nombre: 'Fundamentos de venta consultiva', orden: 1 },
    { id: 'm-manejo-objeciones', capacitacionId: 'c-ventas', nombre: 'Manejo de objeciones',            orden: 2 },

    { id: 'm-intro-comercio',     capacitacionId: 'c-comercio', nombre: 'Introducción al comercio exterior', orden: 1 },
    { id: 'm-arancel-tratados',   capacitacionId: 'c-comercio', nombre: 'Aranceles y tratados',              orden: 2 },
    { id: 'm-logistica',          capacitacionId: 'c-comercio', nombre: 'Logística internacional',           orden: 3 },
    { id: 'm-documentacion',      capacitacionId: 'c-comercio', nombre: 'Documentación de exportación',      orden: 4 },
    { id: 'm-entrada-mercados',   capacitacionId: 'c-comercio', nombre: 'Estrategia de entrada a mercados',  orden: 5 },

    { id: 'm-descubrimiento',          capacitacionId: 'c-innovacion', nombre: 'Descubrimiento de problema', orden: 1 },
    { id: 'm-prototipado',             capacitacionId: 'c-innovacion', nombre: 'Prototipado rápido',          orden: 2 },
    { id: 'm-validacion-usuarios',     capacitacionId: 'c-innovacion', nombre: 'Validación con usuarios',     orden: 3 },
    { id: 'm-modelo-agil',             capacitacionId: 'c-innovacion', nombre: 'Modelo de negocio ágil',      orden: 4 },
    { id: 'm-pitch',                   capacitacionId: 'c-innovacion', nombre: 'Pitch y financiamiento',      orden: 5 },
    { id: 'm-escalamiento-producto',   capacitacionId: 'c-innovacion', nombre: 'Escalamiento de producto',    orden: 6 },

    { id: 'm-redes-ip',     capacitacionId: 'c-redes', nombre: 'Direccionamiento IP',                          orden: 1, tipo: 'contenido' },
    { id: 'm-redes-switch', capacitacionId: 'c-redes', nombre: 'Configuración y conceptos básicos del switch', orden: 2, tipo: 'contenido' },
    { id: 'm-redes-router', capacitacionId: 'c-redes', nombre: 'Configuración básica del router',              orden: 3, tipo: 'contenido' },
    /* Módulo final opcional: solo contiene el test que reúne los cuestionarios
       de todos los módulos de contenido (ver preguntasEvaluacion en store.js). */
    { id: 'm-redes-final',  capacitacionId: 'c-redes', nombre: 'Evaluación final',                             orden: 4, tipo: 'test' },
  ],

  capitulos: [
    { id: 'cap-video-idea01',        moduloId: 'm-ideacion',             titulo: '¿Qué es un problema validable?',          tipo: 'video', contenido: 'https://youtube.com/watch?v=idea01',     orden: 1 },
    { id: 'cap-pdf-guia-entrevistas', moduloId: 'm-ideacion',            titulo: 'Guía de entrevistas a clientes',          tipo: 'pdf',   contenido: 'guia-entrevistas.pdf',                    orden: 2 },
    { id: 'cap-texto-buyerpersona',  moduloId: 'm-estrategia-contenido', titulo: 'Cómo definir tu buyer persona',           tipo: 'texto', contenido: 'Un buyer persona es una representación semi-ficticia de tu cliente ideal, basada en datos reales sobre comportamiento y demografía.', orden: 1 },
    { id: 'cap-pdf-calendario',      moduloId: 'm-estrategia-contenido', titulo: 'Calendario de contenido a 30 días',       tipo: 'pdf',   contenido: 'calendario-contenido.pdf',                orden: 2 },
    { id: 'cap-pdf-manual-venta',    moduloId: 'm-fundamentos-venta',    titulo: 'Introducción a la venta consultiva',      tipo: 'pdf',   contenido: 'manual-venta-consultiva.pdf',             orden: 1 },
    { id: 'cap-video-caso-practico', moduloId: 'm-fundamentos-venta',    titulo: 'Caso práctico',                          tipo: 'video', contenido: 'https://youtube.com/watch?v=abc123',      orden: 2 },
    { id: 'cap-texto-objeciones',    moduloId: 'm-manejo-objeciones',    titulo: 'Técnicas de respuesta a objeciones',      tipo: 'texto', contenido: 'Las objeciones más comunes son precio, tiempo y confianza. Para cada una existe una técnica de respuesta específica…', orden: 1 },

    /* ---- Fundamentos de Redes (Universidad Tecnológica de Panamá) ----
       Contenido real suministrado por el docente: los PDFs viven en
       assets/pdfs/ y los videos son tutoriales públicos de YouTube. */
    { id: 'cap-redes-ip-texto',  moduloId: 'm-redes-ip', titulo: 'La capa de red y las direcciones IP', tipo: 'texto', orden: 1,
      contenido: 'En esta unidad estudiarás la capa de red del modelo OSI y el direccionamiento IP. Una dirección IPv4 es un número de 32 bits que identifica de forma única a cada dispositivo en la red y se divide en una porción de red y una de host. Repasarás la estructura de las direcciones, las clases A, B y C, la máscara de subred y por qué es necesaria la división en subredes (subnetting) para administrar y segmentar redes de manera eficiente.' },
    { id: 'cap-redes-ip-video',  moduloId: 'm-redes-ip', titulo: 'Video · Direccionamiento IPv4 y subredes', tipo: 'video', contenido: 'https://www.youtube.com/watch?v=qEE0s9cnj34', orden: 2 },
    { id: 'cap-redes-ip-pdf',    moduloId: 'm-redes-ip', titulo: 'Material del docente · Direccionamiento IP', tipo: 'pdf', contenido: 'redes-ip-direccionamiento.pdf', orden: 3 },

    { id: 'cap-redes-sw-texto',  moduloId: 'm-redes-switch', titulo: 'Conceptos básicos del switch y la conmutación', tipo: 'texto', orden: 1,
      contenido: 'El switch interconecta los equipos dentro de una misma red local (LAN) y toma decisiones de reenvío a nivel de capa de enlace usando direcciones MAC. En este módulo revisarás el arranque del switch, el acceso por consola, la configuración inicial (nombre, contraseñas e IP de administración), la seguridad de puertos y los conceptos de tabla de direcciones MAC y dominios de colisión.' },
    { id: 'cap-redes-sw-video',  moduloId: 'm-redes-switch', titulo: 'Video · Configuración básica de un switch Cisco', tipo: 'video', contenido: 'https://www.youtube.com/watch?v=S0kC3QTLVAU', orden: 2 },
    { id: 'cap-redes-sw-pdf',    moduloId: 'm-redes-switch', titulo: 'Material del docente · Configuración y conceptos básicos del switch', tipo: 'pdf', contenido: 'redes-switch-basico.pdf', orden: 3 },
    { id: 'cap-redes-sw-vlan',   moduloId: 'm-redes-switch', titulo: 'Material del docente · VLAN (segmentación de la red)', tipo: 'pdf', contenido: 'redes-switch-vlan.pdf', orden: 4 },

    { id: 'cap-redes-rt-texto',  moduloId: 'm-redes-router', titulo: 'Introducción al enrutamiento y envío de paquetes', tipo: 'texto', orden: 1,
      contenido: 'El router conecta redes distintas y decide, con base en su tabla de enrutamiento, el mejor camino para enviar cada paquete hacia su destino. En este módulo aprenderás la configuración básica de un router Cisco, la diferencia entre enrutamiento estático y dinámico, y cómo se construye y verifica la tabla de enrutamiento para lograr conectividad entre redes.' },
    { id: 'cap-redes-rt-video',  moduloId: 'm-redes-router', titulo: 'Video · Configuración básica de un router Cisco', tipo: 'video', contenido: 'https://www.youtube.com/watch?v=rVGmWNLw2E8', orden: 2 },
    { id: 'cap-redes-rt-pdf1',   moduloId: 'm-redes-router', titulo: 'Material del docente · Introducción al enrutamiento', tipo: 'pdf', contenido: 'redes-router-enrutamiento.pdf', orden: 3 },
    { id: 'cap-redes-rt-pdf2',   moduloId: 'm-redes-router', titulo: 'Material del docente · Enrutamiento estático', tipo: 'pdf', contenido: 'redes-router-estatico.pdf', orden: 4 },
    { id: 'cap-redes-rt-pdf3',   moduloId: 'm-redes-router', titulo: 'Material del docente · Enrutamiento dinámico', tipo: 'pdf', contenido: 'redes-router-dinamico.pdf', orden: 5 },
  ],

  /* Examen (CU-9): mismos 5 tipos que califica la IA en CU-4. La mayoría de
     módulos no tiene examen configurado todavía (array vacío = estado válido). */
  preguntas: [
    { id: 'q-simple-validacion', moduloId: 'm-ideacion', tipo: 'simple', peso: 20,
      texto: '¿Cuál de las siguientes NO es una técnica de validación de problema?',
      opciones: ['Encuestas', 'Entrevistas', 'Prototipo ficticio sin usuarios reales', 'Grupos focales'],
      respuestaCorrecta: 'Prototipo ficticio sin usuarios reales' },
    { id: 'q-compuesta-entrevista', moduloId: 'm-ideacion', tipo: 'compuesta', peso: 20,
      texto: 'Evalúa tu proceso de entrevistas a clientes',
      subItems: [{ texto: 'Claridad de las preguntas formuladas', peso: 50 }, { texto: 'Calidad de la escucha activa', peso: 50 }] },
    { id: 'q-textolibre-problema', moduloId: 'm-ideacion', tipo: 'texto_libre', peso: 20,
      texto: 'Describe el problema que estás validando y por qué crees que es real',
      rubrica: 'Se espera pertinencia, claridad y profundidad en la descripción del problema' },
    { id: 'q-cuant-entrevistas-min', moduloId: 'm-ideacion', tipo: 'cuantitativa', peso: 20,
      texto: '¿Cuántas entrevistas mínimas recomienda la guía para validar un problema?',
      valorEsperado: 10, tolerancia: 20 },
    { id: 'q-cual-pivote', moduloId: 'm-ideacion', tipo: 'cualitativa', peso: 20,
      texto: 'Justifica si tu emprendimiento debería pivotar según los resultados de tus entrevistas',
      rubrica: 'Se evalúa coherencia, viabilidad y profundidad del razonamiento' },

    { id: 'q-cuant-costo-fijo', moduloId: 'm-modelo', tipo: 'cuantitativa', peso: 100,
      texto: 'Calcula el costo fijo mensual estimado de tu modelo (USD)',
      valorEsperado: 500, tolerancia: 15 },

    /* ---- Examen · Fundamentos de Redes ---- */
    { id: 'q-redes-ip-bits', moduloId: 'm-redes-ip', tipo: 'simple', peso: 40,
      texto: '¿Cuántos bits tiene una dirección IPv4?',
      opciones: ['16 bits', '32 bits', '48 bits', '64 bits'], respuestaCorrecta: '32 bits' },
    { id: 'q-redes-ip-mascara', moduloId: 'm-redes-ip', tipo: 'texto_libre', peso: 30,
      texto: 'Explica con tus palabras para qué sirve la máscara de subred.',
      rubrica: 'Se espera que mencione la separación entre la porción de red y la de host' },
    { id: 'q-redes-ip-subredes', moduloId: 'm-redes-ip', tipo: 'cuantitativa', peso: 30,
      texto: '¿Cuántas subredes se obtienen al tomar prestados 3 bits de host?',
      valorEsperado: 8, tolerancia: 0 },

    { id: 'q-redes-sw-mac', moduloId: 'm-redes-switch', tipo: 'simple', peso: 50,
      texto: '¿Qué tipo de dirección usa el switch para reenviar tramas en la LAN?',
      opciones: ['Dirección IP', 'Dirección MAC', 'Número de puerto', 'Nombre de host'], respuestaCorrecta: 'Dirección MAC' },
    { id: 'q-redes-sw-vlan', moduloId: 'm-redes-switch', tipo: 'simple', peso: 50,
      texto: '¿Para qué sirve principalmente una VLAN?',
      opciones: ['Segmentar la red en dominios de difusión', 'Aumentar la velocidad del cable', 'Reemplazar al router', 'Cifrar todo el tráfico'], respuestaCorrecta: 'Segmentar la red en dominios de difusión' },

    { id: 'q-redes-rt-tabla', moduloId: 'm-redes-router', tipo: 'cualitativa', peso: 60,
      texto: 'Describe la diferencia entre enrutamiento estático y dinámico y cuándo usarías cada uno.',
      rubrica: 'Se evalúa claridad, correcta distinción y un criterio de aplicación razonable' },
    { id: 'q-redes-rt-comando', moduloId: 'm-redes-router', tipo: 'simple', peso: 40,
      texto: '¿Qué comando muestra la tabla de enrutamiento en un router Cisco?',
      opciones: ['show ip route', 'show running-config', 'ping', 'show vlan'], respuestaCorrecta: 'show ip route' },

    /* Preguntas propias de la evaluación final (integradoras de todo el curso) */
    { id: 'q-redes-final-osi', moduloId: 'm-redes-final', tipo: 'simple', peso: 50,
      texto: '¿En qué capa del modelo OSI operan principalmente los routers?',
      opciones: ['Capa de red', 'Capa de enlace de datos', 'Capa física', 'Capa de aplicación'], respuestaCorrecta: 'Capa de red' },
    { id: 'q-redes-final-integra', moduloId: 'm-redes-final', tipo: 'cualitativa', peso: 50,
      texto: 'Explica cómo se complementan el switch y el router en una red LAN conectada a Internet.',
      rubrica: 'Se evalúa que distinga conmutación en la LAN (switch) del enrutamiento entre redes (router) y su interacción' },
  ],

  inscripciones: [
    /* Luis Pérez — participante de la demo. Por defecto solo tiene Redes en
       curso (para tomar el curso) y una capacitación ya completada con
       feedback del administrador (para apreciar CU-2). Las demás quedan en
       el catálogo por si desea inscribirse. */
    { id: 'i-205', participanteId: 'p-luis', capacitacionId: 'c-redes',       estado: 'en_curso',   fechaInscripcion: '2026-06-15' },
    { id: 'i-203', participanteId: 'p-luis', capacitacionId: 'c-fin-pyme',    estado: 'completada', fechaInscripcion: '2026-04-02' },

    /* resto de participantes — alimentan las agregaciones del Administrador */
    { id: 'i-101', participanteId: 'p-ana',       capacitacionId: 'c-emp-digital', estado: 'completada', fechaInscripcion: '2026-03-10' },
    { id: 'i-102', participanteId: 'p-maria',     capacitacionId: 'c-fin-pyme',    estado: 'completada', fechaInscripcion: '2026-03-15' },
    { id: 'i-103', participanteId: 'p-carlos',    capacitacionId: 'c-emp-digital', estado: 'completada', fechaInscripcion: '2026-03-12' },
    { id: 'i-104', participanteId: 'p-sofia',     capacitacionId: 'c-liderazgo',   estado: 'en_curso',   fechaInscripcion: '2026-05-01' },
    { id: 'i-105', participanteId: 'p-diana',     capacitacionId: 'c-mkt-redes',   estado: 'completada', fechaInscripcion: '2026-03-20' },
    { id: 'i-106', participanteId: 'p-jorge',     capacitacionId: 'c-emp-digital', estado: 'en_curso',   fechaInscripcion: '2026-05-06' },
    { id: 'i-107', participanteId: 'p-valentina', capacitacionId: 'c-fin-pyme',    estado: 'completada', fechaInscripcion: '2026-03-18' },
    { id: 'i-108', participanteId: 'p-andres',    capacitacionId: 'c-mkt-redes',   estado: 'en_curso',   fechaInscripcion: '2026-05-08' },
    { id: 'i-109', participanteId: 'p-camila',    capacitacionId: 'c-liderazgo',   estado: 'completada', fechaInscripcion: '2026-03-25' },
  ],

  respuestas: [
    { id: 'r-201', participanteId: 'p-luis', moduloId: 'm-estrategia-contenido', estado: 'enviada', fechaEnvio: '2026-06-25', entregable: null,
      contenido: 'Mi estrategia de contenido se basa en publicar fotos de mis productos. Aún no tengo claro cómo medir el alcance ni segmentar a mi audiencia…' },
    { id: 'r-202', participanteId: 'p-luis', moduloId: 'm-ideacion', estado: 'enviada', fechaEnvio: '2026-06-10', entregable: null,
      contenido: 'Validé mi problema con 12 entrevistas a emprendedores del sector textil de mi ciudad.' },
    { id: 'r-203', participanteId: 'p-luis', moduloId: 'm-modelo', estado: 'enviada', fechaEnvio: '2026-06-27', entregable: null,
      contenido: 'Mi modelo se basa en un marketplace con comisión por transacción del 8%.' },
    { id: 'r-204', participanteId: 'p-luis', moduloId: 'm-finanzas-basicas', estado: 'enviada', fechaEnvio: '2026-06-29', entregable: null,
      contenido: 'Proyecté mi flujo de caja a 6 meses considerando gastos fijos y variables.' },
    { id: 'r-205', participanteId: 'p-luis', moduloId: 'm-contabilidad', estado: 'enviada', fechaEnvio: '2026-04-20', entregable: null,
      contenido: 'Registré mis ingresos y egresos usando el método de partida doble.' },
    { id: 'r-206', participanteId: 'p-luis', moduloId: 'm-flujo-caja', estado: 'enviada', fechaEnvio: '2026-05-02', entregable: null,
      contenido: 'Proyecté mi flujo de caja considerando la estacionalidad de mis ventas.' },

    { id: 'r-101', participanteId: 'p-ana',       moduloId: 'm-ideacion',             estado: 'enviada', fechaEnvio: '2026-04-01', entregable: null, contenido: 'Validé mi problema entrevistando a 20 potenciales clientes.' },
    { id: 'r-102', participanteId: 'p-maria',     moduloId: 'm-contabilidad',         estado: 'enviada', fechaEnvio: '2026-04-05', entregable: null, contenido: 'Registré mis movimientos contables del último trimestre.' },
    { id: 'r-103', participanteId: 'p-carlos',    moduloId: 'm-ideacion',             estado: 'enviada', fechaEnvio: '2026-04-02', entregable: null, contenido: 'Validé mi problema con encuestas a 30 usuarios potenciales.' },
    { id: 'r-104', participanteId: 'p-sofia',     moduloId: 'm-comunicacion',         estado: 'enviada', fechaEnvio: '2026-06-15', entregable: null, contenido: 'Documenté cómo mejoré la comunicación con mi equipo de 8 personas.' },
    { id: 'r-105', participanteId: 'p-diana',     moduloId: 'm-estrategia-contenido', estado: 'enviada', fechaEnvio: '2026-04-18', entregable: null, contenido: 'Mi estrategia de contenido no tiene un buyer persona definido aún.' },
    { id: 'r-106', participanteId: 'p-jorge',     moduloId: 'm-ideacion',             estado: 'enviada', fechaEnvio: '2026-06-20', entregable: null, contenido: 'Validé mi problema con 8 entrevistas a comerciantes locales.' },
    { id: 'r-107', participanteId: 'p-valentina', moduloId: 'm-contabilidad',         estado: 'enviada', fechaEnvio: '2026-04-10', entregable: null, contenido: 'Organicé mi contabilidad usando una plantilla de partida doble.' },
    { id: 'r-108', participanteId: 'p-andres',    moduloId: 'm-estrategia-contenido', estado: 'enviada', fechaEnvio: '2026-06-22', entregable: null, contenido: 'Publico contenido sin un calendario definido todavía.' },
    { id: 'r-109', participanteId: 'p-camila',    moduloId: 'm-comunicacion',         estado: 'enviada', fechaEnvio: '2026-04-22', entregable: null, contenido: 'Implementé reuniones semanales de retroalimentación con mi equipo.' },
  ],

  calificaciones: [
    { id: 'cal-201', respuestaId: 'r-201', puntaje: 61, nivel: 'medio', criterioMasBajo: 'claridad',              fecha: '2026-06-25' },
    { id: 'cal-202', respuestaId: 'r-202', puntaje: 85, nivel: 'alto',  criterioMasBajo: 'profundidad',           fecha: '2026-06-10' },
    { id: 'cal-203', respuestaId: 'r-203', puntaje: 66, nivel: 'medio', criterioMasBajo: 'estructura de costos',  fecha: '2026-06-27' },
    { id: 'cal-204', respuestaId: 'r-204', puntaje: 70, nivel: 'medio', criterioMasBajo: 'proyección a largo plazo', fecha: '2026-06-29' },
    { id: 'cal-205', respuestaId: 'r-205', puntaje: 90, nivel: 'alto',  criterioMasBajo: '—',                     fecha: '2026-04-20' },
    { id: 'cal-206', respuestaId: 'r-206', puntaje: 88, nivel: 'alto',  criterioMasBajo: '—',                     fecha: '2026-05-02' },

    { id: 'cal-101', respuestaId: 'r-101', puntaje: 88, nivel: 'alto',  criterioMasBajo: '—',            fecha: '2026-04-01' },
    { id: 'cal-102', respuestaId: 'r-102', puntaje: 45, nivel: 'bajo',  criterioMasBajo: 'exactitud de cálculos', fecha: '2026-04-05' },
    { id: 'cal-103', respuestaId: 'r-103', puntaje: 92, nivel: 'alto',  criterioMasBajo: '—',            fecha: '2026-04-02' },
    { id: 'cal-104', respuestaId: 'r-104', puntaje: 74, nivel: 'medio', criterioMasBajo: 'claridad',     fecha: '2026-06-15' },
    { id: 'cal-105', respuestaId: 'r-105', puntaje: 38, nivel: 'bajo',  criterioMasBajo: 'pertinencia',  fecha: '2026-04-18' },
    { id: 'cal-106', respuestaId: 'r-106', puntaje: 79, nivel: 'medio', criterioMasBajo: 'profundidad',  fecha: '2026-06-20' },
    { id: 'cal-107', respuestaId: 'r-107', puntaje: 85, nivel: 'alto',  criterioMasBajo: '—',            fecha: '2026-04-10' },
    { id: 'cal-108', respuestaId: 'r-108', puntaje: 55, nivel: 'bajo',  criterioMasBajo: 'claridad',     fecha: '2026-06-22' },
    { id: 'cal-109', respuestaId: 'r-109', puntaje: 69, nivel: 'medio', criterioMasBajo: 'viabilidad',   fecha: '2026-04-22' },
  ],

  feedbacks: [
    { id: 'f-002', administradorId: 'a-diego', participanteId: 'p-luis', capacitacionId: 'c-fin-pyme', fecha: '2026-05-05',
      texto: 'Excelente manejo del flujo de caja. Tu proyección considerando la estacionalidad fue muy acertada. ¡Sigue así!' },
    { id: 'f-003', administradorId: 'a-diego', participanteId: 'p-luis', capacitacionId: 'c-fin-pyme', fecha: '2026-05-06',
      texto: 'Un punto a reforzar: documenta los supuestos de cada escenario para que tus proyecciones sean reproducibles.' },
  ],

  /* 2024-A/2024-B son agregados históricos precalculados (exceden el dataset de
     ejemplo). 2025-A sí se recalcula en vivo desde las inscripciones vigentes —
     ver computeCohortes() en store.js. */
  cohortes: [
    { id: 'co-2024a', periodo: '2024-A', scorePromedio: 67, participantes: 1240, actual: false },
    { id: 'co-2024b', periodo: '2024-B', scorePromedio: 70, participantes: 1655, actual: false },
    { id: 'co-2025a', periodo: '2025-A', scorePromedio: null, participantes: 1886, actual: true },
  ],

  decisiones: [
    { id: 'd-001', cohorteId: 'co-2025a', tipo: 'warning', aplicada: false,
      texto: 'Rediseñar el contenido de Marketing en Redes Sociales — es la capacitación con el desempeño más bajo actualmente.' },
    { id: 'd-002', cohorteId: 'co-2025a', tipo: 'info', aplicada: false,
      texto: 'Incrementar sesiones de acompañamiento para los participantes con rendimiento bajo.' },
    { id: 'd-003', cohorteId: 'co-2025a', tipo: 'success', aplicada: true,
      texto: 'Replicar la metodología de Emprendimiento Digital en las capacitaciones más débiles.' },
  ],
};

/* Identidad de la sesión demo por rol — a qué entidad del dataset corresponde
   cada uno de los 3 logins, y cómo se pinta en el shell (avatar/color). */
const SESSION_IDENTITIES = {
  administrador: { entity: 'administradores', id: 'a-diego', role: 'Administrador', color: '#185FA5', home: 'resultados' },
  participante:  { entity: 'participantes',   id: 'p-luis',  role: 'Participante',  color: '#1D9E75', home: 'gestionar' },
  empresa:       { entity: 'empresas',        id: 'e-camara', role: 'Empresa',      color: '#854F0B', home: 'registrar' },
};
