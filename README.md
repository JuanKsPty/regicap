# REGICAP — Sistema de Registro Inteligente para Capacitaciones

Implementación de la **Fase 2: Diseño y Arquitectura** (documento `REGICAP_Fase2_IngSoft2.pdf`) con los
doce casos de uso de la Fase 1. Antes era un prototipo estático con datos en el navegador; ahora es una
aplicación completa con backend, base de datos, cola de calificación asíncrona y almacenamiento de objetos.

> El prototipo original (HTML + JS vanilla) se conserva en [`prototype/`](prototype/) como referencia.
> La especificación funcional está en [`docs/context.md`](docs/context.md) y el modelo del prototipo en [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md).

## Arquitectura (cliente-servidor en tres capas + integraciones)

| Capa | Tecnología | Ubicación |
|---|---|---|
| Presentación | Next.js 15 (App Router) · Tailwind 4 · componentes estilo shadcn/ui (Radix) · TanStack Query · react-hook-form | `apps/web` |
| Lógica de negocio | NestJS 11: un módulo por área (controlador → servicio → repositorio) | `apps/api` |
| Persistencia | PostgreSQL 16 vía Prisma · Redis 7 (AOF) para la cola BullMQ | `packages/db` |
| Integraciones | `IAProvider` (Mock determinista o Claude) · `StorageProvider` (S3/MinIO) | `apps/api/src/calificacion`, `apps/api/src/storage` |
| Compartido | Esquemas zod, DTOs y enums usados por web **y** API | `packages/types` |

Monorepo **Turborepo + pnpm**. Despliegue: un solo VPS con Docker Compose (Traefik → web, api, worker, postgres, redis, minio).

```
regicap/
├── apps/
│   ├── web/            Next.js: login, registro y los 3 portales (middleware.ts redirige por rol)
│   └── api/            NestJS: auth · capacitaciones · modulos · inscripciones · progreso ·
│                       respuestas · calificacion (BullMQ) · resultados · feedback · storage
├── packages/
│   ├── db/             schema.prisma · migraciones (incl. índice único parcial) · seed
│   ├── types/          zod + DTOs (una sola definición para el formulario y el ValidationPipe)
│   ├── ui/             componentes de interfaz (Button, Field, Dialog, Tabs, Progress…)
│   └── config/         tsconfig compartidos
├── scripts/            verify.mjs (CU + EC-01…EC-10) · verify-ec09.mjs (caída de la IA)
├── docker-compose.yml  proxy · web · api · worker · postgres · redis · minio
└── prototype/          prototipo estático original
```

## Puesta en marcha

Requisitos: Node 22+, pnpm 11, Docker.

### Desarrollo (infraestructura en Docker, apps con recarga en caliente)

```bash
cp .env.example .env          # ya incluido en el repo local; ajusta si lo necesitas
pnpm install
pnpm infra:up                 # postgres :5433 · redis :6380 · minio :9000 (consola :9001)
pnpm db:migrate               # aplica las migraciones
pnpm db:seed                  # datos de demostración (+ sube los PDF de ejemplo a MinIO)
pnpm dev                      # web :3000 · api :3001 · worker de calificación
```

Abre <http://localhost:3000>. Los puertos de infraestructura (5433/6380) evitan chocar con otros proyectos.

### Sistema completo en contenedores (igual que producción)

```bash
docker compose up -d --build                      # proxy :8080, web, api, worker, postgres, redis, minio
docker compose --profile tools run --rm migrate   # solo la primera vez: migraciones + seed demo
```

Abre <http://localhost:8080>. Todo pasa por Traefik: `/` → web, `/api` → API, `/files` → MinIO (URLs firmadas).
En un VPS (Dokploy) quita las secciones `ports:` de postgres/redis/minio, define `JWT_SECRET`,
`COOKIE_SECURE=true`, `S3_PUBLIC_ENDPOINT_COMPOSE=https://<dominio>` y activa TLS en Traefik.

### Cuentas de demostración

Contraseña de todas: **`Regicap2026!`** (en el login hay botones que las rellenan).

| Rol | Correo | Qué ver |
|---|---|---|
| Participante | `luis.perez@correo.com` | 3 inscripciones (pendiente, en curso, completada), catálogo, feedback recibido |
| Empresa | `contacto@camaracomercio.org` | 6 capacitaciones (una en borrador) |
| Empresa | `redes@utp.ac.pa` | *Fundamentos de Redes*: 3 módulos con PDF, lecturas y videos + evaluación final |
| Administrador | `diego.ramirez@regicap.edu` | Resultados, análisis y feedback de la Cámara de Comercio |
| Administrador | `admin.redes@utp.ac.pa` | Resultados de UTP (demuestra el aislamiento entre empresas) |

## Casos de uso → pantallas → endpoints

| CU | Rol | Pantalla (`apps/web/app`) | API (`/api/…`) |
|---|---|---|---|
| CU-01 Iniciar sesión | Todos | `(auth)/login` | `POST /auth/login` · `POST /auth/logout` · `GET /auth/me` |
| CU-02 Registrarse | Todos | `(auth)/registro` | `POST /auth/registro` |
| CU-03 Administrar capacitaciones | Participante | `participante/capacitaciones` | `GET /participante/inscripciones?vista=` · `GET /catalogo?page=` · `POST /participante/inscripciones` · `PATCH …/:id/cancelar` |
| CU-04 Tomar capacitaciones | Participante | `participante/tomar` · `tomar/[inscripcionId]` | `GET /participante/progreso` · `GET …/progreso/:id/modulos` |
| CU-05 Resolver módulos | Participante | `tomar/[inscripcionId]/[moduloId]` | `GET/PUT/POST …/inscripciones/:i/modulos/:m[/borrador\|/enviar]` |
| CU-06 Recibir feedback | Participante | `participante/feedback` | `GET /participante/feedback` |
| CU-07 Procesar resultados | IA (sin interfaz) | — (worker BullMQ) | cola `calificacion` · `POST /admin/calificaciones/reencolar` |
| CU-08 Consultar resultados | Administrador | `admin/resultados` (+ detalle y análisis individual) | `GET /admin/resultados` (filtros) · `…/exportar` (XLSX) · `…/capacitaciones/:id` · `GET /admin/participantes/:id/analisis` |
| CU-09 Analizar resultados | Administrador | `admin/analisis` | `GET /admin/analisis` · `POST /admin/decisiones` |
| CU-10 Entregar feedback | Administrador | `admin/feedback` | `GET /admin/feedback/participantes\|contexto` · `POST /admin/feedback` |
| CU-11 Gestionar capacitaciones | Empresa | `empresa/capacitaciones` | `GET/POST /empresa/capacitaciones` · `PATCH/DELETE …/:id` · `POST …/:id/publicar\|despublicar` |
| CU-12 Gestionar módulos | Empresa | `empresa/capacitaciones/[id]` | `…/modulos` · `…/actividades` (PDF/lectura/video) · `…/preguntas` · `POST /empresa/archivos/subida` |

Además la Empresa gestiona sus Administradores en `empresa/administradores`.
Todos los errores usan `{ codigo, mensaje, campos }` (Fase 2 §7.1).

## Calidad: escenarios EC-01…EC-10

`pnpm verify` ejecuta **119 comprobaciones** contra la API en marcha (usa `API_URL` para apuntar al proxy) y
`node scripts/verify-ec09.mjs` simula la caída de la IA. El script de verificación hace login varias veces:
si lo repites en menos de un minuto el límite de intentos (EC, seguridad) responderá 429.

| Escenario | Táctica implementada | Dónde |
|---|---|---|
| EC-01 403 por rol | `JwtAuthGuard` + `RolesGuard` + `@Roles()` globales; `middleware.ts` solo redirige | `auth/auth.guards.ts` |
| EC-02 404 entre Empresas | `empresaId` del token; consultas `…Scoped`; los administradores ven solo su Empresa | `*/…repository.ts` |
| EC-03 contraseñas | bcrypt costo 12; los DTO nunca incluyen `passwordHash` | `auth/auth.service.ts` |
| EC-04/05 rendimiento | calificación en cola (la API no espera a la IA) · índices · `groupBy/_count` · catálogo paginado (12) | `respuestas/`, `calificacion/`, `schema.prisma` |
| EC-06/07 usabilidad | inscripción en un clic · esquema zod compartido · mensaje junto al campo sin limpiar el formulario | `packages/types`, `lib/forms.ts` |
| EC-08 360 px | Tailwind mobile-first; medido sin desplazamiento horizontal en las 10 pantallas principales | `apps/web` |
| EC-09 confiabilidad | respuesta `ENVIADA` + calificación `PENDIENTE` en una transacción → recién después se encola; 5 reintentos exponenciales; `ERROR` + reencolar; barrido de pendientes | `respuestas.repository.ts`, `calificacion/` |
| EC-10 integridad | `ON DELETE CASCADE` + verificación de inscritos y borrado en una transacción con bloqueo de fila | `capacitaciones.repository.ts` |

## Decisiones y desviaciones respecto al documento (para revisar con el equipo)

- **Administrador ligado a una Empresa** (`usuario.empresa_id` obligatorio si rol ≠ PARTICIPANTE, como en §6.2): consulta
  resultados y da feedback solo de las capacitaciones de su Empresa. Lo da de alta la Empresa desde su portal; el registro público
  permite Participante o Empresa (que crea su organización).
- **Módulo de evaluación final** (`modulo.tipo = TEST`): se conserva del prototipo; reúne los tests de todos los módulos.
- **Pesos del test**: cada pregunta nueva no puede hacer que la suma supere 100 %, y publicar exige que cada test sume exactamente 100 % (RF-06).
- **CU-08/09**: la cohorte es semestral y *derivada* de la fecha de inscripción (`2026-A` ene–jun, `2026-B` jul–dic), por lo que no hace falta
  tabla de cohortes; las «decisiones recomendadas» se calculan y solo se persiste cuáles se marcaron como aplicadas (`decision_aplicada`).
- **Subida de PDF**: URL firmada de carga con tamaño fijado; al crear la actividad la API verifica en el almacenamiento que el objeto
  exista, sea PDF, pese ≤ 3 MB y esté en el prefijo de la Empresa.
- **MinIO**: la imagen oficial `minio/minio` ya no se publica en Docker Hub/Quay; el compose usa `bitnamilegacy/minio` (MinIO real).
- **Traefik ≥ 3.6**: las versiones anteriores no funcionan con Docker 29.
- **IA**: `IA_PROVIDER=mock` (determinista, por defecto) o `anthropic` (+ `ANTHROPIC_API_KEY`); `IA_MOCK_FALLAR=true` simula caídas.
- Las sesiones no se revocan antes de su vencimiento (8 h) — compromiso reconocido en D-06.

## Comandos útiles

```bash
pnpm build | typecheck | test     # todo el monorepo (Turborepo)
pnpm db:migrate:dev               # nueva migración tras cambiar schema.prisma
SEED_FORCE=true pnpm db:seed      # reinicia los datos de demostración
pnpm verify                       # E2E contra la API (necesita seed y servicios arriba)
```
