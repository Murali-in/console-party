/**
 * Procedural sound effects using Web Audio API.
 * No external audio files needed — all sounds are synthesized.
 */

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// === Original game SFX ===

export function playExplosion() {
  const ctx = getCtx();
  const t = ctx.currentTime;
  const bufferSize = ctx.sampleRate * 0.3;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(800, t);
  filter.frequency.exponentialRampToValueAtTime(100, t + 0.3);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.5, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
  noise.connect(filter).connect(gain).connect(ctx.destination);
  noise.start(t);
  noise.stop(t + 0.4);
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(120, t);
  osc.frequency.exponentialRampToValueAtTime(30, t + 0.2);
  const oscGain = ctx.createGain();
  oscGain.gain.setValueAtTime(0.6, t);
  oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
  osc.connect(oscGain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.3);
}

export function playShoot() {
  const ctx = getCtx();
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = 'square';
  osc.frequency.setValueAtTime(900, t);
  osc.frequency.exponentialRampToValueAtTime(200, t + 0.08);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.15, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.1);
}

export function playHit() {
  const ctx = getCtx();
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(300, t);
  osc.frequency.exponentialRampToValueAtTime(80, t + 0.12);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.2, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.15);
}

export function playBombTick() {
  const ctx = getCtx();
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(1200, t);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.08, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.04);
}

export function playBombTransfer() {
  const ctx = getCtx();
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(600, t);
  osc.frequency.exponentialRampToValueAtTime(1200, t + 0.06);
  osc.frequency.exponentialRampToValueAtTime(400, t + 0.12);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.2, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.15);
}

export function playNitroBoost() {
  const ctx = getCtx();
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(200, t);
  osc.frequency.linearRampToValueAtTime(800, t + 0.15);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.12, t);
  gain.gain.linearRampToValueAtTime(0.2, t + 0.1);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(2000, t);
  osc.connect(filter).connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.3);
}

export function playLapComplete() {
  const ctx = getCtx();
  const t = ctx.currentTime;
  [523, 659, 784].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t + i * 0.08);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.15, t + i * 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.2);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t + i * 0.08);
    osc.stop(t + i * 0.08 + 0.2);
  });
}

export function playCountdownBeep(final = false) {
  const ctx = getCtx();
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(final ? 880 : 440, t);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.25, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + (final ? 0.4 : 0.15));
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + (final ? 0.4 : 0.15));
}

export function playReady() {
  const ctx = getCtx();
  const t = ctx.currentTime;
  [440, 554].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t + i * 0.06);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.15, t + i * 0.06);
    gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.15);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t + i * 0.06);
    osc.stop(t + i * 0.06 + 0.15);
  });
}

export function playVictory() {
  const ctx = getCtx();
  const t = ctx.currentTime;
  [523, 659, 784, 1047].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t + i * 0.12);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.2, t + i * 0.12);
    gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.3);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t + i * 0.12);
    osc.stop(t + i * 0.12 + 0.3);
  });
}

export function playBlockHit() {
  const ctx = getCtx();
  const t = ctx.currentTime;
  const bufferSize = ctx.sampleRate * 0.1;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(500, t);
  filter.Q.setValueAtTime(2, t);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.3, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
  noise.connect(filter).connect(gain).connect(ctx.destination);
  noise.start(t);
  noise.stop(t + 0.12);
}

export function playTransform() {
  const ctx = getCtx();
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(300, t);
  osc.frequency.exponentialRampToValueAtTime(1200, t + 0.15);
  osc.frequency.exponentialRampToValueAtTime(600, t + 0.3);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.12, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.35);
}

export function playEliminate() {
  const ctx = getCtx();
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(400, t);
  osc.frequency.exponentialRampToValueAtTime(60, t + 0.3);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.2, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(1000, t);
  filter.frequency.exponentialRampToValueAtTime(200, t + 0.3);
  osc.connect(filter).connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.35);
}

// === Brawl Zone (Platform Fighter) SFX ===

export function playPunch() {
  const ctx = getCtx();
  const t = ctx.currentTime;
  // Quick noise burst for impact
  const bufferSize = ctx.sampleRate * 0.08;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 4);
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(800, t);
  filter.Q.setValueAtTime(1.5, t);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.35, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  noise.connect(filter).connect(gain).connect(ctx.destination);
  noise.start(t);
  noise.stop(t + 0.1);
  // Low thud
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(150, t);
  osc.frequency.exponentialRampToValueAtTime(50, t + 0.08);
  const oscG = ctx.createGain();
  oscG.gain.setValueAtTime(0.25, t);
  oscG.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  osc.connect(oscG).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.1);
}

export function playJump() {
  const ctx = getCtx();
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(250, t);
  osc.frequency.exponentialRampToValueAtTime(600, t + 0.1);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.12, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.12);
}

export function playKO() {
  const ctx = getCtx();
  const t = ctx.currentTime;
  // Descending tone
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(500, t);
  osc.frequency.exponentialRampToValueAtTime(80, t + 0.4);
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(1500, t);
  filter.frequency.exponentialRampToValueAtTime(300, t + 0.4);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.2, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
  osc.connect(filter).connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.45);
}

// === Maze Runner SFX ===

export function playCoinCollect() {
  const ctx = getCtx();
  const t = ctx.currentTime;
  // Bright two-note chime
  [880, 1320].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t + i * 0.06);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.18, t + i * 0.06);
    gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.15);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t + i * 0.06);
    osc.stop(t + i * 0.06 + 0.15);
  });
}

export function playExitReached() {
  const ctx = getCtx();
  const t = ctx.currentTime;
  [523, 784, 1047, 1318].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t + i * 0.08);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.15, t + i * 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.25);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t + i * 0.08);
    osc.stop(t + i * 0.08 + 0.25);
  });
}

// === Trivia Clash SFX ===

export function playCorrectAnswer() {
  const ctx = getCtx();
  const t = ctx.currentTime;
  // Rising cheerful two-note
  [660, 880].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t + i * 0.1);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.2, t + i * 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.2);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t + i * 0.1);
    osc.stop(t + i * 0.1 + 0.2);
  });
}

export function playWrongAnswer() {
  const ctx = getCtx();
  const t = ctx.currentTime;
  // Low buzzer
  const osc = ctx.createOscillator();
  osc.type = 'square';
  osc.frequency.setValueAtTime(150, t);
  osc.frequency.exponentialRampToValueAtTime(100, t + 0.25);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.15, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.3);
}

export function playTriviaSelect() {
  const ctx = getCtx();
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(700, t);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.1, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.06);
}
