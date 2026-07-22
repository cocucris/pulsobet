# Directivas y Reglas de Consistencia del Proyecto PULSOBET

## 1. Reglas de Inclusión de Sesiones y WebSockets
- **Sesiones de Juego Fallback:** La inyección manual de trivias en `MatchService` debe mantener el fallback a cualquier `GameSession` activa si el `barId` recibido no coincide exactamente en desarrollo.
- **Suscripción de Salas WebSockets:** El hook `useSocket` en el cliente debe emitir automáticamente `join_bar_session` o `join_tv_screen` al conectarse el socket para suscribirse a las salas `bar:${sessionId}` y `bar:${sessionId}:tv`.
- **Emisión Dual:** Los eventos de trivias activas (`new_question_active`) y leaderboards (`leaderboard_update`) deben emitirse tanto a la sala de jugadores móviles como a la sala de Smart TVs.

## 2. Directivas de Aislamiento de Código
- Tu objetivo es implementar ÚNICAMENTE la tarea, funcionalidad o cambio pedido explícitamente.
- No alterar, refactorizar o reescribir otras partes del código que no formen parte directa de la instrucción.
