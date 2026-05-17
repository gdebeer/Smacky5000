import { NextRequest, NextResponse } from 'next/server';
import { getGame, setGame } from '@/lib/store';
import { broadcastState } from '@/lib/pusher-server';
import type { GameState } from '@/lib/types';

function nextActiveIndex(players: GameState['players'], from: number): number | null {
  const n = players.length;
  for (let i = 1; i < n; i++) {
    const idx = (from + i) % n;
    if (!players[idx].timedOut) return idx;
  }
  return null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;
  const { playerId } = await req.json();

  const game = await getGame(gameId);
  if (!game) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (game.status !== 'playing') return NextResponse.json({ error: 'Not playing' }, { status: 400 });

  const currentPlayer = game.players[game.currentPlayerIndex];
  if (currentPlayer.id !== playerId) {
    return NextResponse.json({ error: 'Not your turn' }, { status: 403 });
  }

  const elapsed = Date.now() - (game.turnStartedAt ?? Date.now());
  const newRemaining = Math.max(0, currentPlayer.timeRemainingMs - elapsed);

  const updatedPlayers = game.players.map((p, i) =>
    i === game.currentPlayerIndex ? { ...p, timeRemainingMs: newRemaining } : p
  );

  const nextIdx = nextActiveIndex(updatedPlayers, game.currentPlayerIndex);

  if (nextIdx === null) {
    const finished = { ...game, players: updatedPlayers, status: 'finished' as const };
    await setGame(finished);
    await broadcastState(gameId, finished);
    return NextResponse.json({ ok: true });
  }

  let updated: GameState;
  if (game.bufferSeconds > 0) {
    updated = {
      ...game,
      players: updatedPlayers,
      status: 'buffer',
      currentPlayerIndex: nextIdx,
      turnStartedAt: null,
      phaseStartedAt: Date.now(),
      phaseDurationMs: game.bufferSeconds * 1000,
    };
  } else {
    updated = {
      ...game,
      players: updatedPlayers,
      status: 'playing',
      currentPlayerIndex: nextIdx,
      turnStartedAt: Date.now(),
    };
  }

  await setGame(updated);
  await broadcastState(gameId, updated);
  return NextResponse.json({ ok: true });
}
