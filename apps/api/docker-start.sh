#!/bin/sh
# Arranque de la API en producción (Dokploy): migra, siembra la demo solo si la
# base está vacía (SEED_DEMO=true) y levanta el servidor HTTP.
set -e
pnpm --filter @regicap/db migrate:deploy
if [ "$SEED_DEMO" = "true" ]; then
  pnpm --filter @regicap/db seed
fi
exec node apps/api/dist/main.js
