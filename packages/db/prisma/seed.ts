/**
 * Seed de demostración de REGICAP (datos del prototipo adaptados al modelo de la Fase 2).
 *
 *   pnpm db:seed            → solo si la base está vacía
 *   SEED_FORCE=true pnpm …  → borra todo y vuelve a sembrar
 *
 * Todas las cuentas de demostración usan la contraseña: Regicap2026!
 * Los PDF de ejemplo se suben al almacenamiento S3/MinIO si está disponible.
 */
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { PrismaClient, type Nivel, type TipoPregunta } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { config } from 'dotenv';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

for (const ruta of [resolve(__dirname, '../../../.env'), resolve(process.cwd(), '.env')]) {
  if (existsSync(ruta)) {
    config({ path: ruta });
    break;
  }
}

const prisma = new PrismaClient();
export const PASSWORD_DEMO = 'Regicap2026!';
const PDF_DIR = resolve(__dirname, '../../../prototype/assets/pdfs');

const hace = (dias: number) => new Date(Date.now() - dias * 86_400_000);
const nivelDe = (p: number): Nivel => (p >= 80 ? 'ALTO' : p >= 60 ? 'MEDIO' : 'BAJO');

/* ───────────── Datos ───────────── */

const EMPRESAS = [
  { k: 'camara', nombre: 'Cámara de Comercio', tipo: 'cámara', empresa: ['Equipo Cámara de Comercio', 'contacto@camaracomercio.org'], admin: ['Diego Ramírez', 'diego.ramirez@regicap.edu'] },
  { k: 'procolombia', nombre: 'ProColombia', tipo: 'gobierno', empresa: ['Equipo ProColombia', 'capacitaciones@procolombia.co'], admin: ['Andrea Rojas', 'admin@procolombia.co'] },
  { k: 'mit', nombre: 'MIT xPRO', tipo: 'universidad', empresa: ['Equipo MIT xPRO', 'programs@mitxpro.mit.edu'], admin: ['Thomas Grant', 'admin@mitxpro.mit.edu'] },
  { k: 'utp', nombre: 'Universidad Tecnológica de Panamá', tipo: 'universidad', empresa: ['Docente de Redes UTP', 'redes@utp.ac.pa'], admin: ['Coordinación de Redes', 'admin.redes@utp.ac.pa'] },
] as const;

const PARTICIPANTES = [
  ['ana', 'Ana Torres', 'ana.torres@correo.com'],
  ['luis', 'Luis Pérez', 'luis.perez@correo.com'],
  ['maria', 'María Gómez', 'maria.gomez@correo.com'],
  ['carlos', 'Carlos Ruiz', 'carlos.ruiz@correo.com'],
  ['sofia', 'Sofia Lara', 'sofia.lara@correo.com'],
  ['diana', 'Diana Vega', 'diana.vega@correo.com'],
  ['jorge', 'Jorge Salazar', 'jorge.salazar@correo.com'],
  ['valentina', 'Valentina Ríos', 'valentina.rios@correo.com'],
  ['andres', 'Andrés Molina', 'andres.molina@correo.com'],
  ['camila', 'Camila Ortiz', 'camila.ortiz@correo.com'],
] as const;

type Pg =
  | { tipo: 'SIMPLE'; texto: string; peso: number; opciones: string[]; correcta: string }
  | { tipo: 'TEXTO_LIBRE' | 'CUALITATIVA'; texto: string; peso: number; rubrica: string }
  | { tipo: 'CUANTITATIVA'; texto: string; peso: number; esperado: number; tolerancia: number };

type Act = { titulo: string; tipo: 'PDF' | 'TEXTO' | 'VIDEO'; contenido: string };
interface Mod {
  nombre: string;
  tipo?: 'CONTENIDO' | 'TEST';
  actividades?: Act[];
  preguntas?: Pg[];
}
interface Cap {
  k: string;
  empresa: (typeof EMPRESAS)[number]['k'];
  nombre: string;
  duracion: string;
  estado: 'BORRADOR' | 'PUBLICADA';
  dias: number;
  modulos: Mod[];
}

const p = (t: string) => `<p>${t}</p>`;

const CAPACITACIONES: Cap[] = [
  {
    k: 'emp-digital', empresa: 'camara', nombre: 'Emprendimiento Digital', duracion: '8 semanas', estado: 'PUBLICADA', dias: 400,
    modulos: [
      {
        nombre: 'Ideación y validación',
        actividades: [
          { titulo: '¿Qué es un problema validable?', tipo: 'VIDEO', contenido: 'https://youtube.com/watch?v=idea01' },
          { titulo: 'Guía de entrevistas a clientes', tipo: 'PDF', contenido: 'guia-entrevistas.pdf' },
        ],
        preguntas: [
          { tipo: 'SIMPLE', texto: '¿Cuál de las siguientes NO es una técnica de validación de problema?', peso: 25, opciones: ['Encuestas', 'Entrevistas', 'Prototipo ficticio sin usuarios reales', 'Grupos focales'], correcta: 'Prototipo ficticio sin usuarios reales' },
          { tipo: 'TEXTO_LIBRE', texto: 'Describe el problema que estás validando y por qué crees que es real', peso: 25, rubrica: 'Se espera pertinencia, claridad y profundidad en la descripción del problema' },
          { tipo: 'CUANTITATIVA', texto: '¿Cuántas entrevistas mínimas recomienda la guía para validar un problema?', peso: 25, esperado: 10, tolerancia: 20 },
          { tipo: 'CUALITATIVA', texto: 'Justifica si tu emprendimiento debería pivotar según los resultados de tus entrevistas', peso: 25, rubrica: 'Se evalúa coherencia, viabilidad y profundidad del razonamiento' },
        ],
      },
      { nombre: 'Modelo de negocio', preguntas: [{ tipo: 'CUANTITATIVA', texto: 'Calcula el costo fijo mensual estimado de tu modelo (USD)', peso: 100, esperado: 500, tolerancia: 15 }] },
      { nombre: 'Finanzas básicas' },
      { nombre: 'Marketing digital' },
      { nombre: 'Escalamiento' },
    ],
  },
  { k: 'fin-pyme', empresa: 'camara', nombre: 'Finanzas para PyMEs', duracion: '4 semanas', estado: 'PUBLICADA', dias: 390, modulos: [{ nombre: 'Contabilidad básica' }, { nombre: 'Flujo de caja' }] },
  {
    k: 'mkt-redes', empresa: 'camara', nombre: 'Marketing en Redes Sociales', duracion: '5 semanas', estado: 'PUBLICADA', dias: 380,
    modulos: [
      {
        nombre: 'Estrategia de contenido',
        actividades: [
          { titulo: 'Cómo definir tu buyer persona', tipo: 'TEXTO', contenido: p('Un buyer persona es una representación semi-ficticia de tu cliente ideal, basada en datos reales sobre comportamiento y demografía.') },
          { titulo: 'Calendario de contenido a 30 días', tipo: 'PDF', contenido: 'calendario-contenido.pdf' },
        ],
      },
      { nombre: 'Publicidad pagada' },
    ],
  },
  { k: 'liderazgo', empresa: 'camara', nombre: 'Liderazgo y Equipos', duracion: '6 semanas', estado: 'PUBLICADA', dias: 370, modulos: [{ nombre: 'Comunicación efectiva' }, { nombre: 'Gestión de equipos' }, { nombre: 'Toma de decisiones' }] },
  {
    k: 'ventas', empresa: 'camara', nombre: 'Ventas Consultivas', duracion: '6 semanas', estado: 'PUBLICADA', dias: 330,
    modulos: [
      {
        nombre: 'Fundamentos de venta consultiva',
        actividades: [
          { titulo: 'Introducción a la venta consultiva', tipo: 'PDF', contenido: 'manual-venta-consultiva.pdf' },
          { titulo: 'Caso práctico', tipo: 'VIDEO', contenido: 'https://youtube.com/watch?v=abc123' },
        ],
      },
      {
        nombre: 'Manejo de objeciones',
        actividades: [
          { titulo: 'Técnicas de respuesta a objeciones', tipo: 'TEXTO', contenido: p('Las objeciones más comunes son precio, tiempo y confianza. Para cada una existe una técnica de respuesta específica…') },
        ],
      },
    ],
  },
  {
    k: 'comercio', empresa: 'procolombia', nombre: 'Comercio Internacional', duracion: '8 semanas', estado: 'PUBLICADA', dias: 320,
    modulos: [{ nombre: 'Introducción al comercio exterior' }, { nombre: 'Aranceles y tratados' }, { nombre: 'Logística internacional' }, { nombre: 'Documentación de exportación' }, { nombre: 'Estrategia de entrada a mercados' }],
  },
  {
    k: 'innovacion', empresa: 'mit', nombre: 'Innovación y Producto', duracion: '10 semanas', estado: 'PUBLICADA', dias: 310,
    modulos: [{ nombre: 'Descubrimiento de problema' }, { nombre: 'Prototipado rápido' }, { nombre: 'Validación con usuarios' }, { nombre: 'Modelo de negocio ágil' }, { nombre: 'Pitch y financiamiento' }, { nombre: 'Escalamiento de producto' }],
  },
  {
    k: 'redes', empresa: 'utp', nombre: 'Fundamentos de Redes', duracion: '6 semanas', estado: 'PUBLICADA', dias: 150,
    modulos: [
      {
        nombre: 'Direccionamiento IP',
        actividades: [
          { titulo: 'La capa de red y las direcciones IP', tipo: 'TEXTO', contenido: p('En esta unidad estudiarás la capa de red del modelo OSI y el direccionamiento IP. Una dirección IPv4 es un número de 32 bits que identifica de forma única a cada dispositivo en la red y se divide en una porción de red y una de host.') + p('Repasarás la estructura de las direcciones, las clases A, B y C, la máscara de subred y por qué es necesaria la división en subredes (subnetting) para administrar y segmentar redes de manera eficiente.') },
          { titulo: 'Video · Direccionamiento IPv4 y subredes', tipo: 'VIDEO', contenido: 'https://www.youtube.com/watch?v=qEE0s9cnj34' },
          { titulo: 'Material del docente · Direccionamiento IP', tipo: 'PDF', contenido: 'redes-ip-direccionamiento.pdf' },
        ],
        preguntas: [
          { tipo: 'SIMPLE', texto: '¿Cuántos bits tiene una dirección IPv4?', peso: 40, opciones: ['16 bits', '32 bits', '48 bits', '64 bits'], correcta: '32 bits' },
          { tipo: 'TEXTO_LIBRE', texto: 'Explica con tus palabras para qué sirve la máscara de subred.', peso: 30, rubrica: 'Se espera que mencione la separación entre la porción de red y la de host' },
          { tipo: 'CUANTITATIVA', texto: '¿Cuántas subredes se obtienen al tomar prestados 3 bits de host?', peso: 30, esperado: 8, tolerancia: 0 },
        ],
      },
      {
        nombre: 'Configuración y conceptos básicos del switch',
        actividades: [
          { titulo: 'Conceptos básicos del switch y la conmutación', tipo: 'TEXTO', contenido: p('El switch interconecta los equipos dentro de una misma red local (LAN) y toma decisiones de reenvío a nivel de capa de enlace usando direcciones MAC.') + p('En este módulo revisarás el arranque del switch, el acceso por consola, la configuración inicial (nombre, contraseñas e IP de administración), la seguridad de puertos y los conceptos de tabla de direcciones MAC y dominios de colisión.') },
          { titulo: 'Video · Configuración básica de un switch Cisco', tipo: 'VIDEO', contenido: 'https://www.youtube.com/watch?v=S0kC3QTLVAU' },
          { titulo: 'Material del docente · Configuración y conceptos básicos del switch', tipo: 'PDF', contenido: 'redes-switch-basico.pdf' },
          { titulo: 'Material del docente · VLAN (segmentación de la red)', tipo: 'PDF', contenido: 'redes-switch-vlan.pdf' },
        ],
        preguntas: [
          { tipo: 'SIMPLE', texto: '¿Qué tipo de dirección usa el switch para reenviar tramas en la LAN?', peso: 50, opciones: ['Dirección IP', 'Dirección MAC', 'Número de puerto', 'Nombre de host'], correcta: 'Dirección MAC' },
          { tipo: 'SIMPLE', texto: '¿Para qué sirve principalmente una VLAN?', peso: 50, opciones: ['Segmentar la red en dominios de difusión', 'Aumentar la velocidad del cable', 'Reemplazar al router', 'Cifrar todo el tráfico'], correcta: 'Segmentar la red en dominios de difusión' },
        ],
      },
      {
        nombre: 'Configuración básica del router',
        actividades: [
          { titulo: 'Introducción al enrutamiento y envío de paquetes', tipo: 'TEXTO', contenido: p('El router conecta redes distintas y decide, con base en su tabla de enrutamiento, el mejor camino para enviar cada paquete hacia su destino.') + p('En este módulo aprenderás la configuración básica de un router Cisco, la diferencia entre enrutamiento estático y dinámico, y cómo se construye y verifica la tabla de enrutamiento para lograr conectividad entre redes.') },
          { titulo: 'Video · Configuración básica de un router Cisco', tipo: 'VIDEO', contenido: 'https://www.youtube.com/watch?v=rVGmWNLw2E8' },
          { titulo: 'Material del docente · Introducción al enrutamiento', tipo: 'PDF', contenido: 'redes-router-enrutamiento.pdf' },
          { titulo: 'Material del docente · Enrutamiento estático', tipo: 'PDF', contenido: 'redes-router-estatico.pdf' },
          { titulo: 'Material del docente · Enrutamiento dinámico', tipo: 'PDF', contenido: 'redes-router-dinamico.pdf' },
        ],
        preguntas: [
          { tipo: 'CUALITATIVA', texto: 'Describe la diferencia entre enrutamiento estático y dinámico y cuándo usarías cada uno.', peso: 60, rubrica: 'Se evalúa claridad, correcta distinción y un criterio de aplicación razonable' },
          { tipo: 'SIMPLE', texto: '¿Qué comando muestra la tabla de enrutamiento en un router Cisco?', peso: 40, opciones: ['show ip route', 'show running-config', 'ping', 'show vlan'], correcta: 'show ip route' },
        ],
      },
      {
        nombre: 'Evaluación final',
        tipo: 'TEST',
        preguntas: [
          { tipo: 'SIMPLE', texto: '¿En qué capa del modelo OSI operan principalmente los routers?', peso: 50, opciones: ['Capa de red', 'Capa de enlace de datos', 'Capa física', 'Capa de aplicación'], correcta: 'Capa de red' },
          { tipo: 'CUALITATIVA', texto: 'Explica cómo se complementan el switch y el router en una red LAN conectada a Internet.', peso: 50, rubrica: 'Se evalúa que distinga conmutación en la LAN (switch) del enrutamiento entre redes (router) y su interacción' },
        ],
      },
    ],
  },
  { k: 'inventarios', empresa: 'camara', nombre: 'Gestión de Inventarios', duracion: 'Por definir', estado: 'BORRADOR', dias: 5, modulos: [] },
];

/** Inscripciones sembradas: puntajes de los primeros N módulos (el estado se deriva del avance). */
interface Insc {
  p: string;
  cap: string;
  dias: number;
  puntajes: number[];
  cancelada?: boolean;
  textos?: string[];
}
const INSCRIPCIONES: Insc[] = [
  // Luis Pérez — participante de la demo
  { p: 'luis', cap: 'redes', dias: 20, puntajes: [] },
  { p: 'luis', cap: 'mkt-redes', dias: 60, puntajes: [61], textos: ['Mi estrategia de contenido se basa en publicar fotos de mis productos. Aún no tengo claro cómo medir el alcance ni segmentar a mi audiencia…'] },
  { p: 'luis', cap: 'fin-pyme', dias: 210, puntajes: [90, 88] },
  { p: 'luis', cap: 'liderazgo', dias: 45, puntajes: [], cancelada: true },
  // Resto de participantes: alimentan los resultados de cada Administrador
  { p: 'ana', cap: 'emp-digital', dias: 340, puntajes: [88, 90, 85, 92, 86] },
  { p: 'carlos', cap: 'emp-digital', dias: 335, puntajes: [92, 95, 90, 91, 93] },
  { p: 'jorge', cap: 'emp-digital', dias: 40, puntajes: [79, 79], textos: ['Validé mi problema con 8 entrevistas a comerciantes locales.'] },
  { p: 'maria', cap: 'fin-pyme', dias: 250, puntajes: [45, 45], textos: ['Registré mis movimientos contables del último trimestre.'] },
  { p: 'valentina', cap: 'fin-pyme', dias: 245, puntajes: [85, 85] },
  { p: 'diana', cap: 'mkt-redes', dias: 240, puntajes: [38, 38], textos: ['Mi estrategia de contenido no tiene un buyer persona definido aún.'] },
  { p: 'andres', cap: 'mkt-redes', dias: 35, puntajes: [55], textos: ['Publico contenido sin un calendario definido todavía.'] },
  { p: 'sofia', cap: 'liderazgo', dias: 55, puntajes: [74], textos: ['Documenté cómo mejoré la comunicación con mi equipo de 8 personas.'] },
  { p: 'camila', cap: 'liderazgo', dias: 230, puntajes: [69, 70, 68] },
  { p: 'jorge', cap: 'redes', dias: 30, puntajes: [72, 80] },
  { p: 'valentina', cap: 'redes', dias: 25, puntajes: [90, 85, 88, 92] },
  { p: 'camila', cap: 'redes', dias: 18, puntajes: [55, 60] },
  { p: 'ana', cap: 'ventas', dias: 120, puntajes: [82] },
];

/* ───────────── Almacenamiento ───────────── */

function clienteS3() {
  const e = process.env;
  return new S3Client({
    region: e.S3_REGION ?? 'us-east-1',
    endpoint: e.S3_ENDPOINT ?? 'http://localhost:9000',
    forcePathStyle: (e.S3_FORCE_PATH_STYLE ?? 'true') !== 'false',
    credentials: { accessKeyId: e.S3_ACCESS_KEY ?? 'regicap', secretAccessKey: e.S3_SECRET_KEY ?? 'regicap-secret' },
    requestChecksumCalculation: 'WHEN_REQUIRED',
  });
}

async function subirPdf(s3: S3Client, clave: string, archivo: string): Promise<boolean> {
  const ruta = resolve(PDF_DIR, archivo);
  if (!existsSync(ruta)) return false;
  try {
    await s3.send(
      new PutObjectCommand({ Bucket: process.env.S3_BUCKET ?? 'regicap', Key: clave, Body: readFileSync(ruta), ContentType: 'application/pdf' }),
    );
    return true;
  } catch (e) {
    console.warn(`  ⚠ No se pudo subir ${archivo} al almacenamiento: ${(e as Error).message}`);
    return false;
  }
}

/* ───────────── Seed ───────────── */

async function main() {
  if ((await prisma.usuario.count()) > 0) {
    if (process.env.SEED_FORCE !== 'true') {
      console.log('La base ya tiene datos: no se siembra (usa SEED_FORCE=true para reiniciar).');
      return;
    }
    console.log('SEED_FORCE: borrando datos existentes…');
    await prisma.feedback.deleteMany();
    await prisma.decisionAplicada.deleteMany();
    await prisma.calificacion.deleteMany();
    await prisma.respuesta.deleteMany();
    await prisma.inscripcion.deleteMany();
    await prisma.capacitacion.deleteMany(); // cascada: módulos, actividades, preguntas
    await prisma.usuario.deleteMany();
    await prisma.empresa.deleteMany();
  }

  const passwordHash = await bcrypt.hash(PASSWORD_DEMO, 12);
  const s3 = clienteS3();

  // Empresas + su cuenta de Empresa + su Administrador
  const empresaId = new Map<string, string>();
  const adminId = new Map<string, string>();
  for (const e of EMPRESAS) {
    const emp = await prisma.empresa.create({ data: { nombre: e.nombre, tipo: e.tipo, creadoEn: hace(420) } });
    empresaId.set(e.k, emp.id);
    await prisma.usuario.create({ data: { nombre: e.empresa[0], email: e.empresa[1], passwordHash, rol: 'EMPRESA', empresaId: emp.id } });
    const a = await prisma.usuario.create({ data: { nombre: e.admin[0], email: e.admin[1], passwordHash, rol: 'ADMINISTRADOR', empresaId: emp.id } });
    adminId.set(e.k, a.id);
  }

  const partId = new Map<string, string>();
  for (const [k, nombre, email] of PARTICIPANTES) {
    partId.set(k, (await prisma.usuario.create({ data: { nombre, email, passwordHash, rol: 'PARTICIPANTE' } })).id);
  }

  // Capacitaciones → módulos → actividades → preguntas
  const modulosDe = new Map<string, { id: string; tipo: 'CONTENIDO' | 'TEST' }[]>();
  let pdfs = 0;
  for (const c of CAPACITACIONES) {
    const eid = empresaId.get(c.empresa)!;
    const cap = await prisma.capacitacion.create({
      data: { empresaId: eid, nombre: c.nombre, duracion: c.duracion, estado: c.estado, creadoEn: hace(c.dias) },
    });
    const mods: { id: string; tipo: 'CONTENIDO' | 'TEST' }[] = [];
    for (const [i, m] of c.modulos.entries()) {
      const mod = await prisma.modulo.create({ data: { capacitacionId: cap.id, nombre: m.nombre, tipo: m.tipo ?? 'CONTENIDO', orden: i + 1 } });
      mods.push({ id: mod.id, tipo: mod.tipo });
      for (const [j, a] of (m.actividades ?? []).entries()) {
        if (a.tipo === 'PDF') {
          const clave = `empresas/${eid}/seed/${a.contenido}`;
          if (await subirPdf(s3, clave, a.contenido)) pdfs += 1;
          await prisma.actividad.create({ data: { moduloId: mod.id, titulo: a.titulo, tipo: 'PDF', archivoKey: clave, orden: j + 1 } });
        } else {
          await prisma.actividad.create({ data: { moduloId: mod.id, titulo: a.titulo, tipo: a.tipo, contenido: a.contenido, orden: j + 1 } });
        }
      }
      for (const q of m.preguntas ?? []) {
        await prisma.pregunta.create({
          data: {
            moduloId: mod.id,
            texto: q.texto,
            tipo: q.tipo as TipoPregunta,
            peso: q.peso,
            configuracion:
              q.tipo === 'SIMPLE' ? { opciones: q.opciones, respuestaCorrecta: q.correcta }
              : q.tipo === 'CUANTITATIVA' ? { valorEsperado: q.esperado, tolerancia: q.tolerancia }
              : undefined,
            rubrica: q.tipo === 'TEXTO_LIBRE' || q.tipo === 'CUALITATIVA' ? q.rubrica : null,
          },
        });
      }
    }
    modulosDe.set(c.k, mods);
  }
  const capDe = new Map<string, { id: string; empresa: string }>();
  for (const c of CAPACITACIONES) {
    const f = await prisma.capacitacion.findFirstOrThrow({ where: { nombre: c.nombre, empresaId: empresaId.get(c.empresa)! } });
    capDe.set(c.k, { id: f.id, empresa: c.empresa });
  }

  // Inscripciones, respuestas enviadas y calificaciones ya procesadas
  const inscDe = new Map<string, string>();
  for (const i of INSCRIPCIONES) {
    const cap = capDe.get(i.cap)!;
    const mods = modulosDe.get(i.cap)!;
    const enviados = Math.min(i.puntajes.length, mods.length);
    const estado = i.cancelada ? 'CANCELADA' : enviados === 0 ? 'PENDIENTE' : enviados < mods.length ? 'EN_CURSO' : 'COMPLETADA';
    const insc = await prisma.inscripcion.create({
      data: { participanteId: partId.get(i.p)!, capacitacionId: cap.id, estado, fechaInscripcion: hace(i.dias) },
    });
    inscDe.set(`${i.p}:${i.cap}`, insc.id);
    for (let m = 0; m < enviados; m++) {
      const puntaje = i.puntajes[m]!;
      const fecha = hace(Math.max(1, i.dias - 5 - m * 3));
      const resp = await prisma.respuesta.create({
        data: {
          inscripcionId: insc.id,
          moduloId: mods[m]!.id,
          contenido: { reflexion: { aprendido: i.textos?.[m] ?? 'Resumen de lo aprendido en el módulo.', aplicacion: '' }, examen: [] },
          estado: 'ENVIADA',
          fechaEnvio: fecha,
        },
      });
      await prisma.calificacion.create({
        data: {
          respuestaId: resp.id,
          estado: 'CALIFICADA',
          puntaje,
          nivel: nivelDe(puntaje),
          criterioMasBajo: puntaje < 60 ? 'pertinencia' : puntaje < 80 ? 'claridad' : null,
          intentos: 1,
          actualizadaEn: fecha,
        },
      });
    }
  }

  // Feedback del Administrador de la Cámara de Comercio a Luis (CU-06 / CU-10)
  const luisFin = capDe.get('fin-pyme')!;
  await prisma.feedback.createMany({
    data: [
      { administradorId: adminId.get('camara')!, participanteId: partId.get('luis')!, capacitacionId: luisFin.id, fecha: hace(190), texto: 'Excelente manejo del flujo de caja. Tu proyección considerando la estacionalidad fue muy acertada. ¡Sigue así!' },
      { administradorId: adminId.get('camara')!, participanteId: partId.get('luis')!, capacitacionId: luisFin.id, fecha: hace(189), texto: 'Un punto a reforzar: documenta los supuestos de cada escenario para que tus proyecciones sean reproducibles.' },
    ],
  });
  // Y a Diana (bajo rendimiento)
  await prisma.feedback.create({
    data: { administradorId: adminId.get('camara')!, participanteId: partId.get('diana')!, capacitacionId: capDe.get('mkt-redes')!.id, fecha: hace(120), texto: 'Define primero tu buyer persona; sin él el contenido pierde pertinencia. Revisa el material del módulo y vuelve a intentarlo.' },
  });

  console.log('\n✔ Seed completado');
  console.log(`  Empresas: ${EMPRESAS.length} · Capacitaciones: ${CAPACITACIONES.length} · Participantes: ${PARTICIPANTES.length} · PDF subidos: ${pdfs}`);
  console.log(`\n  Cuentas de demostración (contraseña: ${PASSWORD_DEMO})`);
  console.log('    Participante   luis.perez@correo.com');
  console.log('    Empresa        contacto@camaracomercio.org   (Cámara de Comercio)');
  console.log('    Empresa        redes@utp.ac.pa                (UTP · Fundamentos de Redes)');
  console.log('    Administrador  diego.ramirez@regicap.edu     (Cámara de Comercio)');
  console.log('    Administrador  admin.redes@utp.ac.pa         (UTP)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
