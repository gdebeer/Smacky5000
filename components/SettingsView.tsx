'use client';
import { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { GameState, PlayerState } from '@/lib/types';

interface Props {
  game: GameState;
  myPlayerId: string;
}

function msToSeconds(ms: number) { return Math.round(ms / 1000); }

function DragHandle() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', padding: '4px 6px', cursor: 'grab', touchAction: 'none' }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ width: '18px', height: '2px', background: 'var(--show-ink-3)', borderRadius: '1px' }} />
      ))}
    </div>
  );
}

interface PlayerRowProps {
  player: PlayerState;
  index: number;
  isHost: boolean;
  myPlayerId: string;
  onNameChange: (id: string, name: string) => void;
  onTimeChange: (id: string, seconds: number) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}

function SortablePlayerRow({ player, index, isHost, myPlayerId, onNameChange, onTimeChange, onRemove, canRemove }: PlayerRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: player.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, padding: '10px 12px', boxShadow: player.id === myPlayerId ? 'var(--show-shadow-sm)' : 'none' }}
      className="show-card show-bord-1"
    >
      <div className="flex items-center gap-2">
        {/* Drag handle — host only, only when 2+ players */}
        {isHost && canRemove ? (
          <div {...attributes} {...listeners} style={{ touchAction: 'none', flexShrink: 0 }}>
            <DragHandle />
          </div>
        ) : (
          <span className="font-mono text-sm font-bold" style={{ color: 'var(--show-ink-3)', width: '28px', flexShrink: 0, textAlign: 'center' }}>{index + 1}</span>
        )}

        {/* Name */}
        {isHost ? (
          <input
            type="text"
            value={player.name}
            onChange={(e) => onNameChange(player.id, e.target.value)}
            onBlur={(e) => onNameChange(player.id, e.target.value.trim() || player.name)}
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

        {/* Time */}
        <div className="flex items-center gap-1 shrink-0">
          {isHost ? (
            <>
              <input
                type="number"
                value={msToSeconds(player.allocatedTimeMs)}
                onChange={(e) => onTimeChange(player.id, Number(e.target.value))}
                min={5} max={3600}
                className="show-input text-right font-mono"
                style={{ width: '60px', padding: '6px 8px', fontSize: '14px' }}
              />
              <span className="show-caps">s</span>
            </>
          ) : (
            <span className="font-mono text-sm font-bold" style={{ color: 'var(--show-ink-2)' }}>{msToSeconds(player.allocatedTimeMs)}s</span>
          )}
        </div>

        {/* Remove */}
        {isHost && canRemove && (
          <button
            onClick={() => onRemove(player.id)}
            className="show-btn shrink-0"
            style={{ width: '36px', height: '36px', padding: 0, fontSize: '20px', color: 'var(--show-ink-3)', lineHeight: 1 }}
          >×</button>
        )}
      </div>
    </div>
  );
}

export default function SettingsView({ game, myPlayerId }: Props) {
  const isHost = game.hostId === myPlayerId;
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);
  const [copied, setCopied] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 5 } }),
  );

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

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = game.players.findIndex((p) => p.id === active.id);
    const newIndex = game.players.findIndex((p) => p.id === over.id);
    const reordered = arrayMove(game.players, oldIndex, newIndex).map((p, i) => ({ ...p, order: i }));
    save({ players: reordered });
  }

  function updatePlayerTime(playerId: string, seconds: number) {
    const ms = Math.max(5, seconds) * 1000;
    save({ players: game.players.map((p) => p.id === playerId ? { ...p, allocatedTimeMs: ms, timeRemainingMs: ms } : p) });
  }

  function updatePlayerName(playerId: string, name: string) {
    save({ players: game.players.map((p) => p.id === playerId ? { ...p, name } : p) });
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
    <div className="min-h-screen px-4 py-6 space-y-5">
      <div className="max-w-lg mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: 'var(--show-ink)', letterSpacing: '0.04em', fontWeight: 900, lineHeight: 1 }}>
              SMACKY <span style={{ color: 'var(--show-accent)', textShadow: '0 0 14px rgba(0,196,232,.4)' }}>5000</span>
            </h1>
            <span className="show-caps" style={{ marginTop: '4px', display: 'block' }}>Game Setup</span>
          </div>
          <div className="text-right">
            <span className="show-caps">Code</span>
            <p className="font-mono font-black text-2xl mt-0.5" style={{ color: 'var(--show-accent)', letterSpacing: '0.15em', textShadow: '0 0 12px rgba(0,196,232,.35)' }}>{game.id}</p>
          </div>
        </div>

        {/* Share */}
        <button onClick={copyLink} className="show-btn show-btn-ghost w-full text-left" style={{ padding: '10px 14px' }}>
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

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={game.players.map((p) => p.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {game.players.map((player, index) => (
                  <SortablePlayerRow
                    key={player.id}
                    player={player}
                    index={index}
                    isHost={isHost}
                    myPlayerId={myPlayerId}
                    onNameChange={updatePlayerName}
                    onTimeChange={updatePlayerTime}
                    onRemove={removePlayer}
                    canRemove={game.players.length > 1}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
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
