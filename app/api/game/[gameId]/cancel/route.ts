import { NextRequest, NextResponse } from 'next/server';
import { getGame, setGame } from '@/lib/store';
import { broadcastState } from '@/lib/pusher-server';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;
  await req.json();

  const game = await getGame(gameId);
  if (!game) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const resetPlayers = game.players.map((p) => ({
    ...p,
    timeRemainingMs: p.allocatedTimeMs,
    timedOut: false,
  }));

  const updated = {
    ...game,
    status: 'settings' as const,
    players: resetPlayers,
    currentPlayerIndex: 0,
    turnStartedAt: null,
    pausedTimeRemainingMs: null,
    phaseStartedAt: null,
    phaseDurationMs: null,
  };

  await setGame(updated);
  await broadcastState(gameId, updated);
  return NextResponse.json({ ok: true });
}
