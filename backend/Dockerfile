FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

# Solo instalar dependencias de producción
RUN npm ci --omit=dev

RUN npx prisma generate

# Copiar el dist pre-compilado desde el repo
COPY dist ./dist

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "dist/main.js"]
