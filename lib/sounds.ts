let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  try {
    if (!ctx || ctx.state === 'closed') {
      const Cls =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new Cls();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(
  freq: number,
  endFreq: number,
  type: OscillatorType,
  gain: number,
  duration: number,
  delay = 0,
) {
  const c = audio();
  if (!c) return;
  const t = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.connect(g);
  g.connect(c.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (endFreq !== freq) osc.frequency.exponentialRampToValueAtTime(endFreq, t + duration);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.001, t + duration);
  osc.start(t);
  osc.stop(t + duration + 0.01);
}

export const sounds = {
  // Subtle tap for UI buttons
  click() {
    tone(900, 700, 'sine', 0.1, 0.055);
  },

  // Satisfying punch for END TURN
  endTurn() {
    tone(500, 280, 'sine', 0.28, 0.14);
    tone(1000, 500, 'triangle', 0.12, 0.08);
  },

  // Crisp metronome tick for countdown
  countdownTick() {
    tone(1100, 1100, 'sine', 0.22, 0.055);
  },

  // Rising blip for GO!
  go() {
    tone(500, 900, 'sine', 0.28, 0.18);
    tone(750, 1200, 'sine', 0.18, 0.14, 0.08);
  },

  // Soft ascending chime when a player joins
  playerJoin() {
    tone(523, 523, 'sine', 0.15, 0.14);       // C
    tone(659, 659, 'sine', 0.13, 0.14, 0.14); // E
  },

  // Brief note at buffer / next-player transition
  bufferChime() {
    tone(660, 660, 'sine', 0.14, 0.12);
  },

  // Three ascending notes at game over
  gameOver() {
    tone(523, 523, 'sine', 0.18, 0.18);        // C
    tone(659, 659, 'sine', 0.18, 0.18, 0.2);   // E
    tone(784, 784, 'sine', 0.22, 0.32, 0.4);   // G
  },

  // Harsh buzzer for timeout (existing behaviour)
  buzzer() {
    const c = audio();
    if (!c) return;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.connect(g);
    g.connect(c.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, c.currentTime);
    osc.frequency.linearRampToValueAtTime(60, c.currentTime + 0.8);
    g.gain.setValueAtTime(0.55, c.currentTime);
    g.gain.linearRampToValueAtTime(0, c.currentTime + 1.0);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + 1.0);
  },
};
