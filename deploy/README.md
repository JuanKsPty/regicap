# Despliegue en Dokploy

REGICAP corre como **servicios independientes** dentro de un mismo proyecto de Dokploy
(`regicap`, entorno `production`), todos bajo `https://regicap.juank.tech`:

| Servicio | Tipo en Dokploy | Origen | Ruta pública |
|---|---|---|---|
| `regicap-web` | Application | GitHub · `apps/web/Dockerfile` | `/` → 3000 |
| `regicap-api` | Application | GitHub · `apps/api/Dockerfile` (CMD: migra + arranca) | `/api` → 3001 |
| `regicap-worker` | Application | GitHub · `apps/api/Dockerfile`, comando `node apps/api/dist/worker.js` | — |
| `regicap-db` | Database · PostgreSQL 16 | imagen | — (interna) |
| `regicap-redis` | Database · Redis 7 (AOF) | imagen | — (interna) |
| `regicap-minio` | Application | imagen `bitnamilegacy/minio` + volumen | `/files` → 9000 (stripPath) |

La construcción usa la **raíz del repositorio** como contexto de Docker (es un monorepo).
Los servicios se hablan por el nombre de la aplicación dentro de `dokploy-network`.

## Variables de entorno

`regicap-api` y `regicap-worker` (mismas, salvo `API_PORT` que solo usa la API):

```
NODE_ENV=production
API_PORT=3001
DATABASE_URL=postgresql://regicap:<pass>@<host-db>:5432/regicap?schema=public
REDIS_URL=redis://default:<pass>@<host-redis>:6379
S3_ENDPOINT=http://<host-minio>:9000
S3_PUBLIC_ENDPOINT=https://regicap.juank.tech
S3_PUBLIC_PATH_PREFIX=/files
S3_REGION=us-east-1
S3_BUCKET=regicap
S3_ACCESS_KEY=regicap
S3_SECRET_KEY=<secreto>
S3_FORCE_PATH_STYLE=true
JWT_SECRET=<mínimo 32 caracteres>
JWT_EXPIRES_IN=8h
COOKIE_SECURE=true
IA_PROVIDER=mock            # o anthropic + ANTHROPIC_API_KEY
CALIFICACION_BACKOFF_MS=30000
SEED_DEMO=true              # solo la API; siembra la demo si la base está vacía
```

`regicap-web`: `NODE_ENV=production`, `API_INTERNAL_URL=http://<host-api>:3001`, `JWT_SECRET` (el mismo de la API).

`regicap-minio`: `MINIO_ROOT_USER=regicap`, `MINIO_ROOT_PASSWORD=<S3_SECRET_KEY>`, `MINIO_DEFAULT_BUCKETS=regicap`,
volumen en `/bitnami/minio/data`.

## Orden de arranque

1. `regicap-db`, `regicap-redis`, `regicap-minio`
2. `regicap-api` (aplica las migraciones al iniciar) y `regicap-worker`
3. `regicap-web`

Un `git push` a `main` redespliega web, api y worker (autoDeploy); la base, Redis y MinIO no se tocan.
