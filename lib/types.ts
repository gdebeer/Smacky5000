export type GameStatus =
  | 'settings'
  | 'countdown'
  | 'playing'
  | 'buffer'
  | 'paused'
  | 'finished';

export type TimeoutBehavior = 'skip' | 'pause';

export interface PlayerState {
  id: string;
  name: string;
  allocatedTimeMs: number;
  timeRemainingMs: number;
  order: number;
  timedOut: boolean;
}

export interface GameState {
  id: string;
  hostId: string;
  status: GameStatus;
  bufferSeconds: number;
  timeoutBehavior: TimeoutBehavior;
  countdownSeconds: number;
  defaultTimeSeconds: number;
  players: PlayerState[];
  currentPlayerIndex: number;
  turnStartedAt: number | null;
  pausedTimeRemainingMs: number | null;
  phaseStartedAt: number | null;
  phaseDurationMs: number | null;
}
