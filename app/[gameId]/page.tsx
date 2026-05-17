'use client';
import { useEffect, useState, useCallback } from 'react';
import { use } from 'react';
import type { GameState } from '@/lib/types';
import JoinView from '@/components/JoinView';
import SettingsView from '@/components/SettingsView';
import GameView from '@/components/GameView';

interface Session {
  playerId: string;
  isHost: boolean;
}

function sessionKey(gameId: string) {
  return `smacky-session-${gameId}`;
}

export default function GamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const [session, setSession] = useState<Session | null>(null);
  const [game, setGame] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Load session from localStorage
  useEffect(() => {
    const raw = localStorage.getItem(sessionKey(gameId));
    if (raw) {
      try {
        setSession(JSON.parse(raw));
      } catch {
        localStorage.removeItem(sessionKey(gameId));
      }
    }
  }, [gameId]);

  // Fetch initial game state
  const fetchGame = useCallback(async () => {
    const res = await fetch(`/api/game/${gameId}`);
    if (res.status === 404) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    const data: GameState = await res.json();
    setGame(data);
    setLoading(false);
  }, [gameId]);

  useEffect(() => {
    fetchGame();
  }, [fetchGame]);

  // Subscribe to Pusher for real-time updates
  useEffect(() => {
    if (!game) return;

    let channel: ReturnType<ReturnType<typeof import('@/lib/pusher-client')['getPusherClient']>['subscribe']>;

    async function subscribe() {
      const { getPusherClient } = await import('@/lib/pusher-client');
      const pusher = getPusherClient();
      channel = pusher.subscribe(`game-${gameId}`);
      channel.bind('state', (data: GameState) => {
        setGame(data);
      });
    }

    subscribe();

    return () => {
      if (channel) channel.unbind_all();
    };
  }, [gameId, game !== null]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleJoin(playerId: string, isHost: boolean) {
    const s = { playerId, isHost };
    setSession(s);
    localStorage.setItem(sessionKey(gameId), JSON.stringify(s));
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-500 text-sm uppercase tracking-widest">Loading…</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4 px-6">
        <p className="text-white text-xl font-bold">Game not found</p>
        <p className="text-zinc-500 text-sm">The code <span className="font-mono text-zinc-300">{gameId}</span> doesn&apos;t match any active game.</p>
        <a href="/" className="text-green-400 hover:text-green-300 text-sm underline">Back to home</a>
      </div>
    );
  }

  if (!game) return null;

  // Player isn't in the game yet (or game exists but they haven't joined)
  if (!session) {
    if (game.status !== 'settings') {
      return (
        <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-white text-xl font-bold">Game in progress</p>
          <p className="text-zinc-400 text-sm">This game has already started. You can&apos;t join now.</p>
          <a href="/" className="text-green-400 hover:text-green-300 text-sm underline">Back to home</a>
        </div>
      );
    }
    return <JoinView gameId={gameId} onJoin={handleJoin} />;
  }

  // Validate that player is still in the game
  const playerInGame = game.players.some((p) => p.id === session.playerId);
  if (!playerInGame && game.status === 'settings') {
    // Host removed them or they have a stale session
    localStorage.removeItem(sessionKey(gameId));
    setSession(null);
    return null;
  }

  if (game.status === 'settings') {
    return <SettingsView game={game} myPlayerId={session.playerId} />;
  }

  return <GameView game={game} myPlayerId={session.playerId} />;
}
