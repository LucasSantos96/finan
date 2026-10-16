FROM node:22-alpine AS deps
RUN apk add --no-cache openssl
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

FROM node:22-alpine AS build
RUN apk add --no-cache openssl
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Next's "collect page data" build step imports route modules, which eagerly open the
# Mastra memory SQLite file; /data is only a real volume at runtime, so create it here too.
RUN mkdir -p /data && npx prisma generate && npm run build

FROM node:22-alpine AS run
RUN apk add --no-cache openssl tzdata
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    TZ=America/Sao_Paulo \
    DATABASE_URL=file:/data/finan.db
RUN mkdir /prisma-cli && cd /prisma-cli && npm init -y >/dev/null && npm i prisma@6 --omit=dev --no-audit --no-fund
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma/client ./node_modules/@prisma/client
# Next's standalone trace misses libsql's platform-specific native binding (musl on alpine).
COPY --from=build /app/node_modules/@libsql/linux-x64-musl ./node_modules/@libsql/linux-x64-musl
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=build /app/prisma ./prisma
VOLUME /data
EXPOSE 3000
CMD ["sh", "-c", "node /prisma-cli/node_modules/prisma/build/index.js migrate deploy --schema=/app/prisma/schema.prisma && node server.js"]
