# API + worker de REGICAP (misma imagen; el comando decide el proceso).
#   api:     sh apps/api/docker-start.sh   (migra + arranca; en compose local se usa node apps/api/dist/main.js)
#   worker:  node apps/api/dist/worker.js
#   migrate: pnpm --filter @regicap/db migrate:deploy && … seed
FROM node:22-alpine AS base
RUN apk add --no-cache openssl && npm install -g pnpm@11.1.3
WORKDIR /app

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm exec turbo run build --filter=@regicap/api...

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app /app
WORKDIR /app
EXPOSE 3001
CMD ["sh", "apps/api/docker-start.sh"]
