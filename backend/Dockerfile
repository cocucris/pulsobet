FROM node:20-alpine

WORKDIR /app

# Install build tools
RUN apk add --no-cache python3 make g++

COPY package*.json ./
COPY prisma ./prisma/

# Install all deps (including devDeps needed to build)
RUN node --max-old-space-size=512 $(which npm) ci

COPY . .

RUN npx prisma generate

# Build with limited memory for low-RAM VMs
RUN node --max-old-space-size=512 node_modules/.bin/nest build

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "dist/main.js"]
