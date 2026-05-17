'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import type { GameState } from '@/lib/types';

interface Props {
  game: GameState;
  myPlayerId: string;
}

function formatTime(ms: number): string {
  const totalMs = Math.max(0, ms);
  const totalSeconds = Math.ceil(totalMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function playBuzzer() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(60, ctx.currentTime + 0.8);
    gain.gain.setValueAtTime(0.6, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.0);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 1.0);
  } catch { /* ignore - autoplay blocked */ }
}

export default function GameView({ game, myPlayerId }: Props) {
  const [displayMs, setDisplayMs] = useState<number>(0);
  const [phaseMs, setPhaseMs] = useState<number>(0);
  const timeoutCalled = useRef(false);
  const startNextCalled = useRef(false);
  const buzzerPlayed = useRef(false);

  const myPlayer = game.players.find((p) => p.id === myPlayerId);
  const currentPlayer = game.players[game.currentPlayerIndex];
  const isMyTurn = currentPlayer?.id === myPlayerId;
  const myIndex = game.players.findIndex((p) => p.id === myPlayerId);

  // Reset one-shot refs when the current player changes or status changes
  useEffect(() => {
    timeoutCalled.current = false;
    buzzerPlayed.current = false;
  }, [game.currentPlayerIndex, game.status]);

  useEffect(() => {
    startNextCalled.current = false;
  }, [game.status]);

  // Timer tick
  useEffect(() => {
    if (game.status === 'playing' && game.turnStartedAt) {
      const tick = () => {
        const elapsed = Date.now() - game.turnStartedAt!;
        const remaining = isMyTurn
          ? Math.max(0, (myPlayer?.timeRemainingMs ?? 0) - elapsed)
          : (myPlayer?.timeRemainingMs ?? 0);
        setDisplayMs(remaining);
      };
      tick();
      const id = setInterval(tick, 100);
      return () => clearInterval(id);
    } else if (game.status === 'paused') {
      setDisplayMs(
        isMyTurn
          ? (game.pausedTimeRemainingMs ?? myPlayer?.timeRemainingMs ?? 0)
          : (myPlayer?.timeRemainingMs ?? 0)
      );
    } else {
      setDisplayMs(myPlayer?.timeRemainingMs ?? 0);
    }
  }, [game.status, game.turnStartedAt, game.currentPlayerIndex, game.pausedTimeRemainingMs, isMyTurn, myPlayer]);

  // Buzzer + timeout when my timer hits 0
  useEffect(() => {
    if (game.status !== 'playing' || !isMyTurn) return;
    if (displayMs <= 0 && !buzzerPlayed.current) {
      buzzerPlayed.current = true;
      playBuzzer();
    }
    if (displayMs <= 0 && !timeoutCalled.current) {
      timeoutCalled.current = true;
      fetch(`/api/game/${game.id}/timeout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: myPlayerId }),
      });
    }
  }, [displayMs, game.status, isMyTurn, game.id, myPlayerId]);

  // Phase countdown (buffer / countdown)
  useEffect(() => {
    if ((game.status === 'buffer' || game.status === 'countdown') && game.phaseStartedAt && game.phaseDurationMs) {
      const tick = () => {
        const elapsed = Date.now() - game.phaseStartedAt!;
        const remaining = Math.max(0, game.phaseDurationMs! - elapsed);
        setPhaseMs(remaining);
        if (remaining <= 0 && !startNextCalled.current) {
          startNextCalled.current = true;
          fetch(`/api/game/${game.id}/start-next`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playerId: myPlayerId }),
          });
        }
      };
      tick();
      const id = setInterval(tick, 100);
      return () => clearInterval(id);
    }
  }, [game.status, game.phaseStartedAt, game.phaseDurationMs, game.id, myPlayerId]);

  async function handleEndTurn() {
    if (!isMyTurn || game.status !== 'playing') return;
    await fetch(`/api/game/${game.id}/turn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId: myPlayerId }),
    });
  }

  async function handlePause() {
    await fetch(`/api/game/${game.id}/pause`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'pause' }),
    });
  }

  async function handleResume() {
    await fetch(`/api/game/${game.id}/pause`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'resume' }),
    });
  }

  async function handleCancel() {
    await fetch(`/api/game/${game.id}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId: myPlayerId }),
    });
  }

  const myTimedOut = myPlayer?.timedOut ?? false;
  const isRedState = isMyTurn && (myTimedOut || displayMs <= 0) && game.status === 'playing';

  if (game.status === 'finished') {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-6 gap-8">
        <div className="text-center space-y-2">
          <p className="text-6xl">🏁</p>
          <h1 className="text-3xl font-black text-white">Game Over</h1>
        </div>
        <div className="w-full max-w-sm space-y-2">
          {[...game.players].sort((a, b) => a.order - b.order).map((p, i) => (
            <div key={p.id} className={`flex justify-between items-center bg-zinc-900 border rounded-xl px-4 py-3 ${p.id === myPlayerId ? 'border-green-700' : 'border-zinc-800'}`}>
              <span className="text-zinc-400 text-sm mr-3">{i + 1}</span>
              <span className="text-white flex-1">{p.name}{p.id === myPlayerId ? ' (you)' : ''}</span>
              <span className={`font-mono text-sm ${p.timedOut ? 'text-red-400' : 'text-green-400'}`}>
                {p.timedOut ? 'Time out' : formatTime(p.timeRemainingMs)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${isRedState ? 'bg-red-950' : 'bg-zinc-950'}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div>
          <p className="text-zinc-500 text-xs uppercase tracking-widest">Your Time</p>
          <p className="text-white font-medium text-sm truncate max-w-[160px]">
            {myPlayer?.name ?? '—'}
          </p>
        </div>
        {game.status === 'playing' && (
          <button
            onClick={handlePause}
            className="bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            ⏸ Pause
          </button>
        )}
      </div>

      {/* My timer */}
      <div className="flex-none px-5 pb-4">
        <div className={`text-center py-4 rounded-2xl ${isRedState ? 'bg-red-900/40' : 'bg-zinc-900'}`}>
          <p className={`font-mono font-black leading-none ${isRedState ? 'text-red-300' : 'text-white'}`}
             style={{ fontSize: 'clamp(3rem, 18vw, 6rem)' }}>
            {formatTime(displayMs)}
          </p>
          {myTimedOut && (
            <p className="text-red-400 font-bold text-sm mt-1 uppercase tracking-wider">Time&apos;s Up!</p>
          )}
        </div>
      </div>

      {/* Turn order strip */}
      <div className="px-5 pb-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[...game.players].sort((a, b) => a.order - b.order).map((p, i) => (
            <div key={p.id} className={`shrink-0 rounded-xl px-3 py-2 text-xs font-medium border ${
              p.id === currentPlayer?.id
                ? 'bg-green-500/20 border-green-500 text-green-300'
                : p.timedOut
                  ? 'bg-zinc-900 border-zinc-700 text-zinc-600 line-through'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400'
            }`}>
              <span className="text-zinc-500 mr-1">{i + 1}.</span>
              {p.name}
              {p.id === myPlayerId && <span className="text-zinc-600 ml-1 text-[10px]">(you)</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Main action area */}
      <div className="flex-1 px-4 pb-6 flex flex-col">
        {/* Buffer state */}
        {game.status === 'buffer' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <p className="text-zinc-400 text-sm uppercase tracking-widest">Next Up</p>
            <p className="text-white text-3xl font-bold">{currentPlayer?.name}</p>
            <p className="text-zinc-300 font-mono text-6xl font-black">{Math.ceil(phaseMs / 1000)}</p>
          </div>
        )}

        {/* Countdown state */}
        {game.status === 'countdown' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <p className="text-zinc-400 text-sm uppercase tracking-widest">Starting In</p>
            <p className="text-white font-mono font-black leading-none" style={{ fontSize: 'clamp(5rem, 30vw, 10rem)' }}>
              {phaseMs > 0 ? Math.ceil(phaseMs / 1000) : 'GO!'}
            </p>
          </div>
        )}

        {/* Playing state */}
        {game.status === 'playing' && (
          <button
            onClick={handleEndTurn}
            disabled={!isMyTurn || myTimedOut}
            className={`flex-1 rounded-3xl font-black text-3xl transition-all active:scale-95 select-none ${
              isMyTurn && !myTimedOut
                ? 'bg-green-500 hover:bg-green-400 active:bg-green-600 text-black shadow-lg shadow-green-900/50'
                : myTimedOut && isMyTurn
                  ? 'bg-red-800 text-red-300 cursor-not-allowed'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-600 cursor-not-allowed'
            }`}
            style={{ minHeight: '200px' }}
          >
            {isMyTurn && !myTimedOut && 'END TURN'}
            {isMyTurn && myTimedOut && "TIME'S UP"}
            {!isMyTurn && (
              <span className="text-xl">
                Waiting for<br />
                <span className="text-zinc-400">{currentPlayer?.name}</span>
              </span>
            )}
          </button>
        )}
      </div>

      {/* Pause overlay */}
      {game.status === 'paused' && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-6 z-50 px-6">
          <div className="text-center space-y-2">
            <p className="text-5xl">⏸</p>
            <h2 className="text-3xl font-black text-white">Paused</h2>
            <p className="text-zinc-400">
              {currentPlayer?.name}&apos;s turn — {formatTime(game.pausedTimeRemainingMs ?? 0)} remaining
            </p>
          </div>
          <div className="w-full max-w-xs space-y-3">
            <button
              onClick={handleResume}
              className="w-full bg-green-500 hover:bg-green-400 active:bg-green-600 text-black font-bold text-xl rounded-2xl py-4 transition-colors"
            >
              Resume Game
            </button>
            <button
              onClick={handleCancel}
              className="w-full bg-transparent border border-zinc-600 hover:border-zinc-400 text-zinc-300 font-medium text-lg rounded-2xl py-3 transition-colors"
            >
              Cancel to Settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
