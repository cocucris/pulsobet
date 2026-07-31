#!/bin/sh
set -e

echo "🔄 Ejecutando migraciones de Prisma..."
npx prisma migrate deploy

echo "🌱 Ejecutando seed de datos demo..."
npx prisma db seed || echo "⚠️  Seed omitido (ya existen datos o falló, continuando...)"

echo "🚀 Iniciando servidor NestJS..."
exec node dist/src/main.js
