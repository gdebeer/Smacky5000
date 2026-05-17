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
  const isWarnState = isMyTurn && (myTimedOut || displayMs <= 0) && game.status === 'playing';

  useEffect(() => { timeoutCalled.current = false; buzzerPlayed.current = false; }, [game.currentPlayerIndex, game.status]);
  useEffect(() => { startNextCalled.current = false; }, [game.status]);

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

  // ── Finished ─────────────────────────────────────────────────────
  if (game.status === 'finished') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 gap-8" style={{ background: 'var(--show-paper)' }}>
        <div>
          <div className="show-sticker mb-3" style={{ display: 'inline-flex' }}>Game Over</div>
          <h1 className="font-black" style={{ fontSize: '2.5rem', color: 'var(--show-ink)', letterSpacing: '-0.03em' }}>Final Times</h1>
        </div>
        <div className="w-full max-w-sm space-y-2">
          {[...game.players].sort((a, b) => a.order - b.order).map((p, i) => (
            <div key={p.id} className="show-card show-bord-1 flex items-center gap-3" style={{ padding: '12px 14px', boxShadow: p.id === myPlayerId ? 'var(--show-shadow-sm)' : 'none' }}>
              <span className="font-mono font-bold text-sm w-5" style={{ color: 'var(--show-ink-3)' }}>{i + 1}</span>
              <span className="flex-1 font-semibold" style={{ color: 'var(--show-ink)' }}>
                {p.name}{p.id === myPlayerId ? <span className="show-caps ml-2">you</span> : ''}
              </span>
              <span className="font-mono font-bold text-sm" style={{ color: p.timedOut ? 'var(--show-warn)' : 'var(--show-good)' }}>
                {p.timedOut ? 'Out' : formatTime(p.timeRemainingMs)}
              </span>
            </div>
          ))}
        </div>
        <a href="/" className="show-btn show-btn-ink" style={{ padding: '10px 20px' }}>← Home</a>
      </div>
    );
  }

  // ── Main game screen ──────────────────────────────────────────────
  const bgColor = isWarnState ? 'var(--show-warn)' : 'var(--show-paper)';

  return (
    <div className="min-h-screen flex flex-col" style={{ background: bgColor, transition: 'background 0.3s ease' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-6 pb-3" style={{ borderBottom: '1.5px solid var(--show-line)' }}>
        <div>
          <span className="show-caps">Your time</span>
          <p className="font-bold text-base mt-0.5 truncate max-w-[180px]" style={{ color: isWarnState ? '#fff' : 'var(--show-ink)' }}>
            {myPlayer?.name ?? '—'}
          </p>
        </div>
        {(game.status === 'playing' || game.status === 'buffer') && (
          <button onClick={handlePause} className="show-btn show-btn-ink" style={{ padding: '7px 12px', fontSize: '13px' }}>
            ⏸ Pause
          </button>
        )}
      </div>

      {/* Timer */}
      <div className="flex-none px-4 pt-4 pb-3">
        <div
          className="show-bord"
          style={{
            background: isWarnState ? 'rgba(0,0,0,0.15)' : 'var(--show-card)',
            boxShadow: isWarnState ? 'none' : 'var(--show-shadow)',
            padding: '16px',
            textAlign: 'center',
          }}
        >
          <p
            className="font-mono font-black leading-none tabular-nums"
            style={{
              fontSize: 'clamp(3.5rem, 20vw, 7rem)',
              color: isWarnState ? '#fff' : (isMyTurn && game.status === 'playing' ? 'var(--show-ink)' : 'var(--show-ink-3)'),
            }}
          >
            {formatTime(displayMs)}
          </p>
          {myTimedOut && (
            <p className="show-caps mt-1" style={{ color: isWarnState ? '#fff' : 'var(--show-warn)' }}>Time&apos;s up!</p>
          )}
        </div>
      </div>

      {/* Player strip */}
      <div className="px-4 pb-3">
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {[...game.players].sort((a, b) => a.order - b.order).map((p) => (
            <div
              key={p.id}
              className={`show-tag shrink-0 ${
                p.id === currentPlayer?.id ? 'active' : p.timedOut ? 'done' : 'muted'
              }`}
            >
              {p.name}{p.id === myPlayerId ? ' ·you' : ''}
            </div>
          ))}
        </div>
      </div>

      {/* Action area */}
      <div className="flex-1 flex flex-col px-4 pb-6" style={{ minHeight: '200px' }}>

        {/* Countdown */}
        {game.status === 'countdown' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-2">
            <span className="show-caps">Starting in</span>
            <p className="font-mono font-black leading-none" style={{ fontSize: 'clamp(5rem, 35vmin, 9rem)', color: 'var(--show-ink)' }}>
              {phaseMs > 0 ? Math.ceil(phaseMs / 1000) : 'GO!'}
            </p>
          </div>
        )}

        {/* Buffer */}
        {game.status === 'buffer' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-2">
            <span className="show-caps">Next up</span>
            <p className="font-bold text-2xl" style={{ color: 'var(--show-ink)' }}>{currentPlayer?.name}</p>
            <p className="font-mono font-black leading-none" style={{ fontSize: 'clamp(4rem, 25vmin, 8rem)', color: 'var(--show-accent)' }}>
              {Math.ceil(phaseMs / 1000)}
            </p>
          </div>
        )}

        {/* Playing */}
        {game.status === 'playing' && (
          <button
            onClick={handleEndTurn}
            disabled={!isMyTurn || myTimedOut}
            className={`show-action-btn ${!isMyTurn ? 'waiting' : ''} ${myTimedOut && isMyTurn ? 'timed-out' : ''}`}
            style={{ minHeight: '200px' }}
          >
            {isMyTurn && !myTimedOut && (
              <span style={{ fontSize: 'clamp(1.8rem, 10vw, 3rem)', fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--show-ink)' }}>
                END TURN
              </span>
            )}
            {isMyTurn && myTimedOut && (
              <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff' }}>TIME&apos;S UP</span>
            )}
            {!isMyTurn && (
              <div style={{ textAlign: 'center' }}>
                <p className="show-caps mb-1">Waiting for</p>
                <p style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--show-ink-2)' }}>{currentPlayer?.name}</p>
              </div>
            )}
          </button>
        )}
      </div>

      {/* Pause overlay */}
      {game.status === 'paused' && (
        <div className="fixed inset-0 flex flex-col items-center justify-center gap-8 z-50 px-6" style={{ background: 'rgba(21,22,26,0.85)', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'var(--show-paper)', border: '3px solid var(--show-ink)', boxShadow: 'var(--show-shadow-lg)', padding: '32px 24px', width: '100%', maxWidth: '340px' }}>
            <div className="show-sticker mb-4" style={{ display: 'inline-flex' }}>⏸ Paused</div>
            <p className="font-semibold text-sm mb-6" style={{ color: 'var(--show-ink-2)' }}>
              {currentPlayer?.name}&apos;s turn · {formatTime(game.pausedTimeRemainingMs ?? 0)} left
            </p>
            <div className="space-y-3">
              <button onClick={handleResume} className="show-btn show-btn-primary w-full" style={{ padding: '14px', fontSize: '1rem', boxShadow: 'var(--show-shadow)' }}>
                Resume Game
              </button>
              <button onClick={handleCancel} className="show-btn w-full" style={{ padding: '12px' }}>
                Back to Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
