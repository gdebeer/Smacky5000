'use client';
import { useState, useCallback, useRef, useEffect } from 'react';
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
import { PLAYER_COLORS } from '@/lib/colors';

interface Props {
  game: GameState;
  myPlayerId: string;
}

function msToSeconds(ms: number) { return Math.round(ms / 1000); }

function DragHandle() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '6px 8px', cursor: 'grab', touchAction: 'none', flexShrink: 0 }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ width: '16px', height: '2px', background: 'var(--show-ink-3)', borderRadius: '2px' }} />
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
  onColorChange: (targetId: string, color: string) => void;
  canRemove: boolean;
  colorPickerOpen: boolean;
  onToggleColorPicker: () => void;
  isNew: boolean;
}

function SortablePlayerRow({
  player, index, isHost, myPlayerId,
  onNameChange, onTimeChange, onRemove, onColorChange,
  canRemove, colorPickerOpen, onToggleColorPicker, isNew,
}: PlayerRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: player.id });
  const canEditColor = isHost || player.id === myPlayerId;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className={isNew ? 'player-enter' : ''}>
      <div
        className="show-card"
        style={{
          padding: '10px 12px',
          borderColor: player.id === myPlayerId ? `${player.color}40` : 'var(--show-line)',
          borderLeftColor: player.color,
          borderLeftWidth: '3px',
          boxShadow: player.id === myPlayerId ? `0 0 0 1px ${player.color}20` : 'none',
        }}
      >
        <div className="flex items-center gap-2">
          {/* Drag handle or index */}
          {isHost && canRemove ? (
            <div {...attributes} {...listeners} style={{ touchAction: 'none' }}>
              <DragHandle />
            </div>
          ) : (
            <span className="font-mono text-sm font-bold" style={{ color: 'var(--show-ink-3)', width: '28px', textAlign: 'center', flexShrink: 0 }}>{index + 1}</span>
          )}

          {/* Color dot */}
          <button
            onClick={canEditColor ? onToggleColorPicker : undefined}
            style={{
              width: 22, height: 22, borderRadius: '50%',
              background: player.color ?? '#888',
              border: colorPickerOpen ? '2px solid white' : '2px solid transparent',
              flexShrink: 0,
              cursor: canEditColor ? 'pointer' : 'default',
              boxShadow: `0 0 8px ${player.color}60`,
              transition: 'transform .15s',
              transform: colorPickerOpen ? 'scale(1.15)' : 'scale(1)',
            }}
          />

          {/* Name */}
          {isHost ? (
            <input
              type="text"
              value={player.name}
              onChange={(e) => onNameChange(player.id, e.target.value)}
              onBlur={(e) => onNameChange(player.id, e.target.value.trim() || player.name)}
              maxLength={20}
              className="show-input flex-1 min-w-0"
              style={{ padding: '5px 8px', fontSize: '14px', background: 'transparent', border: 'none', boxShadow: 'none', borderRadius: 0, borderBottom: '1px solid var(--show-line)' }}
            />
          ) : (
            <span className="flex-1 font-semibold text-sm" style={{ color: 'var(--show-ink)' }}>
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
                  style={{ width: '58px', padding: '5px 6px', fontSize: '14px' }}
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
              style={{ width: '34px', height: '34px', padding: 0, fontSize: '18px', color: 'var(--show-ink-3)', border: 'none', background: 'transparent', boxShadow: 'none' }}
            >×</button>
          )}
        </div>

        {/* Inline color picker */}
        {colorPickerOpen && canEditColor && (
          <div style={{ display: 'flex', gap: '8px', padding: '10px 2px 2px', flexWrap: 'wrap' }}>
            {PLAYER_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => { onColorChange(player.id, c); onToggleColorPicker(); }}
                style={{
                  width: 30, height: 30, borderRadius: '50%',
                  background: c,
                  border: c === player.color ? '3px solid white' : '2px solid transparent',
                  boxShadow: c === player.color ? `0 0 0 1px ${c}80, 0 0 10px ${c}60` : `0 0 6px ${c}40`,
                  cursor: 'pointer',
                  transform: c === player.color ? 'scale(1.15)' : 'scale(1)',
                  transition: 'transform .12s',
                }}
              />
            ))}
          </div>
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
  const [colorPickerForId, setColorPickerForId] = useState<string | null>(null);
  const [newPlayerIds, setNewPlayerIds] = useState<Set<string>>(new Set());
  const prevPlayerIds = useRef(new Set<string>());

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 5 } }),
  );

  // Track new players for slide-in animation
  useEffect(() => {
    const current = new Set(game.players.map((p) => p.id));
    const added = [...current].filter((id) => !prevPlayerIds.current.has(id));
    if (added.length > 0 && prevPlayerIds.current.size > 0) {
      setNewPlayerIds(new Set(added));
      const t = setTimeout(() => setNewPlayerIds(new Set()), 400);
      prevPlayerIds.current = current;
      return () => clearTimeout(t);
    }
    prevPlayerIds.current = current;
  }, [game.players.map((p) => p.id).join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = useCallback(async (patch: Partial<GameState> & { players?: PlayerState[] }) => {
    setSaving(true);
    await fetch(`/api/game/${game.id}/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId: myPlayerId, ...patch }),
    });
    setSaving(false);
  }, [game.id, myPlayerId]);

  async function handleColorChange(targetId: string, color: string) {
    await fetch(`/api/game/${game.id}/color`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requesterId: myPlayerId, targetId, color }),
    });
  }

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

  const myColor = game.players.find((p) => p.id === myPlayerId)?.color;

  return (
    <div
      className="min-h-screen px-4 py-6 space-y-5 player-bg"
      style={myColor ? { '--show-accent': myColor } as React.CSSProperties : undefined}
    >
      <div className="max-w-lg mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: '1.7rem', color: 'var(--show-ink)', letterSpacing: '-0.02em', fontWeight: 900, lineHeight: 1 }}>
              SMACKY <span style={{ color: 'var(--show-accent)', textShadow: '0 0 14px rgba(0,196,232,.35)' }}>5000</span>
            </h1>
            <span className="show-caps" style={{ marginTop: '4px', display: 'block' }}>Game Setup</span>
          </div>
          <div className="text-right">
            <span className="show-caps">Code</span>
            <p className="font-mono font-black text-2xl mt-0.5" style={{ color: 'var(--show-accent)', letterSpacing: '0.15em', textShadow: '0 0 12px rgba(0,196,232,.3)' }}>{game.id}</p>
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
                <button onClick={shufflePlayers} className="show-btn show-btn-ghost" style={{ padding: '4px 12px', fontSize: '12px' }}>
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
                    onColorChange={handleColorChange}
                    canRemove={game.players.length > 1}
                    colorPickerOpen={colorPickerForId === player.id}
                    onToggleColorPicker={() => setColorPickerForId(colorPickerForId === player.id ? null : player.id)}
                    isNew={newPlayerIds.has(player.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        {/* Game Settings */}
        <div className="show-card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--show-line)' }}>
            <span className="show-caps">Game Settings</span>
          </div>

          {[
            { label: 'Default Time', sublabel: 'Seconds per player', key: 'defaultTimeSeconds', value: game.defaultTimeSeconds, unit: 's', min: 5, max: 3600 },
            { label: 'Buffer Time', sublabel: 'Pause between turns', key: 'bufferSeconds', value: game.bufferSeconds, unit: 's', min: 0, max: 60 },
            { label: 'Countdown', sublabel: 'Before game starts (0 = off)', key: 'countdownSeconds', value: game.countdownSeconds, unit: 's', min: 0, max: 10 },
          ].map((row) => (
            <div key={row.key} className="flex items-center justify-between" style={{ padding: '12px 16px', borderBottom: '1px solid var(--show-line-soft)' }}>
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
                    style={{ width: '70px', padding: '6px 8px', fontSize: '14px' }}
                  />
                  <span className="show-caps">{row.unit}</span>
                </div>
              ) : (
                <span className="font-mono font-bold text-sm" style={{ color: 'var(--show-ink-2)' }}>{row.value}{row.unit}</span>
              )}
            </div>
          ))}

          <div style={{ padding: '12px 16px' }}>
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
                      background: game.timeoutBehavior === opt ? 'rgba(255,255,255,.08)' : 'transparent',
                      borderColor: game.timeoutBehavior === opt ? 'rgba(255,255,255,.2)' : 'var(--show-line)',
                      fontWeight: game.timeoutBehavior === opt ? 700 : 600,
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
            style={{ padding: '18px', fontSize: '1rem' }}
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
