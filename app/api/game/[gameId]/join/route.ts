import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { getGame, setGame } from '@/lib/store';
import { broadcastState } from '@/lib/pusher-server';
import type { PlayerState } from '@/lib/types';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;
  const { name } = await req.json();

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name required' }, { status: 400 });
  }

  const game = await getGame(gameId);
  if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  if (game.status !== 'settings') {
    return NextResponse.json({ error: 'Game already started' }, { status: 400 });
  }

  const playerId = uuid();
  const isHost = game.players.length === 0;

  const player: PlayerState = {
    id: playerId,
    name: name.trim(),
    allocatedTimeMs: game.defaultTimeSeconds * 1000,
    timeRemainingMs: game.defaultTimeSeconds * 1000,
    order: game.players.length,
    timedOut: false,
  };

  const updated = {
    ...game,
    hostId: isHost ? playerId : game.hostId,
    players: [...game.players, player],
  };

  await setGame(updated);
  await broadcastState(gameId, updated);

  return NextResponse.json({ playerId, isHost });
}
