FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

# Instalar TODAS las dependencias (dev incluidas) para compilar
RUN npm ci

RUN npx prisma generate

# Copiar el código fuente y compilar
COPY tsconfig*.json ./
COPY nest-cli.json ./
COPY src ./src

RUN npm run build

# --- Imagen de producción ---
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

# Solo dependencias de producción
RUN npm ci --omit=dev

RUN npx prisma generate

# Copiar el dist compilado desde el stage anterior
COPY --from=builder /app/dist ./dist

# Script de arranque: migraciones + seed + servidor
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

ENV NODE_ENV=production
EXPOSE 3001

CMD ["./docker-entrypoint.sh"]
