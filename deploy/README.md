# Despliegue en Dokploy

REGICAP corre como **servicios independientes** dentro de un mismo proyecto de Dokploy
(`regicap`, entorno `production`), todos bajo `https://regicap.juank.tech`:

| Servicio | Tipo en Dokploy | Origen | Ruta pública |
|---|---|---|---|
| `regicap-web` | Application | GitHub · `apps/web/Dockerfile` | `/` → 3000 |
| `regicap-backend` (compose) | Compose · GitHub · `deploy/api.compose.yml` | servicios `regicap-api` (CMD: migra + arranca) y `regicap-worker` (`node apps/api/dist/worker.js`), una sola imagen | `/api` → `regicap-api:3001` |
| `regicap-db` | Database · PostgreSQL 16 | imagen | — (interna) |
| `regicap-redis` | Database · Redis 7 (AOF) | imagen | — (interna) |
| `regicap-minio` | Application | imagen `bitnamilegacy/minio` + volumen | `/files` → 9000 (stripPath) |

La construcción usa la **raíz del repositorio** como contexto de Docker (es un monorepo).
Los servicios se hablan por el nombre de la aplicación dentro de `dokploy-network`.

## Variables de entorno

`regicap-backend` (el compose las reparte a la API y al worker; `API_PORT` y `SEED_DEMO` se fijan en el propio compose, con `SEED_DEMO` configurable):

```
NODE_ENV=production
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
SEED_DEMO=true              # siembra la demo solo si la base está vacía
SUPERADMIN_EMAIL=superadmin@regicap.juank.tech   # primer superadmin (se crea si no existe;
SUPERADMIN_PASSWORD=<secreto>                    #  luego se cambia desde el portal y no se sobrescribe)
SUPERADMIN_NOMBRE=Superadministrador
```

`regicap-web`: `NODE_ENV=production`, `API_INTERNAL_URL=http://regicap-api:3001`, `JWT_SECRET` (el mismo de la API).

`regicap-minio`: `MINIO_ROOT_USER=regicap`, `MINIO_ROOT_PASSWORD=<S3_SECRET_KEY>`, `MINIO_DEFAULT_BUCKETS=regicap`,
volumen en `/bitnami/minio/data`.

## Orden de arranque

1. `regicap-db`, `regicap-redis`, `regicap-minio`
2. `regicap-backend` (la API aplica las migraciones al iniciar; el worker arranca junto)
3. `regicap-web`

Un `git push` a `main` redespliega web y backend (autoDeploy); la base, Redis y MinIO no se tocan.
