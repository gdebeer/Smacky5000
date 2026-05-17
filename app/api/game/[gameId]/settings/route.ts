import { NextRequest, NextResponse } from 'next/server';
import { getGame, setGame } from '@/lib/store';
import { broadcastState } from '@/lib/pusher-server';
import type { TimeoutBehavior } from '@/lib/types';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;
  const body = await req.json();
  const { playerId, bufferSeconds, timeoutBehavior, countdownSeconds, defaultTimeSeconds, players } = body;

  const game = await getGame(gameId);
  if (!game) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (game.hostId !== playerId) return NextResponse.json({ error: 'Not host' }, { status: 403 });
  if (game.status !== 'settings') return NextResponse.json({ error: 'Game started' }, { status: 400 });

  const updated = {
    ...game,
    ...(bufferSeconds !== undefined && { bufferSeconds }),
    ...(timeoutBehavior !== undefined && { timeoutBehavior: timeoutBehavior as TimeoutBehavior }),
    ...(countdownSeconds !== undefined && { countdownSeconds }),
    ...(defaultTimeSeconds !== undefined && { defaultTimeSeconds }),
    ...(players !== undefined && { players }),
  };

  await setGame(updated);
  await broadcastState(gameId, updated);
  return NextResponse.json({ ok: true });
}
