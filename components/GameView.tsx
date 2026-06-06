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
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const timeoutCalled = useRef(false);
  const startNextCalled = useRef(false);
  const buzzerPlayed = useRef(false);

  const myPlayer = game.players.find((p) => p.id === myPlayerId);
  const currentPlayer = game.players[game.currentPlayerIndex];
  const isMyTurn = currentPlayer?.id === myPlayerId;
  const myTimedOut = myPlayer?.timedOut ?? false;
  const isWarnState = isMyTurn && (myTimedOut || displayMs <= 0) && game.status === 'playing';
  const myColor = myPlayer?.color ?? '#00c4e8';
  const currentColor = currentPlayer?.color ?? '#00c4e8';
  const isLowTime = isMyTurn && displayMs > 0 && displayMs < 10000 && game.status === 'playing';

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

  function handlePointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    if (!isMyTurn || myTimedOut || game.status !== 'playing') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const id = Date.now();
    setRipples((r) => [...r, { id, x: e.clientX - rect.left, y: e.clientY - rect.top }]);
    setTimeout(() => setRipples((r) => r.filter((rp) => rp.id !== id)), 700);
  }

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
      <div className="min-h-screen flex flex-col items-center justify-center px-6 gap-8">
        <div>
          <div className="show-sticker mb-3" style={{ display: 'inline-flex' }}>Game Over</div>
          <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: '2.2rem', color: 'var(--show-ink)', letterSpacing: '-0.02em', fontWeight: 900 }}>
            Final Times
          </h1>
        </div>
        <div className="w-full max-w-sm space-y-2">
          {[...game.players].sort((a, b) => a.order - b.order).map((p, i) => (
            <div key={p.id} className="show-card flex items-center gap-3" style={{ padding: '12px 16px', borderLeftColor: p.color, borderLeftWidth: 3 }}>
              <span className="font-mono font-bold text-sm w-5" style={{ color: 'var(--show-ink-3)' }}>{i + 1}</span>
              <span className="flex-1 font-semibold" style={{ color: 'var(--show-ink)' }}>
                {p.name}{p.id === myPlayerId ? <span className="show-caps ml-2">you</span> : ''}
              </span>
              <span className="font-mono font-bold text-sm" style={{
                color: p.timedOut ? 'var(--show-warn)' : 'var(--show-good)',
              }}>
                {p.timedOut ? 'OUT' : formatTime(p.timeRemainingMs)}
              </span>
            </div>
          ))}
        </div>
        <a href="/" className="show-btn show-btn-ink" style={{ padding: '10px 24px' }}>← Home</a>
      </div>
    );
  }

  // ── Main game screen ──────────────────────────────────────────────
  return (
    <div className={`min-h-screen flex flex-col ${isWarnState ? 'g-warn-bg' : ''}`}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-6 pb-3" style={{ borderBottom: '1px solid var(--show-line)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: myColor, boxShadow: `0 0 8px ${myColor}` }} />
          <div>
            <span className="show-caps">Your time</span>
            <p className="font-bold text-sm mt-0.5 truncate max-w-[160px]" style={{ color: 'var(--show-ink)' }}>
              {myPlayer?.name ?? '—'}
            </p>
          </div>
        </div>
        {(game.status === 'playing' || game.status === 'buffer') && (
          <button onClick={handlePause} className="show-btn show-btn-ink" style={{ padding: '7px 14px', fontSize: '12px' }}>
            ⏸ Pause
          </button>
        )}
      </div>

      {/* Timer */}
      <div className="flex-none px-4 pt-4 pb-3">
        <div
          className="show-card"
          style={{
            padding: '20px 16px',
            textAlign: 'center',
            borderColor: isWarnState
              ? 'rgba(255,71,87,.3)'
              : isMyTurn && game.status === 'playing'
              ? `${myColor}50`
              : 'var(--show-line)',
            boxShadow: isMyTurn && game.status === 'playing' && !isWarnState
              ? `0 0 24px ${myColor}14, inset 0 0 24px ${myColor}06`
              : 'none',
          }}
        >
          <p
            className={`font-mono font-black leading-none tabular-nums ${
              isWarnState ? 'g-timer-warn' : isMyTurn && game.status === 'playing' ? (isLowTime ? 'timer-pulse' : '') : 'g-timer-dim'
            }`}
            style={{
              fontSize: 'clamp(3.5rem, 20vw, 7rem)',
              color: isWarnState
                ? 'var(--show-warn)'
                : isMyTurn && game.status === 'playing'
                ? myColor
                : 'var(--show-ink-3)',
              textShadow: isMyTurn && game.status === 'playing' && !isWarnState
                ? `0 0 20px ${myColor}60, 0 0 60px ${myColor}20`
                : undefined,
            }}
          >
            {formatTime(displayMs)}
          </p>
          {myTimedOut && (
            <p className="show-caps mt-1" style={{ color: 'var(--show-warn)' }}>Time&apos;s up!</p>
          )}
        </div>
      </div>

      {/* Player strip */}
      <div className="px-4 pb-3">
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {[...game.players].sort((a, b) => a.order - b.order).map((p) => {
            const isActive = p.id === currentPlayer?.id;
            return (
              <div
                key={p.id}
                className={`show-tag shrink-0 ${p.timedOut ? 'done' : ''}`}
                style={isActive ? {
                  background: `${p.color}20`,
                  borderColor: `${p.color}80`,
                  color: p.color,
                  boxShadow: `0 0 10px ${p.color}30`,
                } : {}}
              >
                {p.name}{p.id === myPlayerId ? ' ·you' : ''}
              </div>
            );
          })}
        </div>
      </div>

      {/* Action area */}
      <div className="flex-1 flex flex-col px-4 pb-6" style={{ minHeight: '200px' }}>

        {/* Countdown */}
        {game.status === 'countdown' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-2">
            <span className="show-caps">Starting in</span>
            <p
              key={phaseMs > 0 ? Math.ceil(phaseMs / 1000) : 'go'}
              className="font-mono font-black leading-none count-pop"
              style={{
                fontSize: 'clamp(5rem, 35vmin, 9rem)',
                color: 'var(--show-accent)',
                textShadow: '0 0 30px rgba(0,196,232,.4)',
              }}
            >
              {phaseMs > 0 ? Math.ceil(phaseMs / 1000) : 'GO!'}
            </p>
          </div>
        )}

        {/* Buffer */}
        {game.status === 'buffer' && (
          <div key={game.currentPlayerIndex} className="flex-1 flex flex-col items-center justify-center gap-3 bloom-in">
            <span className="show-caps">Next up</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: currentColor, boxShadow: `0 0 10px ${currentColor}` }} />
              <p className="font-bold text-2xl" style={{ color: 'var(--show-ink)' }}>{currentPlayer?.name}</p>
            </div>
            <p
              key={Math.ceil(phaseMs / 1000)}
              className="font-mono font-black leading-none count-pop"
              style={{
                fontSize: 'clamp(4rem, 25vmin, 8rem)',
                color: currentColor,
                textShadow: `0 0 30px ${currentColor}60`,
              }}
            >
              {Math.ceil(phaseMs / 1000)}
            </p>
          </div>
        )}

        {/* Playing */}
        {game.status === 'playing' && (
          <button
            onPointerDown={handlePointerDown}
            onClick={handleEndTurn}
            disabled={!isMyTurn || myTimedOut}
            className={`show-action-btn ${!isMyTurn ? 'waiting' : ''} ${myTimedOut && isMyTurn ? 'timed-out' : ''}`}
            style={{
              minHeight: '200px',
              ...(isMyTurn && !myTimedOut ? {
                borderColor: `${myColor}55`,
                color: myColor,
                boxShadow: `0 0 40px ${myColor}12, inset 0 0 40px ${myColor}06`,
              } : {}),
            }}
          >
            {/* Ripple effects */}
            {ripples.map((rp) => (
              <span
                key={rp.id}
                className="ripple-dot"
                style={{ left: rp.x, top: rp.y, background: myColor }}
              />
            ))}

            {isMyTurn && !myTimedOut && (
              <span style={{ fontSize: 'clamp(1.6rem, 9vw, 2.8rem)', fontWeight: 900, letterSpacing: '0.1em', position: 'relative' }}>
                END TURN
              </span>
            )}
            {isMyTurn && myTimedOut && (
              <span style={{ fontSize: '1.4rem', fontWeight: 900, letterSpacing: '0.08em' }}>TIME&apos;S UP</span>
            )}
            {!isMyTurn && (
              <div style={{ textAlign: 'center' }}>
                <p className="show-caps mb-2">Waiting for</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: currentColor, boxShadow: `0 0 8px ${currentColor}` }} />
                  <p style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--show-ink-2)' }}>{currentPlayer?.name}</p>
                </div>
              </div>
            )}
          </button>
        )}
      </div>

      {/* Pause overlay */}
      {game.status === 'paused' && (
        <div className="fixed inset-0 flex flex-col items-center justify-center gap-8 z-50 px-6" style={{ background: 'rgba(4,4,8,0.88)', backdropFilter: 'blur(10px)' }}>
          <div className="show-card show-shadow" style={{ padding: '32px 24px', width: '100%', maxWidth: '340px' }}>
            <div className="show-sticker mb-4" style={{ display: 'inline-flex' }}>⏸ Paused</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: currentColor, boxShadow: `0 0 8px ${currentColor}` }} />
              <p className="font-semibold text-sm" style={{ color: 'var(--show-ink-2)' }}>
                {currentPlayer?.name}&apos;s turn · {formatTime(game.pausedTimeRemainingMs ?? 0)} left
              </p>
            </div>
            <div className="space-y-3">
              <button onClick={handleResume} className="show-btn show-btn-primary w-full" style={{ padding: '14px', fontSize: '0.95rem' }}>
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
