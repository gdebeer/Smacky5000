export const PLAYER_COLORS = [
  '#FF4757', // red
  '#2ED573', // emerald
  '#1E90FF', // blue
  '#FF6348', // orange
  '#A29BFE', // lavender
  '#FF6EB4', // pink
  '#00D2D3', // teal
  '#FFC312', // yellow
] as const;

export type PlayerColor = typeof PLAYER_COLORS[number];

export function pickColor(usedColors: string[]): string {
  const used = new Set(usedColors);
  const available = PLAYER_COLORS.filter((c) => !used.has(c));
  const pool = available.length > 0 ? available : [...PLAYER_COLORS];
  return pool[Math.floor(Math.random() * pool.length)];
}
