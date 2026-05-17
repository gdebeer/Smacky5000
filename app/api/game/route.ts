import { NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { setGame } from '@/lib/store';
import type { GameState } from '@/lib/types';

export async function POST() {
  const gameId = uuid().slice(0, 8).toUpperCase();
  const game: GameState = {
    id: gameId,
    hostId: '',
    status: 'settings',
    bufferSeconds: 5,
    timeoutBehavior: 'skip',
    countdownSeconds: 3,
    defaultTimeSeconds: 300,
    players: [],
    currentPlayerIndex: 0,
    turnStartedAt: null,
    pausedTimeRemainingMs: null,
    phaseStartedAt: null,
    phaseDurationMs: null,
  };
  await setGame(game);
  return NextResponse.json({ gameId });
}
