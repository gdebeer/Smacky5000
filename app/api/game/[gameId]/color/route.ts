import { NextRequest, NextResponse } from 'next/server';
import { getGame, setGame } from '@/lib/store';
import { broadcastState } from '@/lib/pusher-server';
import { PLAYER_COLORS } from '@/lib/colors';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;
  const { requesterId, targetId, color } = await req.json();

  if (!PLAYER_COLORS.includes(color)) {
    return NextResponse.json({ error: 'Invalid color' }, { status: 400 });
  }

  const game = await getGame(gameId);
  if (!game) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (game.status !== 'settings') {
    return NextResponse.json({ error: 'Game already started' }, { status: 400 });
  }

  const isOwnColor = requesterId === targetId;
  const isHost = game.hostId === requesterId;
  if (!isOwnColor && !isHost) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const updated = {
    ...game,
    players: game.players.map((p) => p.id === targetId ? { ...p, color } : p),
  };

  await setGame(updated);
  await broadcastState(gameId, updated);
  return NextResponse.json({ ok: true });
}
