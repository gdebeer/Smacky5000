import { Redis } from '@upstash/redis';
import type { GameState } from './types';

const GAME_TTL_SECONDS = 86400;

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL) return null;
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return redis;
}

const mem = new Map<string, GameState>();

export async function getGame(id: string): Promise<GameState | null> {
  const r = getRedis();
  if (r) return r.get<GameState>(`game:${id}`);
  return mem.get(id) ?? null;
}

export async function setGame(game: GameState): Promise<void> {
  const r = getRedis();
  if (r) {
    await r.set(`game:${game.id}`, game, { ex: GAME_TTL_SECONDS });
  } else {
    mem.set(game.id, game);
  }
}

export async function deleteGame(id: string): Promise<void> {
  const r = getRedis();
  if (r) await r.del(`game:${id}`);
  else mem.delete(id);
}
