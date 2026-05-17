'use client';
import { useState, useCallback } from 'react';
import type { GameState, PlayerState } from '@/lib/types';

interface Props {
  game: GameState;
  myPlayerId: string;
}

function formatSeconds(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec > 0 ? sec + 's' : ''}`.trim() : `${sec}s`;
}

function msToSeconds(ms: number) {
  return Math.round(ms / 1000);
}

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
    const players = game.players.map((p) =>
      p.id === playerId ? { ...p, allocatedTimeMs: ms, timeRemainingMs: ms } : p
    );
    save({ players });
  }

  function updatePlayerName(playerId: string, name: string) {
    const players = game.players.map((p) =>
      p.id === playerId ? { ...p, name } : p
    );
    save({ players });
  }

  function movePlayer(index: number, dir: -1 | 1) {
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= game.players.length) return;
    const players = [...game.players];
    [players[index], players[newIndex]] = [players[newIndex], players[index]];
    const reordered = players.map((p, i) => ({ ...p, order: i }));
    save({ players: reordered });
  }

  function removePlayer(playerId: string) {
    if (game.players.length <= 1) return;
    const players = game.players
      .filter((p) => p.id !== playerId)
      .map((p, i) => ({ ...p, order: i }));
    save({ players });
  }

  async function copyLink() {
    await navigator.clipboard.writeText(`${window.location.origin}/${game.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/${game.id}` : '';

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight">SMACKY 5000</h1>
            <p className="text-zinc-400 text-xs uppercase tracking-widest">Game Setup</p>
          </div>
          <div className="text-right">
            <p className="text-zinc-400 text-xs uppercase tracking-widest mb-1">Game Code</p>
            <p className="font-mono text-2xl font-bold text-green-400">{game.id}</p>
          </div>
        </div>

        {/* Share */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <p className="text-zinc-400 text-xs uppercase tracking-widest mb-2">Share Link</p>
          <div className="flex items-center gap-2">
            <p className="text-zinc-300 text-sm flex-1 truncate font-mono">{shareUrl}</p>
            <button
              onClick={copyLink}
              className="bg-zinc-700 hover:bg-zinc-600 text-white text-xs px-3 py-1.5 rounded-lg transition-colors shrink-0"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Players */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400">
              Players ({game.players.length})
            </h2>
            {saving && <p className="text-zinc-500 text-xs">Saving…</p>}
          </div>

          {game.players.length === 0 && (
            <div className="bg-zinc-900 border border-dashed border-zinc-700 rounded-2xl p-6 text-center text-zinc-500 text-sm">
              Waiting for players to join…
            </div>
          )}

          {game.players.map((player, index) => (
            <div key={player.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <span className="text-zinc-500 text-sm font-mono w-5 text-center">{index + 1}</span>

                {isHost ? (
                  <input
                    type="text"
                    value={player.name}
                    onChange={(e) => updatePlayerName(player.id, e.target.value)}
                    onBlur={(e) => updatePlayerName(player.id, e.target.value.trim() || player.name)}
                    maxLength={20}
                    className="flex-1 bg-zinc-800 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-600"
                  />
                ) : (
                  <span className="flex-1 text-white font-medium">
                    {player.name}
                    {player.id === myPlayerId && <span className="text-zinc-500 text-xs ml-2">(you)</span>}
                  </span>
                )}

                <div className="flex items-center gap-2">
                  {isHost ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={msToSeconds(player.allocatedTimeMs)}
                        onChange={(e) => updatePlayerTime(player.id, Number(e.target.value))}
                        min={5}
                        max={3600}
                        className="w-16 bg-zinc-800 text-white rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-zinc-600"
                      />
                      <span className="text-zinc-500 text-xs">s</span>
                    </div>
                  ) : (
                    <span className="text-zinc-300 text-sm font-mono">
                      {formatSeconds(msToSeconds(player.allocatedTimeMs))}
                    </span>
                  )}

                  {isHost && (
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => movePlayer(index, -1)}
                        disabled={index === 0}
                        className="text-zinc-500 hover:text-white disabled:opacity-20 text-xs leading-none"
                      >▲</button>
                      <button
                        onClick={() => movePlayer(index, 1)}
                        disabled={index === game.players.length - 1}
                        className="text-zinc-500 hover:text-white disabled:opacity-20 text-xs leading-none"
                      >▼</button>
                    </div>
                  )}

                  {isHost && game.players.length > 1 && (
                    <button
                      onClick={() => removePlayer(player.id)}
                      className="text-zinc-600 hover:text-red-400 text-lg leading-none ml-1"
                    >×</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Game Settings (host only) */}
        {isHost && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400">Settings</h2>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-sm font-medium">Default Time</p>
                <p className="text-zinc-500 text-xs">Seconds per player</p>
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={game.defaultTimeSeconds}
                  onChange={(e) => save({ defaultTimeSeconds: Number(e.target.value) })}
                  min={5}
                  max={3600}
                  className="w-20 bg-zinc-800 text-white rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-zinc-600"
                />
                <span className="text-zinc-500 text-xs">s</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-sm font-medium">Buffer Time</p>
                <p className="text-zinc-500 text-xs">Pause between turns</p>
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={game.bufferSeconds}
                  onChange={(e) => save({ bufferSeconds: Number(e.target.value) })}
                  min={0}
                  max={60}
                  className="w-16 bg-zinc-800 text-white rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-zinc-600"
                />
                <span className="text-zinc-500 text-xs">s</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-sm font-medium">Countdown</p>
                <p className="text-zinc-500 text-xs">Before game starts (0 to skip)</p>
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={game.countdownSeconds}
                  onChange={(e) => save({ countdownSeconds: Number(e.target.value) })}
                  min={0}
                  max={10}
                  className="w-16 bg-zinc-800 text-white rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-zinc-600"
                />
                <span className="text-zinc-500 text-xs">s</span>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-white text-sm font-medium">When Time Runs Out</p>
              <div className="flex gap-2">
                <button
                  onClick={() => save({ timeoutBehavior: 'skip' })}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    game.timeoutBehavior === 'skip'
                      ? 'bg-green-500 text-black'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  Skip to Next
                </button>
                <button
                  onClick={() => save({ timeoutBehavior: 'pause' })}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    game.timeoutBehavior === 'pause'
                      ? 'bg-green-500 text-black'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  Pause Game
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Non-host settings summary */}
        {!isHost && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-2 text-sm">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-3">Settings</h2>
            <div className="flex justify-between text-zinc-300">
              <span>Default time</span><span className="font-mono">{formatSeconds(game.defaultTimeSeconds)}</span>
            </div>
            <div className="flex justify-between text-zinc-300">
              <span>Buffer</span><span className="font-mono">{formatSeconds(game.bufferSeconds)}</span>
            </div>
            <div className="flex justify-between text-zinc-300">
              <span>Countdown</span><span className="font-mono">{game.countdownSeconds > 0 ? formatSeconds(game.countdownSeconds) : 'Off'}</span>
            </div>
            <div className="flex justify-between text-zinc-300">
              <span>On timeout</span><span className="capitalize">{game.timeoutBehavior}</span>
            </div>
          </div>
        )}

        {/* Waiting / Start */}
        {!isHost && (
          <div className="bg-zinc-900 border border-dashed border-zinc-700 rounded-2xl p-6 text-center text-zinc-400 text-sm">
            Waiting for host to start the game…
          </div>
        )}

        {isHost && (
          <button
            onClick={handleStart}
            disabled={starting || game.players.length === 0}
            className="w-full bg-green-500 hover:bg-green-400 active:bg-green-600 disabled:bg-zinc-700 disabled:text-zinc-500 text-black font-bold text-xl rounded-2xl py-5 transition-colors"
          >
            {starting ? 'Starting…' : 'Start Game'}
          </button>
        )}

        <div className="pb-6" />
      </div>
    </div>
  );
}
