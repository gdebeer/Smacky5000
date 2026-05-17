'use client';
import { useState, useEffect, useRef } from 'react';
import type { GameState } from '@/lib/types';

interface Props {
  game: GameState;
  myPlayerId: string;
  clockOffset?: number;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.ceil(Math.max(0, ms) / 1000);
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
  } catch { /* autoplay blocked */ }
}

export default function GameView({ game, myPlayerId, clockOffset = 0 }: Props) {
  const now = () => Date.now() + clockOffset;
  const [displayMs, setDisplayMs] = useState(0);
  const [phaseMs, setPhaseMs] = useState(0);
  const timeoutCalled = useRef(false);
  const startNextCalled = useRef(false);
  const buzzerPlayed = useRef(false);

  const myPlayer = game.players.find((p) => p.id === myPlayerId);
  const currentPlayer = game.players[game.currentPlayerIndex];
  const isMyTurn = currentPlayer?.id === myPlayerId;
  const myTimedOut = myPlayer?.timedOut ?? false;
  const isRedState = isMyTurn && (myTimedOut || displayMs <= 0) && game.status === 'playing';

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
        const elapsed = now() - game.turnStartedAt!;
        setDisplayMs(isMyTurn ? Math.max(0, (myPlayer?.timeRemainingMs ?? 0) - elapsed) : (myPlayer?.timeRemainingMs ?? 0));
      };
      tick();
      const id = setInterval(tick, 100);
      return () => clearInterval(id);
    } else if (game.status === 'paused') {
      setDisplayMs(isMyTurn ? (game.pausedTimeRemainingMs ?? myPlayer?.timeRemainingMs ?? 0) : (myPlayer?.timeRemainingMs ?? 0));
    } else {
      setDisplayMs(myPlayer?.timeRemainingMs ?? 0);
    }
  }, [game.status, game.turnStartedAt, game.currentPlayerIndex, game.pausedTimeRemainingMs, isMyTurn, myPlayer]);

  // Buzzer + timeout
  useEffect(() => {
    if (game.status !== 'playing' || !isMyTurn) return;
    if (displayMs <= 0 && !buzzerPlayed.current) { buzzerPlayed.current = true; playBuzzer(); }
    if (displayMs <= 0 && !timeoutCalled.current) {
      timeoutCalled.current = true;
      fetch(`/api/game/${game.id}/timeout`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId: myPlayerId }) });
    }
  }, [displayMs, game.status, isMyTurn, game.id, myPlayerId]);

  // Phase countdown
  useEffect(() => {
    if ((game.status === 'buffer' || game.status === 'countdown') && game.phaseStartedAt && game.phaseDurationMs) {
      const tick = () => {
        const remaining = Math.max(0, game.phaseDurationMs! - (now() - game.phaseStartedAt!));
        setPhaseMs(remaining);
        if (remaining <= 0 && !startNextCalled.current) {
          startNextCalled.current = true;
          fetch(`/api/game/${game.id}/start-next`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId: myPlayerId }) });
        }
      };
      tick();
      const id = setInterval(tick, 100);
      return () => clearInterval(id);
    }
  }, [game.status, game.phaseStartedAt, game.phaseDurationMs, game.id, myPlayerId]);

  async function handleEndTurn() {
    if (!isMyTurn || game.status !== 'playing') return;
    await fetch(`/api/game/${game.id}/turn`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId: myPlayerId }) });
  }
  async function handlePause() {
    await fetch(`/api/game/${game.id}/pause`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'pause' }) });
  }
  async function handleResume() {
    await fetch(`/api/game/${game.id}/pause`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'resume' }) });
  }
  async function handleCancel() {
    await fetch(`/api/game/${game.id}/cancel`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId: myPlayerId }) });
  }

  // ── Finished screen ──────────────────────────────────────────────────
  if (game.status === 'finished') {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-6 gap-8">
        <div className="text-center space-y-3">
          <div className="w-20 h-20 rounded-full bg-zinc-800 flex items-center justify-center text-4xl mx-auto">🏁</div>
          <h1 className="text-3xl font-black text-white tracking-tight">Game Over</h1>
        </div>
        <div className="w-full max-w-sm space-y-2">
          {[...game.players].sort((a, b) => a.order - b.order).map((p, i) => (
            <div key={p.id} className={`flex items-center gap-3 rounded-2xl px-4 py-3 border ${p.id === myPlayerId ? 'bg-zinc-900 border-white/10' : 'bg-zinc-900/50 border-transparent'}`}>
              <span className="text-zinc-600 text-sm font-mono w-4">{i + 1}</span>
              <span className="text-white flex-1 font-medium">{p.name}{p.id === myPlayerId ? <span className="text-zinc-500 text-xs ml-2">you</span> : ''}</span>
              <span className={`font-mono text-sm font-bold ${p.timedOut ? 'text-red-400' : 'text-emerald-400'}`}>
                {p.timedOut ? 'Out' : formatTime(p.timeRemainingMs)}
              </span>
            </div>
          ))}
        </div>
        <a href="/" className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors">← Back to home</a>
      </div>
    );
  }

  // ── Main game screen ─────────────────────────────────────────────────
  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-500 ${isRedState ? 'bg-red-950' : 'bg-zinc-950'}`}>

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-8 pb-2">
        <div>
          <p className="text-zinc-600 text-[11px] uppercase tracking-widest mb-0.5">Your time</p>
          <p className="text-white font-semibold text-base truncate max-w-[180px]">{myPlayer?.name ?? '—'}</p>
        </div>
        {(game.status === 'playing' || game.status === 'buffer') && (
          <button
            onClick={handlePause}
            className="w-10 h-10 rounded-full bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-white flex items-center justify-center transition-colors text-base"
          >
            ⏸
          </button>
        )}
      </div>

      {/* Timer */}
      <div className="flex-none px-5 pt-2 pb-3 text-center">
        <p
          className={`font-mono font-black leading-none tabular-nums transition-colors duration-300 ${
            isRedState ? 'text-red-300' : isMyTurn && game.status === 'playing' ? 'text-white' : 'text-zinc-500'
          }`}
          style={{ fontSize: 'clamp(3.5rem, 20vw, 6.5rem)', textShadow: isMyTurn && !isRedState && game.status === 'playing' ? '0 0 40px rgba(255,255,255,0.15)' : 'none' }}
        >
          {formatTime(displayMs)}
        </p>
        {myTimedOut && (
          <p className="text-red-400 text-xs font-bold uppercase tracking-widest mt-1">Time&apos;s up</p>
        )}
      </div>

      {/* Player order strip */}
      <div className="px-5 pb-4">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {[...game.players].sort((a, b) => a.order - b.order).map((p) => (
            <div key={p.id} className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
              p.id === currentPlayer?.id
                ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300'
                : p.timedOut
                  ? 'bg-transparent border-zinc-800 text-zinc-700 line-through'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-500'
            }`}>
              {p.name}{p.id === myPlayerId ? ' ·you' : ''}
            </div>
          ))}
        </div>
      </div>

      {/* Action area */}
      <div className="flex-1 flex items-center justify-center px-6 pb-10">

        {/* Countdown */}
        {game.status === 'countdown' && (
          <div className="text-center space-y-3">
            <p className="text-zinc-500 text-xs uppercase tracking-widest">Starting in</p>
            <p className="text-white font-black font-mono leading-none" style={{ fontSize: 'clamp(5rem, 35vmin, 9rem)' }}>
              {phaseMs > 0 ? Math.ceil(phaseMs / 1000) : 'GO!'}
            </p>
          </div>
        )}

        {/* Buffer */}
        {game.status === 'buffer' && (
          <div className="text-center space-y-2">
            <p className="text-zinc-500 text-xs uppercase tracking-widest">Next up</p>
            <p className="text-white text-2xl font-bold">{currentPlayer?.name}</p>
            <p className="text-zinc-300 font-mono font-black" style={{ fontSize: 'clamp(4rem, 25vmin, 8rem)' }}>
              {Math.ceil(phaseMs / 1000)}
            </p>
          </div>
        )}

        {/* Playing — big round button */}
        {game.status === 'playing' && (
          <button
            onClick={handleEndTurn}
            disabled={!isMyTurn || myTimedOut}
            style={{
              width: 'min(70vmin, 280px)',
              height: 'min(70vmin, 280px)',
              boxShadow: isMyTurn && !myTimedOut
                ? '0 0 0 2px rgba(52,211,153,0.3), 0 0 80px rgba(52,211,153,0.25), 0 20px 60px rgba(0,0,0,0.5)'
                : 'none',
            }}
            className={`rounded-full font-black text-2xl leading-tight transition-all duration-150 active:scale-95 select-none flex flex-col items-center justify-center gap-1 ${
              isMyTurn && !myTimedOut
                ? 'bg-emerald-500 text-black'
                : myTimedOut && isMyTurn
                  ? 'bg-red-900 border-2 border-red-700 text-red-300 cursor-not-allowed'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-700 cursor-not-allowed'
            }`}
          >
            {isMyTurn && !myTimedOut && (
              <>
                <span className="text-3xl font-black tracking-tight">END</span>
                <span className="text-3xl font-black tracking-tight">TURN</span>
              </>
            )}
            {isMyTurn && myTimedOut && <span className="text-xl">TIME&apos;S UP</span>}
            {!isMyTurn && (
              <div className="text-center px-4">
                <p className="text-zinc-600 text-sm font-normal uppercase tracking-widest mb-1">Waiting for</p>
                <p className="text-zinc-400 text-xl font-bold">{currentPlayer?.name}</p>
              </div>
            )}
          </button>
        )}
      </div>

      {/* Pause overlay */}
      {game.status === 'paused' && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex flex-col items-center justify-center gap-8 z-50 px-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center text-2xl mx-auto mb-4">⏸</div>
            <h2 className="text-3xl font-black text-white tracking-tight">Paused</h2>
            <p className="text-zinc-400 text-sm">
              {currentPlayer?.name}&apos;s turn · {formatTime(game.pausedTimeRemainingMs ?? 0)} left
            </p>
          </div>
          <div className="w-full max-w-xs space-y-3">
            <button
              onClick={handleResume}
              className="w-full bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-black font-bold text-lg rounded-full py-4 transition-colors"
            >
              Resume Game
            </button>
            <button
              onClick={handleCancel}
              className="w-full border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-zinc-200 font-medium text-base rounded-full py-3 transition-colors"
            >
              Back to Settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
