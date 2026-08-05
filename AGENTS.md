# PULSOBET — Guía para Agentes de Código

## Descripción General del Proyecto

PULSOBET es una plataforma de trivias deportivas en tiempo real para bares y Smart TVs. Los clientes de un bar escanean un código QR en su mesa, eligen un apodo y votan en trivias en vivo sobre el partido que se está transmitiendo. Aciertos acumulan puntos canjeables por premios del bar (cervezas, picadas, etc.). El sistema tiene tres interfaces de usuario:

- **Móvil Jugador** (`/play/[sessionId]`): PWA para votar trivias y canjear premios.
- **Pantalla Smart TV** (`/tv/[sessionId]`): Visualizador público con QR, trivias activas, marcador en vivo y leaderboard.
- **Panel de Admin** (`/admin/[barId]`): Consola del staff para lanzar trivias, resolver ganadores, controlar el marcador y validar canjes.

Monorepositorio npm con dos paquetes: `backend/` (NestJS 11 + Prisma + PostgreSQL + Redis + Socket.io) y `frontend/` (Next.js 16 + React 19 + Tailwind CSS 4 + Zustand + socket.io-client).

## Estructura del Repositorio

```
PULSOBET/
├── package.json              # Raíz: scripts de orquestación (concurrently)
├── docker-compose.yml        # Infra dev: PostgreSQL 15 + Redis 7
├── docker-compose.prod.yml   # Prod: backend + Redis + Caddy
├── Caddyfile                 # Reverse proxy de producción
├── nginx/nginx.conf          # Config nginx alternativa (proxy REST + WS)
├── backend/                  # API NestJS (puerto 3001)
│   ├── prisma/
│   │   ├── schema.prisma     # Modelos: Bar, User, TvScreen, Match, LiveQuestion,
│   │   │                     #   GameSession, Player, Prediction, Reward, RewardClaim
│   │   ├── migrations/       # Migración inicial 20260721143758_init
│   │   └── seed.ts           # Datos demo (bar Kilkenny, staff, sesión, premios)
│   ├── src/
│   │   ├── main.ts           # Bootstrap: CORS abierto, puerto 3001
│   │   ├── app.module.ts     # Módulo raíz
│   │   ├── prisma/           # PrismaModule (@Global)
│   │   ├── redis/            # RedisModule (@Global), leaderboard con ZSET
│   │   ├── auth/             # JWT staff + registro anónimo de jugadores, WsJwtGuard
│   │   ├── bar/              # Premios, canjes, analytics, export CSV
│   │   ├── match/            # REST de partidos/trivias (delega en SessionEngine)
│   │   ├── live/             # LiveGateway: WebSocket Gateway Socket.io
│   │   └── session/          # Núcleo: SessionEngine, SocketDispatcher,
│   │                         #   SessionScheduler, RedisSessionCacheService
│   └── test/                 # e2e (jest-e2e.json)
└── frontend/                 # Next.js App Router (puerto 3000)
    └── src/
        ├── app/              # Rutas: /, /login, /play/[sessionId],
        │                     #   /tv/[sessionId], /admin/[barId]
        ├── config/api.ts     # API_URL y WS_URL (env NEXT_PUBLIC_*)
        ├── hooks/useSocket.ts    # Conexión WS + fallback REST polling
        └── store/useSessionStore.ts  # Zustand: snapshot + eventos de dominio
```

## Stack Tecnológico

### Backend (`backend/`)
- **Framework:** NestJS 11 (Express), TypeScript 5.7, CommonJS (`module: nodenext`)
- **Base de datos:** PostgreSQL 15 con Prisma ORM 6 (`prisma-client-js`)
- **Caché/Leaderboard:** Redis 7 (ioredis). Sorted Sets para leaderboard (`leaderboard:{sessionId}`), claves `session:{id}:version|event_number|connected|match|trivia` y `bar:{id}:rewards`
- **Tiempo real:** Socket.io 4 vía `@nestjs/websockets` + `@nestjs/platform-socket.io`
- **Eventos internos:** `@nestjs/event-emitter` (EventEmitter2) — SessionEngine emite eventos de dominio, SocketDispatcher los escucha y hace broadcast
- **Auth:** JWT (`@nestjs/jwt`, global, 8h de expiración) + bcrypt. `WsJwtGuard` protege `submit_prediction`
- **Validación:** `class-validator` + `class-transformer` con `ValidationPipe({ whitelist: true })`

### Frontend (`frontend/`)
- **Framework:** Next.js 16.2 (App Router), React 19, TypeScript estricto
- **Estilos:** Tailwind CSS 4 (vía `@tailwindcss/postcss`)
- **Estado:** Zustand 5 (`useSessionStore`) — snapshot único + aplicación de eventos con control de secuencia (`eventNumber`)
- **Tiempo real:** socket.io-client 4 con reconexión infinita y backoff exponencial
- **QR:** `qrcode.react`

> **Nota importante (de `frontend/AGENTS.md`):** Esta versión de Next.js tiene cambios disruptivos respecto al conocimiento de entrenamiento. Antes de escribir código del frontend, leer la guía relevante en `frontend/node_modules/next/dist/docs/` y respetar los avisos de deprecación.

## Comandos de Build y Desarrollo

### Setup inicial
```bash
npm run install:all          # Instala deps de backend y frontend
docker compose up -d         # Levanta PostgreSQL (5432) y Redis (6379)
cd backend
npx prisma migrate dev       # Aplica migraciones
npx prisma db seed           # Pobla datos demo (ver credenciales abajo)
```

### Desarrollo (desde la raíz)
```bash
npm run dev                  # Backend (3001) + Frontend (3000) en paralelo
npm run dev:backend          # Solo NestJS con watch
npm run dev:frontend         # Solo Next.js dev
```

### Backend (desde `backend/`)
```bash
npm run build                # nest build → dist/
npm run start:dev            # nest start --watch
npm run start:prod           # node dist/main
npm run lint                 # ESLint con --fix
npm run format               # Prettier sobre src/ y test/
npm test                     # Jest unit tests (*.spec.ts en src/)
npm run test:cov             # Cobertura
npm run test:e2e             # Jest e2e (test/jest-e2e.json, *.e2e-spec.ts)
```

### Frontend (desde `frontend/`)
```bash
npm run dev                  # next dev -p 3000
npm run build                # next build
npm run lint                 # eslint
```

### Producción
```bash
cd backend && npm run build  # El Dockerfile copia el dist/ PRE-COMPILADO desde el repo
docker compose -f docker-compose.prod.yml up -d   # backend + redis + caddy
```
El `Dockerfile` del backend **no compila**: hace `npm ci --omit=dev`, `npx prisma generate` y copia `dist/` ya construido. Hay que buildear antes de generar la imagen. El entrypoint en prod es `node dist/src/main.js`.

## Variables de Entorno

### Backend (`backend/.env`)
- `DATABASE_URL` — conexión PostgreSQL (dev local: `postgresql://pulsobet_user:pulsobet_password@localhost:5432/pulsobet_db`)
- `REDIS_URL` — default `redis://localhost:6379`
- `JWT_SECRET` — secreto JWT (hay un fallback hardcodeado en `auth.module.ts`; definir siempre en prod)
- `PORT` — default 3001

### Frontend
- `NEXT_PUBLIC_API_URL` — default `http://localhost:3001`
- `NEXT_PUBLIC_WS_URL` — default `http://localhost:3001`

### Datos demo del seed
- Staff: `admin@kilkenny.com.py` / `admin123`
- Bar: `local-kilkenny-test` (slug `kilkenny`)
- Sesión activa: `session-demo-01`

## Arquitectura en Tiempo de Ejecución

### Flujo de hidratación (Snapshot como Single Source of Truth)
1. El cliente conecta el socket y emite `JOIN_SESSION` (o los legacy `join_bar_session` / `join_tv_screen`). Salas: `bar:{sessionId}` para todos y `bar:{sessionId}:tv` adicional para TVs.
2. `LiveGateway` responde al cliente entrante con un evento `SNAPSHOT` construido por `SessionEngine.buildSnapshot()` (partido, trivia activa, top 10, perfil del jugador, premios, contadores).
3. A partir de ahí, los cambios llegan como eventos de dominio con `eventNumber` incremental. El store Zustand descarta eventos viejos/duplicados comparando `eventNumber`.
4. Si el WS cae, `useSocket` hace polling REST cada 5s a `GET /session/snapshot/:sessionId` hasta reconectar.

### Cadena de eventos de dominio
`SessionEngine` (lógica de negocio) → `EventEmitter2` (`match.score.updated`, `trivia.opened`, `trivia.result`, etc.) → `SocketDispatcher` (`@OnEvent`) → `LiveGateway.broadcastToSession()` → salas Socket.io. El dispatcher emite tanto los eventos nuevos en mayúsculas (`TRIVIA_OPENED`) como los legacy en minúsculas (`new_question_active`, `leaderboard_update`, `question_resolved`) por compatibilidad; el frontend escucha ambos.

### Cierre automático de trivias
`SessionScheduler` mantiene un `Map<questionId, NodeJS.Timeout>` con `scheduleAutoClose()` / `cancelTimer()`. Al crear una trivia, `SessionEngine` programa su auto-cierre. **No usar `setTimeout` sueltos** fuera del scheduler.

## Convenciones y Reglas del Proyecto

Las siguientes reglas provienen de `.agents/AGENTS.md` y son **obligatorias**:

1. **`forwardRef()` obligatorio:** Cualquier importación bidireccional entre módulos (ej. `SessionModule` ↔ `LiveModule`) DEBE usar `forwardRef(() => Module)` en AMBOS lados. Prohibido importar módulos circulares sin `forwardRef()`. Al inyectar, usar `@Inject(forwardRef(() => Service))`.
2. **Redis tolerante a fallos:** Todas las operaciones de `RedisSessionCacheService` deben estar envueltas en `try...catch`. Si Redis no está disponible, el servidor DEBE degradar suavemente hacia PostgreSQL sin lanzar excepciones no controladas (los métodos devuelven valores por defecto: `1`, `0`, `null`).
3. **`ensureSession()`:** Los métodos de negocio en `SessionEngine` deben invocar `ensureSession()` para garantizar que siempre exista un `Bar` y una `GameSession` activa, evitando 404/400 en la primera consulta (hay fallbacks a cualquier sesión activa y auto-creación del bar demo `kilkenny`).
4. **Fallback de sesión en desarrollo:** La inyección manual de trivias debe mantener el fallback a cualquier `GameSession` activa si el `barId` recibido no coincide exactamente.
5. **Emisión dual:** Los eventos `new_question_active` y `leaderboard_update` deben emitirse tanto a la sala de jugadores como a la de TVs (el método central es `broadcastToSession()`).
6. **Redundancia de transporte en clientes:** `useSocket` debe mantener reconexión automática infinita con backoff exponencial y el polling REST de respaldo cada 5s cuando `isConnected` sea falso.
7. **Aislamiento de código:** Implementar ÚNICAMENTE la tarea pedida. No alterar, refactorizar ni reescribir código que no forme parte directa de la instrucción.

### Estilo de código
- **Idioma:** El código (comentarios, mensajes de log, textos de UI, DTOs de validación) está en **español**. Los identificadores usan convenciones en inglés (camelCase).
- **Backend Prettier:** `singleQuote: true`, `trailingComma: "all"` (`backend/.prettierrc`).
- **Backend ESLint:** `typescript-eslint` recommendedTypeChecked + prettier; `no-explicit-any` está desactivado (el código usa `any` libremente en payloads de socket), `no-floating-promises` y `no-unsafe-argument` como warnings.
- **Frontend ESLint:** `eslint-config-next` core-web-vitals + typescript.
- **Path alias frontend:** `@/*` → `./src/*`.
- Los DTOs viven en subcarpetas `dto/` junto a su módulo y usan decoradores de `class-validator` con mensajes en español.

## Testing

- **Unit tests:** Jest 30 con `ts-jest`, `rootDir: src`, patrón `*.spec.ts`. Actualmente solo existe `src/app.controller.spec.ts` (el scaffold por defecto de NestJS); la cobertura de tests es mínima.
- **E2E:** `backend/test/jest-e2e.json`, patrón `*.e2e-spec.ts`, usa supertest. Solo existe `app.e2e-spec.ts`.
- El frontend **no tiene** framework de tests configurado.
- Al agregar lógica nueva en el backend, seguir el patrón existente: spec junto al archivo (`*.spec.ts`) corriendo con `npm test` desde `backend/`.

## Consideraciones de Seguridad

- **JWT:** Los tokens de staff y de jugador (efímeros, 8h) se firman con el mismo `JwtModule` global. El payload del jugador incluye `sub` (playerId), `sessionId`, `barId` y `type: 'player'`.
- **WebSockets:** Solo `submit_prediction` está protegido con `WsJwtGuard` (token en `handshake.auth.token` o query param). Los eventos de join y el resto del gateway son abiertos.
- **Endpoints REST sin guard:** Los controllers de `bar/`, `match/` y `session/` NO tienen guards de autenticación actualmente; el código asume extracción de `req.user` que solo existiría con un guard HTTP (ausente). Hay fallbacks hardcodeados a `local-kilkenny-test` en `BarController` (analytics y redeem). Tener esto en cuenta antes de exponer en producción: es una deuda conocida.
- **CORS:** Abierto a cualquier origen (`origin: true`) tanto en HTTP como en el gateway WS.
- **Validación:** Todos los DTOs de entrada pasan por `ValidationPipe({ whitelist: true })`.
- **Secretos:** `backend/.env` contiene credenciales locales y no debe commitearse; el `JWT_SECRET` tiene un fallback inseguro en código que debe sobreescribirse por entorno.
- **Canjes:** `claimRewardInstant` y `redeemRewardCode` usan transacciones de Prisma (`$transaction`) para evitar race conditions en stock y puntos; los códigos de canje son de 4 caracteres alfanuméricos únicos.

## Notas Operativas

- **Despliegue frontend:** El directorio `frontend/.vercel/` indica despliegue en Vercel. El backend se despliega con Docker + Caddy (ver `Caddyfile`, actualmente apuntando a `163.176.163.249.sslip.io`). Existe también un `nginx/nginx.conf` alternativo con upgrade de WebSocket configurado.
- **Puertos:** Backend 3001, Frontend 3000, PostgreSQL 5432, Redis 6379.
- **Prisma:** El seed se ejecuta con `npx prisma db seed` (configurado en `backend/package.json` → `prisma.seed`). El cliente se genera con `npx prisma generate`.
