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
      if (!res.ok) { setError(data.error || 'Failed to join'); return; }
      onJoin(data.playerId, data.isHost);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-8">

        <div>
          <div className="show-sticker mb-3" style={{ display: 'inline-flex' }}>Join Game</div>
          <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: '2.6rem', color: 'var(--show-ink)', letterSpacing: '-0.02em', lineHeight: 1, fontWeight: 900 }}>
            SMACKY <span style={{ color: 'var(--show-accent)', textShadow: '0 0 20px rgba(0,196,232,.35)' }}>5000</span>
          </h1>
        </div>

        <div className="show-card show-shadow" style={{ padding: '24px' }}>
          <div className="space-y-4">
            <div>
              <span className="show-caps">Game Code</span>
              <p className="font-bold text-2xl mt-1" style={{ color: 'var(--show-accent)', letterSpacing: '0.2em', textShadow: `0 0 12px color-mix(in srgb, var(--show-accent) 40%, transparent)` }}>{gameId}</p>
            </div>

            <div className="space-y-3">
              <div>
                <span className="show-caps">Your Name</span>
                <input
                  type="text"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                  maxLength={20}
                  className="show-input mt-1"
                  autoFocus
                />
              </div>
              {error && <p className="show-caps" style={{ color: 'var(--show-warn)' }}>{error}</p>}
              <button
                onClick={handleJoin}
                disabled={!name.trim() || loading}
                className="show-btn show-btn-primary w-full"
                style={{ padding: '14px', fontSize: '0.95rem' }}
              >
                {loading ? 'Joining…' : 'Join Game'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
