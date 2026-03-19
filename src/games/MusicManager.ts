/**
 * Procedural background music using Web Audio API.
 * Simple looping ambient synth pads — no external files.
 */

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let isPlaying = false;
let oscillators: OscillatorNode[] = [];
let isMuted = false;

function getCtx(): AudioContext {
  if (!ctx) {
    ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.gain.value = isMuted ? 0 : 0.08;
    masterGain.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function startMusic() {
  if (isPlaying) return;
  const c = getCtx();
  isPlaying = true;

  // Ambient chord pad: C minor (C3, Eb3, G3, Bb3)
  const freqs = [130.81, 155.56, 196.0, 233.08];

  freqs.forEach(freq => {
    const osc = c.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;

    // Slight detune for warmth
    osc.detune.value = (Math.random() - 0.5) * 10;

    const oscGain = c.createGain();
    oscGain.gain.value = 0.25;

    // Gentle LFO tremolo
    const lfo = c.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.3 + Math.random() * 0.4;
    const lfoGain = c.createGain();
    lfoGain.gain.value = 0.05;
    lfo.connect(lfoGain);
    lfoGain.connect(oscGain.gain);
    lfo.start();

    osc.connect(oscGain);
    oscGain.connect(masterGain!);
    osc.start();

    oscillators.push(osc, lfo);
  });
}

export function stopMusic() {
  oscillators.forEach(osc => {
    try { osc.stop(); } catch (_) { /* ignore */ }
  });
  oscillators = [];
  isPlaying = false;
}

export function toggleMute(): boolean {
  isMuted = !isMuted;
  if (masterGain) {
    masterGain.gain.value = isMuted ? 0 : 0.08;
  }
  return isMuted;
}

export function getIsMuted(): boolean {
  return isMuted;
}
