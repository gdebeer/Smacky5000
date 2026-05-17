import { NextRequest, NextResponse } from 'next/server';
import { getGame, setGame } from '@/lib/store';
import { broadcastState } from '@/lib/pusher-server';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;
  const { playerId } = await req.json();

  const game = await getGame(gameId);
  if (!game) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (game.hostId !== playerId) return NextResponse.json({ error: 'Not host' }, { status: 403 });
  if (game.status !== 'settings') return NextResponse.json({ error: 'Already started' }, { status: 400 });
  if (game.players.length === 0) return NextResponse.json({ error: 'No players' }, { status: 400 });

  const sortedPlayers = [...game.players].sort((a, b) => a.order - b.order);

  let updated = { ...game, players: sortedPlayers };

  if (game.countdownSeconds > 0) {
    updated = {
      ...updated,
      status: 'countdown',
      phaseStartedAt: Date.now(),
      phaseDurationMs: game.countdownSeconds * 1000,
      currentPlayerIndex: 0,
    };
  } else {
    updated = {
      ...updated,
      status: 'playing',
      currentPlayerIndex: 0,
      turnStartedAt: Date.now(),
    };
  }

  await setGame(updated);
  await broadcastState(gameId, updated);
  return NextResponse.json({ ok: true });
}
