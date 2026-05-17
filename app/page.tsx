'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  async function handleCreate() {
    setCreating(true);
    setError('');
    try {
      const res = await fetch('/api/game', { method: 'POST' });
      const data = await res.json();
      router.push(`/${data.gameId}`);
    } catch {
      setError('Failed to create game');
      setCreating(false);
    }
  }

  function handleJoin() {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    router.push(`/${code}`);
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-10">
        {/* Title */}
        <div className="text-center space-y-2">
          <h1 className="text-5xl font-black tracking-tight text-white">SMACKY 5000</h1>
          <p className="text-zinc-400 text-sm uppercase tracking-widest">Multiplayer Chess Clock</p>
        </div>

        {/* Create */}
        <div className="space-y-3">
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <button
            onClick={handleCreate}
            disabled={creating}
            className="w-full bg-green-500 hover:bg-green-400 active:bg-green-600 disabled:bg-zinc-700 disabled:text-zinc-500 text-black font-bold text-xl rounded-2xl py-5 transition-colors"
          >
            {creating ? 'Creating…' : 'New Game'}
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-zinc-800" />
          <span className="text-zinc-600 text-xs uppercase tracking-widest">or join</span>
          <div className="flex-1 h-px bg-zinc-800" />
        </div>

        {/* Join */}
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Enter game code"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            maxLength={8}
            className="w-full bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-600 rounded-xl px-4 py-3 text-lg font-mono text-center uppercase tracking-widest focus:outline-none focus:border-zinc-500"
          />
          <button
            onClick={handleJoin}
            disabled={!joinCode.trim()}
            className="w-full bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 disabled:bg-zinc-900 disabled:text-zinc-700 text-white font-bold text-lg rounded-2xl py-4 transition-colors"
          >
            Join Game
          </button>
        </div>
      </div>
    </div>
  );
}
