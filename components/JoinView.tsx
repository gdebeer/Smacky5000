'use client';
import { useState } from 'react';

interface Props {
  gameId: string;
  onJoin: (playerId: string, isHost: boolean) => void;
}

export default function JoinView({ gameId, onJoin }: Props) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleJoin() {
    if (!name.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/game/${gameId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to join');
        return;
      }
      onJoin(data.playerId, data.isHost);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-black tracking-tight text-white">SMACKY 5000</h1>
          <p className="text-zinc-400 text-sm uppercase tracking-widest">Multiplayer Clock</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
          <div className="text-center">
            <p className="text-zinc-400 text-xs uppercase tracking-widest mb-1">Joining game</p>
            <p className="text-white font-mono text-xl font-bold">{gameId}</p>
          </div>

          <div className="space-y-3">
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              maxLength={20}
              className="w-full bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-zinc-500"
              autoFocus
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              onClick={handleJoin}
              disabled={!name.trim() || loading}
              className="w-full bg-green-500 hover:bg-green-400 active:bg-green-600 disabled:bg-zinc-700 disabled:text-zinc-500 text-black font-bold text-lg rounded-xl py-3 transition-colors"
            >
              {loading ? 'Joining…' : 'Join Game'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
