import Pusher from 'pusher';
import type { GameState } from './types';

let instance: Pusher | null = null;

function getPusher(): Pusher {
  if (!instance) {
    instance = new Pusher({
      appId: process.env.PUSHER_APP_ID!,
      key: process.env.PUSHER_KEY!,
      secret: process.env.PUSHER_SECRET!,
      cluster: process.env.PUSHER_CLUSTER!,
      useTLS: true,
    });
  }
  return instance;
}

export async function broadcastState(gameId: string, state: GameState) {
  await getPusher().trigger(`game-${gameId}`, 'state', state);
}
