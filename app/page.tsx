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
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12" style={{ background: 'var(--show-paper)' }}>
      <div className="w-full max-w-xs space-y-10">

        {/* Title */}
        <div>
          <div className="show-sticker mb-4" style={{ display: 'inline-flex' }}>Multiplayer Clock</div>
          <h1 className="font-black leading-none" style={{ fontSize: 'clamp(3rem, 18vw, 5rem)', color: 'var(--show-ink)', letterSpacing: '-0.03em' }}>
            SMACKY<br />
            <span style={{ color: 'var(--show-accent)' }}>5000</span>
          </h1>
        </div>

        {/* Create */}
        <div className="space-y-3">
          {error && <p className="show-caps" style={{ color: 'var(--show-warn)' }}>{error}</p>}
          <button
            onClick={handleCreate}
            disabled={creating}
            className="show-btn show-btn-primary w-full"
            style={{ padding: '18px', fontSize: '1.25rem', boxShadow: 'var(--show-shadow-lg)' }}
          >
            {creating ? 'Creating…' : 'New Game'}
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1" style={{ height: '1.5px', background: 'var(--show-line)' }} />
          <span className="show-caps">or join</span>
          <div className="flex-1" style={{ height: '1.5px', background: 'var(--show-line)' }} />
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
            className="show-input text-center font-mono uppercase tracking-widest text-xl"
            style={{ fontFamily: 'var(--font-mono)' }}
          />
          <button
            onClick={handleJoin}
            disabled={!joinCode.trim()}
            className="show-btn show-btn-ink w-full"
            style={{ padding: '14px' }}
          >
            Join Game
          </button>
        </div>
      </div>
    </div>
  );
}
