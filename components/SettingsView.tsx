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

  async function copyLink() {
    await navigator.clipboard.writeText(`${window.location.origin}/${game.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight">SMACKY 5000</h1>
            <p className="text-zinc-600 text-xs uppercase tracking-widest">Game Setup</p>
          </div>
          <div className="text-right">
            <p className="text-zinc-600 text-[10px] uppercase tracking-widest mb-0.5">Code</p>
            <p className="font-mono text-2xl font-black text-emerald-400">{game.id}</p>
          </div>
        </div>

        {/* Share link */}
        <button
          onClick={copyLink}
          className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-2xl px-4 py-3 text-left transition-colors group"
        >
          <p className="text-zinc-600 text-[10px] uppercase tracking-widest mb-1">Invite link — tap to copy</p>
          <p className="text-zinc-400 group-hover:text-zinc-300 text-sm font-mono truncate transition-colors">
            {copied ? '✓ Copied!' : (typeof window !== 'undefined' ? `${window.location.origin}/${game.id}` : `…/${game.id}`)}
          </p>
        </button>

        {/* Players */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-zinc-500 text-xs uppercase tracking-widest">Players ({game.players.length})</p>
            {saving && <p className="text-zinc-700 text-xs">Saving…</p>}
          </div>

          {game.players.length === 0 && (
            <div className="border border-dashed border-zinc-800 rounded-2xl p-8 text-center text-zinc-700 text-sm">
              Waiting for players to join…
            </div>
          )}

          {game.players.map((player, index) => (
            <div key={player.id} className={`bg-zinc-900 rounded-2xl p-4 border ${player.id === myPlayerId ? 'border-white/8' : 'border-transparent'}`}>
              <div className="flex items-center gap-3">
                <span className="text-zinc-700 text-sm font-mono w-4 shrink-0">{index + 1}</span>

                {isHost ? (
                  <input
                    type="text"
                    value={player.name}
                    onChange={(e) => updatePlayerName(player.id, e.target.value)}
                    onBlur={(e) => updatePlayerName(player.id, e.target.value.trim() || player.name)}
                    maxLength={20}
                    className="flex-1 bg-zinc-800 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-600 min-w-0"
                  />
                ) : (
                  <span className="flex-1 text-white font-medium text-sm">
                    {player.name}
                    {player.id === myPlayerId && <span className="text-zinc-600 text-xs ml-2">you</span>}
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
                        className="w-16 bg-zinc-800 text-white rounded-xl px-2 py-2 text-sm text-right focus:outline-none focus:ring-1 focus:ring-zinc-600"
                      />
                      <span className="text-zinc-600 text-xs">s</span>
                    </div>
                  ) : (
                    <span className="text-zinc-500 text-sm font-mono">{msToSeconds(player.allocatedTimeMs)}s</span>
                  )}

                  {isHost && (
                    <div className="flex flex-col gap-0.5 ml-1">
                      <button onClick={() => movePlayer(index, -1)} disabled={index === 0} className="text-zinc-600 hover:text-zinc-300 disabled:opacity-20 text-xs leading-none">▲</button>
                      <button onClick={() => movePlayer(index, 1)} disabled={index === game.players.length - 1} className="text-zinc-600 hover:text-zinc-300 disabled:opacity-20 text-xs leading-none">▼</button>
                    </div>
                  )}

                  {isHost && game.players.length > 1 && (
                    <button onClick={() => removePlayer(player.id)} className="text-zinc-700 hover:text-red-400 text-xl leading-none ml-1 transition-colors">×</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Settings */}
        <div className="bg-zinc-900 rounded-2xl overflow-hidden border border-transparent">
          <p className="text-zinc-600 text-[10px] uppercase tracking-widest px-4 pt-4 pb-2">Game Settings</p>

          <div className="divide-y divide-zinc-800">
            {/* Default time */}
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-white text-sm font-medium">Default Time</p>
                <p className="text-zinc-600 text-xs">Seconds per player</p>
              </div>
              {isHost ? (
                <div className="flex items-center gap-1">
                  <input type="number" value={game.defaultTimeSeconds} onChange={(e) => save({ defaultTimeSeconds: Number(e.target.value) })} min={5} max={3600}
                    className="w-20 bg-zinc-800 text-white rounded-xl px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-zinc-600" />
                  <span className="text-zinc-600 text-xs">s</span>
                </div>
              ) : <span className="text-zinc-400 text-sm font-mono">{game.defaultTimeSeconds}s</span>}
            </div>

            {/* Buffer */}
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-white text-sm font-medium">Buffer Time</p>
                <p className="text-zinc-600 text-xs">Pause between turns</p>
              </div>
              {isHost ? (
                <div className="flex items-center gap-1">
                  <input type="number" value={game.bufferSeconds} onChange={(e) => save({ bufferSeconds: Number(e.target.value) })} min={0} max={60}
                    className="w-16 bg-zinc-800 text-white rounded-xl px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-zinc-600" />
                  <span className="text-zinc-600 text-xs">s</span>
                </div>
              ) : <span className="text-zinc-400 text-sm font-mono">{game.bufferSeconds}s</span>}
            </div>

            {/* Countdown */}
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-white text-sm font-medium">Countdown</p>
                <p className="text-zinc-600 text-xs">Before game starts (0 = skip)</p>
              </div>
              {isHost ? (
                <div className="flex items-center gap-1">
                  <input type="number" value={game.countdownSeconds} onChange={(e) => save({ countdownSeconds: Number(e.target.value) })} min={0} max={10}
                    className="w-16 bg-zinc-800 text-white rounded-xl px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-zinc-600" />
                  <span className="text-zinc-600 text-xs">s</span>
                </div>
              ) : <span className="text-zinc-400 text-sm font-mono">{game.countdownSeconds > 0 ? `${game.countdownSeconds}s` : 'Off'}</span>}
            </div>

            {/* Timeout behavior */}
            <div className="px-4 py-3 space-y-2">
              <p className="text-white text-sm font-medium">When Time Runs Out</p>
              {isHost ? (
                <div className="flex gap-2">
                  {(['skip', 'pause'] as const).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => save({ timeoutBehavior: opt })}
                      className={`flex-1 py-2 rounded-full text-sm font-medium transition-colors ${
                        game.timeoutBehavior === opt
                          ? 'bg-emerald-500 text-black'
                          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                      }`}
                    >
                      {opt === 'skip' ? 'Skip to Next' : 'Pause Game'}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-zinc-400 text-sm capitalize">{game.timeoutBehavior === 'skip' ? 'Skip to next player' : 'Pause game'}</p>
              )}
            </div>
          </div>
        </div>

        {/* Action */}
        {isHost ? (
          <button
            onClick={handleStart}
            disabled={starting || game.players.length === 0}
            style={{ boxShadow: game.players.length > 0 ? '0 0 40px rgba(52,211,153,0.15)' : 'none' }}
            className="w-full bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-bold text-lg rounded-full py-4 transition-all"
          >
            {starting ? 'Starting…' : 'Start Game'}
          </button>
        ) : (
          <div className="border border-dashed border-zinc-800 rounded-2xl p-5 text-center text-zinc-600 text-sm">
            Waiting for host to start…
          </div>
        )}

        <div className="pb-4" />
      </div>
    </div>
  );
}
