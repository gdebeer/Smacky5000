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
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-xs space-y-10">

        {/* Title */}
        <div>
          <div className="show-sticker mb-4" style={{ display: 'inline-flex' }}>Multiplayer Clock</div>
          <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: 'clamp(2.8rem, 18vw, 5rem)', color: 'var(--show-ink)', letterSpacing: '-0.02em', lineHeight: 1, fontWeight: 900 }}>
            SMACKY<br />
            <span style={{ color: 'var(--show-accent)', textShadow: '0 0 24px rgba(0,196,232,.35)' }}>5000</span>
          </h1>
        </div>

        {/* Create */}
        <div className="space-y-3">
          {error && <p className="show-caps" style={{ color: 'var(--show-warn)' }}>{error}</p>}
          <button
            onClick={handleCreate}
            disabled={creating}
            className="show-btn show-btn-primary w-full"
            style={{ padding: '18px', fontSize: '1rem' }}
          >
            {creating ? 'Creating…' : 'New Game'}
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1" style={{ height: '1px', background: 'var(--show-line)' }} />
          <span className="show-caps">or join</span>
          <div className="flex-1" style={{ height: '1px', background: 'var(--show-line)' }} />
        </div>

        {/* Join */}
        <div className="space-y-3">
          <input
            type="text"
            placeholder="ABC"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            maxLength={3}
            className="show-input text-center uppercase"
            style={{ fontFamily: 'var(--font-sans)', fontSize: '2rem', letterSpacing: '0.3em', padding: '16px', fontWeight: 800 }}
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
