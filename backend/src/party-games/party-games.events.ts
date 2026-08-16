// Evento emitido al iniciar una nueva ronda de Party Game
export class PartyRoundStartedEvent {
  constructor(
    public readonly sessionId: string,
    public readonly round: any,
    public readonly eventNumber: number,
  ) {}
}

// Evento emitido al cambiar de fase (LOBBY -> COUNTDOWN -> INPUT -> VOTING -> REVEAL -> FINISHED)
export class PartyPhaseChangedEvent {
  constructor(
    public readonly sessionId: string,
    public readonly roundId: string,
    public readonly phase: 'LOBBY' | 'COUNTDOWN' | 'INPUT' | 'VOTING' | 'REVEAL' | 'FINISHED',
    public readonly payload: any, // datos específicos por fase
    public readonly eventNumber: number,
  ) {}
}

// Evento emitido cuando un jugador grita ¡BASTA! (Tuti Fruti) — corte global
export class PartyBastaCalledEvent {
  constructor(
    public readonly sessionId: string,
    public readonly roundId: string,
    public readonly playerId: string,
    public readonly nickname: string,
    public readonly eventNumber: number,
  ) {}
}

// Evento emitido al recibir el input de un jugador
export class PartyInputSubmittedEvent {
  constructor(
    public readonly sessionId: string,
    public readonly roundId: string,
    public readonly submittedCount: number,
    public readonly totalPlayers: number,
    public readonly eventNumber: number,
  ) {}
}

// Evento emitido al recibir un voto
export class PartyVoteCastEvent {
  constructor(
    public readonly sessionId: string,
    public readonly roundId: string,
    public readonly votes: any[], // conteo actualizado por opción
    public readonly eventNumber: number,
  ) {}
}

// Evento emitido al revelar resultados + actualizar leaderboard
export class PartyRoundResultEvent {
  constructor(
    public readonly sessionId: string,
    public readonly roundId: string,
    public readonly results: any,
    public readonly leaderboard: any[],
    public readonly eventNumber: number,
  ) {}
}

// Evento emitido al cerrar definitivamente una ronda
export class PartyRoundFinishedEvent {
  constructor(
    public readonly sessionId: string,
    public readonly roundId: string,
    public readonly leaderboard: any[],
    public readonly eventNumber: number,
  ) {}
}

// Evento emitido al finalizar el juego completo (podio definitivo)
export class PartyGameOverEvent {
  constructor(
    public readonly sessionId: string,
    public readonly gameType: string,
    public readonly finalLeaderboard: any[], // Top 10 definitivo
    public readonly eventNumber: number,
  ) {}
}
