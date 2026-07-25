# Directivas y Reglas de Consistencia del Proyecto PULSOBET

## 1. Reglas de Inclusión de Sesiones y WebSockets
- **Sesiones de Juego Fallback:** La inyección manual de trivias en `MatchService` debe mantener el fallback a cualquier `GameSession` activa si el `barId` recibido no coincide exactamente en desarrollo.
- **Suscripción de Salas WebSockets:** El hook `useSocket` en el cliente debe emitir automáticamente `join_bar_session` o `join_tv_screen` al conectarse el socket para suscribirse a las salas `bar:${sessionId}` y `bar:${sessionId}:tv`.
- **Emisión Dual:** Los eventos de trivias activas (`new_question_active`) y leaderboards (`leaderboard_update`) deben emitirse tanto a la sala de jugadores móviles como a la sala de Smart TVs.

## 2. Directivas de Aislamiento de Código
- Tu objetivo es implementar ÚNICAMENTE la tarea, funcionalidad o cambio pedido explícitamente.
- No alterar, refactorizar o reescribir otras partes del código que no formen parte directa de la instrucción.

## 3. Reglas Irrompibles de Blindaje y Tolerancia a Fallos
- **Uso Obligatorio de `forwardRef()`:** Cualquier importación de módulos con acoplamiento bidireccional (ej. `SessionModule` <-> `LiveModule`) DEBE utilizar `forwardRef(() => Module)` en AMBOS lados. Está estrictamente prohibido importar módulos circulares sin `forwardRef()`.
- **Inmunidad en Capa de Caché (Redis):** Todas las operaciones en `RedisSessionCacheService` deben estar protegidas por bloques `try...catch`. Si Redis no está disponible o falla un comando, el servidor DEBE degradar suavemente hacia PostgreSQL sin lanzar excepciones no controladas.
- **Auto-Aseguramiento de Sesión (`ensureSession`):** Los métodos de negocio en `SessionEngine` deben invocar `ensureSession()` para garantizar que siempre exista un local (`Bar`) y una sesión activa (`GameSession`), evitando respuestas 404/400 cuando se consulte por primera vez.
- **Redundancia de Transporte en Clientes (`useSocket.ts`):** `useSocket` debe incluir reconexión automática infinita con backoff exponencial y un polling REST de respaldo cada 5s cuando `isConnected` sea falso, garantizando que el usuario nunca pierda la hidratación de pantalla.
