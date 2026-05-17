import { NextRequest, NextResponse } from 'next/server';
import { getGame, setGame } from '@/lib/store';
import { broadcastState } from '@/lib/pusher-server';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;
  const { action } = await req.json();

  const game = await getGame(gameId);
  if (!game) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (action === 'pause') {
    if (game.status !== 'playing') return NextResponse.json({ ok: false });

    const elapsed = Date.now() - (game.turnStartedAt ?? Date.now());
    const currentPlayer = game.players[game.currentPlayerIndex];
    const remaining = Math.max(0, currentPlayer.timeRemainingMs - elapsed);

    const updated = {
      ...game,
      status: 'paused' as const,
      pausedTimeRemainingMs: remaining,
    };
    await setGame(updated);
    await broadcastState(gameId, updated);
    return NextResponse.json({ ok: true });
  }

  if (action === 'resume') {
    if (game.status !== 'paused') return NextResponse.json({ ok: false });

    const updatedPlayers = game.players.map((p, i) =>
      i === game.currentPlayerIndex
        ? { ...p, timeRemainingMs: game.pausedTimeRemainingMs ?? p.timeRemainingMs }
        : p
    );

    const updated = {
      ...game,
      players: updatedPlayers,
      status: 'playing' as const,
      turnStartedAt: Date.now(),
      pausedTimeRemainingMs: null,
    };
    await setGame(updated);
    await broadcastState(gameId, updated);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
