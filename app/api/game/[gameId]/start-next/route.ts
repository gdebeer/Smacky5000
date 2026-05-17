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

  if (game.status !== 'countdown' && game.status !== 'buffer') {
    return NextResponse.json({ ok: false, reason: 'wrong status' });
  }

  const phaseEnd = (game.phaseStartedAt ?? 0) + (game.phaseDurationMs ?? 0);
  if (Date.now() < phaseEnd - 200) {
    return NextResponse.json({ ok: false, reason: 'too early' });
  }

  const updated = {
    ...game,
    status: 'playing' as const,
    turnStartedAt: Date.now(),
    phaseStartedAt: null,
    phaseDurationMs: null,
  };

  await setGame(updated);
  await broadcastState(gameId, updated);
  return NextResponse.json({ ok: true });
}
