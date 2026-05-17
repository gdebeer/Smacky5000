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
      <div className="w-full max-w-xs space-y-12">

        {/* Title */}
        <div className="text-center space-y-1">
          <h1 className="text-5xl font-black tracking-tight text-white">SMACKY</h1>
          <h1 className="text-5xl font-black tracking-tight text-emerald-400">5000</h1>
          <p className="text-zinc-600 text-xs uppercase tracking-widest pt-1">Multiplayer Clock</p>
        </div>

        {/* New game — big round button */}
        <div className="flex flex-col items-center gap-4">
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            onClick={handleCreate}
            disabled={creating}
            style={{ boxShadow: '0 0 60px rgba(52,211,153,0.2), 0 20px 40px rgba(0,0,0,0.4)' }}
            className="w-48 h-48 rounded-full bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 disabled:bg-zinc-800 disabled:shadow-none text-black font-black text-xl transition-all duration-150 active:scale-95 flex flex-col items-center justify-center gap-0.5"
          >
            {creating ? (
              <span className="text-lg">Creating…</span>
            ) : (
              <>
                <span className="text-2xl font-black tracking-tight">NEW</span>
                <span className="text-2xl font-black tracking-tight">GAME</span>
              </>
            )}
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-zinc-800" />
          <span className="text-zinc-700 text-xs uppercase tracking-widest">or join</span>
          <div className="flex-1 h-px bg-zinc-800" />
        </div>

        {/* Join */}
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Game code"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            maxLength={8}
            className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-600 text-white placeholder-zinc-700 rounded-2xl px-4 py-3 text-lg font-mono text-center uppercase tracking-widest focus:outline-none transition-colors"
          />
          <button
            onClick={handleJoin}
            disabled={!joinCode.trim()}
            className="w-full bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 disabled:bg-zinc-900 disabled:text-zinc-700 text-white font-bold text-base rounded-full py-3.5 transition-colors"
          >
            Join Game
          </button>
        </div>
      </div>
    </div>
  );
}
