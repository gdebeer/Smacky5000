'use client';
import { useState, useCallback } from 'react';
import type { GameState, PlayerState } from '@/lib/types';

interface Props {
  game: GameState;
  myPlayerId: string;
}

function msToSeconds(ms: number) { return Math.round(ms / 1000); }

export default function SettingsView({ game, myPlayerId }: Props) {
  const isHost = game.hostId === myPlayerId;
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);
  const [copied, setCopied] = useState(false);

  const save = useCallback(async (patch: Partial<GameState> & { players?: PlayerState[] }) => {
    setSaving(true);
    await fetch(`/api/game/${game.id}/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId: myPlayerId, ...patch }),
    });
    setSaving(false);
  }, [game.id, myPlayerId]);

  async function handleStart() {
    setStarting(true);
    await fetch(`/api/game/${game.id}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId: myPlayerId }),
    });
    setStarting(false);
  }

  function updatePlayerTime(playerId: string, seconds: number) {
    const ms = Math.max(5, seconds) * 1000;
    save({ players: game.players.map((p) => p.id === playerId ? { ...p, allocatedTimeMs: ms, timeRemainingMs: ms } : p) });
  }

  function updatePlayerName(playerId: string, name: string) {
    save({ players: game.players.map((p) => p.id === playerId ? { ...p, name } : p) });
  }

  function movePlayer(index: number, dir: -1 | 1) {
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= game.players.length) return;
    const players = [...game.players];
    [players[index], players[newIndex]] = [players[newIndex], players[index]];
    save({ players: players.map((p, i) => ({ ...p, order: i })) });
  }

  function removePlayer(playerId: string) {
    if (game.players.length <= 1) return;
    save({ players: game.players.filter((p) => p.id !== playerId).map((p, i) => ({ ...p, order: i })) });
  }

  function shufflePlayers() {
    const shuffled = [...game.players].sort(() => Math.random() - 0.5);
    save({ players: shuffled.map((p, i) => ({ ...p, order: i })) });
  }

  async function copyLink() {
    await navigator.clipboard.writeText(`${window.location.origin}/${game.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen px-4 py-6 space-y-5" style={{ background: 'var(--show-paper)' }}>
      <div className="max-w-lg mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-black leading-none" style={{ fontSize: '1.8rem', color: 'var(--show-ink)', letterSpacing: '-0.03em' }}>
              SMACKY <span style={{ color: 'var(--show-accent)' }}>5000</span>
            </h1>
            <span className="show-caps">Game Setup</span>
          </div>
          <div className="text-right">
            <span className="show-caps">Code</span>
            <p className="font-mono font-black text-2xl mt-0.5" style={{ color: 'var(--show-accent)', letterSpacing: '0.05em' }}>{game.id}</p>
          </div>
        </div>

        {/* Share */}
        <button onClick={copyLink} className="show-btn show-btn-ghost w-full text-left" style={{ padding: '10px 12px', borderColor: 'var(--show-line)' }}>
          <div>
            <span className="show-caps">Invite link — tap to copy</span>
            <p className="font-mono text-sm mt-0.5 truncate" style={{ color: copied ? 'var(--show-good)' : 'var(--show-ink-2)' }}>
              {copied ? '✓ Copied!' : (typeof window !== 'undefined' ? `${window.location.origin}/${game.id}` : `…/${game.id}`)}
            </p>
          </div>
        </button>

        {/* Players */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="show-caps">Players ({game.players.length})</span>
            <div className="flex items-center gap-2">
              {saving && <span className="show-caps">Saving…</span>}
              {isHost && game.players.length > 1 && (
                <button onClick={shufflePlayers} className="show-btn show-btn-ghost" style={{ padding: '4px 10px', fontSize: '12px' }}>
                  Shuffle
                </button>
              )}
            </div>
          </div>

          {game.players.length === 0 && (
            <div className="show-dash p-8 text-center">
              <span className="show-caps">Waiting for players to join…</span>
            </div>
          )}

          {game.players.map((player, index) => (
            <div key={player.id} className="show-card show-bord-1" style={{ padding: '12px 14px', boxShadow: player.id === myPlayerId ? 'var(--show-shadow-sm)' : 'none' }}>
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-bold w-5 shrink-0" style={{ color: 'var(--show-ink-3)' }}>{index + 1}</span>

                {isHost ? (
                  <input
                    type="text"
                    value={player.name}
                    onChange={(e) => updatePlayerName(player.id, e.target.value)}
                    onBlur={(e) => updatePlayerName(player.id, e.target.value.trim() || player.name)}
                    maxLength={20}
                    className="show-input flex-1 min-w-0"
                    style={{ padding: '6px 10px', fontSize: '14px' }}
                  />
                ) : (
                  <span className="flex-1 font-semibold" style={{ color: 'var(--show-ink)' }}>
                    {player.name}
                    {player.id === myPlayerId && <span className="show-caps ml-2">you</span>}
                  </span>
                )}

                <div className="flex items-center gap-2 shrink-0">
                  {isHost ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={msToSeconds(player.allocatedTimeMs)}
                        onChange={(e) => updatePlayerTime(player.id, Number(e.target.value))}
                        min={5} max={3600}
                        className="show-input text-right font-mono"
                        style={{ width: '64px', padding: '6px 8px', fontSize: '14px' }}
                      />
                      <span className="show-caps">s</span>
                    </div>
                  ) : (
                    <span className="font-mono text-sm font-bold" style={{ color: 'var(--show-ink-2)' }}>{msToSeconds(player.allocatedTimeMs)}s</span>
                  )}

                  {isHost && game.players.length > 1 && (
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => movePlayer(index, -1)}
                        disabled={index === 0}
                        className="show-btn"
                        style={{ width: '36px', height: '28px', padding: 0, fontSize: '14px', opacity: index === 0 ? 0.25 : 1, lineHeight: 1 }}
                      >▲</button>
                      <button
                        onClick={() => movePlayer(index, 1)}
                        disabled={index === game.players.length - 1}
                        className="show-btn"
                        style={{ width: '36px', height: '28px', padding: 0, fontSize: '14px', opacity: index === game.players.length - 1 ? 0.25 : 1, lineHeight: 1 }}
                      >▼</button>
                    </div>
                  )}

                  {isHost && game.players.length > 1 && (
                    <button onClick={() => removePlayer(player.id)} className="show-btn" style={{ width: '36px', height: '60px', padding: 0, fontSize: '18px', color: 'var(--show-ink-3)' }}>×</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Game Settings */}
        <div className="show-card show-bord" style={{ boxShadow: 'var(--show-shadow)' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1.5px solid var(--show-line)' }}>
            <span className="show-caps">Game Settings</span>
          </div>

          {[
            { label: 'Default Time', sublabel: 'Seconds per player', key: 'defaultTimeSeconds', value: game.defaultTimeSeconds, unit: 's', min: 5, max: 3600 },
            { label: 'Buffer Time', sublabel: 'Pause between turns', key: 'bufferSeconds', value: game.bufferSeconds, unit: 's', min: 0, max: 60 },
            { label: 'Countdown', sublabel: 'Before game starts (0 = off)', key: 'countdownSeconds', value: game.countdownSeconds, unit: 's', min: 0, max: 10 },
          ].map((row) => (
            <div key={row.key} className="flex items-center justify-between" style={{ padding: '12px 14px', borderBottom: '1px solid var(--show-line-soft)' }}>
              <div>
                <p className="font-semibold text-sm" style={{ color: 'var(--show-ink)' }}>{row.label}</p>
                <span className="show-caps">{row.sublabel}</span>
              </div>
              {isHost ? (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={row.value}
                    onChange={(e) => save({ [row.key]: Number(e.target.value) })}
                    min={row.min} max={row.max}
                    className="show-input text-right font-mono"
                    style={{ width: '72px', padding: '6px 8px', fontSize: '14px' }}
                  />
                  <span className="show-caps">{row.unit}</span>
                </div>
              ) : (
                <span className="font-mono font-bold text-sm" style={{ color: 'var(--show-ink-2)' }}>{row.value}{row.unit}</span>
              )}
            </div>
          ))}

          <div style={{ padding: '12px 14px' }}>
            <p className="font-semibold text-sm mb-2" style={{ color: 'var(--show-ink)' }}>When Time Runs Out</p>
            {isHost ? (
              <div className="flex gap-2">
                {(['skip', 'pause'] as const).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => save({ timeoutBehavior: opt })}
                    className="show-btn flex-1"
                    style={{
                      padding: '8px',
                      background: game.timeoutBehavior === opt ? 'var(--show-accent)' : 'var(--show-card)',
                      boxShadow: game.timeoutBehavior === opt ? 'var(--show-shadow-sm)' : 'none',
                    }}
                  >
                    {opt === 'skip' ? 'Skip to Next' : 'Pause Game'}
                  </button>
                ))}
              </div>
            ) : (
              <span className="font-semibold text-sm" style={{ color: 'var(--show-ink-2)' }}>
                {game.timeoutBehavior === 'skip' ? 'Skip to next player' : 'Pause game'}
              </span>
            )}
          </div>
        </div>

        {/* Action */}
        {isHost ? (
          <button
            onClick={handleStart}
            disabled={starting || game.players.length === 0}
            className="show-btn show-btn-primary w-full"
            style={{ padding: '18px', fontSize: '1.1rem', boxShadow: 'var(--show-shadow-lg)' }}
          >
            {starting ? 'Starting…' : 'Start Game'}
          </button>
        ) : (
          <div className="show-dash p-5 text-center">
            <span className="show-caps">Waiting for host to start…</span>
          </div>
        )}

        <div className="pb-6" />
      </div>
    </div>
  );
}
