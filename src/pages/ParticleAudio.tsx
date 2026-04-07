import { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Helmet } from 'react-helmet-async';
import { toast } from 'sonner';

/* ── Types ─────────────────────────────────── */
interface ParticleConfig {
  shape: 'point' | 'circle' | 'square' | 'star' | 'line';
  spawnRate: number;
  lifetime: number;
  speed: number;
  speedVariance: number;
  gravity: number;
  angle: number;
  angleVariance: number;
  startScale: number;
  endScale: number;
  startColor: string;
  endColor: string;
  startAlpha: number;
  endAlpha: number;
  maxParticles: number;
  blendMode: 'normal' | 'add' | 'multiply';
}

interface AudioChannel {
  id: string;
  name: string;
  volume: number;
  pan: number;
  reverb: number;
  muted: boolean;
  solo: boolean;
  type: 'sfx' | 'music' | 'voice' | 'ambient';
}

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  scale: number; alpha: number;
}

/* ── Constants ─────────────────────────────── */
const PARTICLE_PRESETS: Record<string, Partial<ParticleConfig>> = {
  fire: { shape: 'circle', spawnRate: 40, lifetime: 800, speed: 80, gravity: -30, startColor: '#ff6600', endColor: '#ff000000', startAlpha: 1, endAlpha: 0, blendMode: 'add' },
  smoke: { shape: 'circle', spawnRate: 15, lifetime: 2000, speed: 30, gravity: -15, startColor: '#888888', endColor: '#33333300', startScale: 0.5, endScale: 2, blendMode: 'normal' },
  sparks: { shape: 'point', spawnRate: 60, lifetime: 400, speed: 200, speedVariance: 100, gravity: 100, startColor: '#ffdd00', endColor: '#ff440000', blendMode: 'add' },
  snow: { shape: 'circle', spawnRate: 20, lifetime: 3000, speed: 20, gravity: 10, angleVariance: 30, startColor: '#ffffff', endColor: '#ffffff80', startScale: 0.3, endScale: 0.1, blendMode: 'normal' },
  explosion: { shape: 'star', spawnRate: 200, lifetime: 600, speed: 300, speedVariance: 150, gravity: 50, startColor: '#ff8800', endColor: '#ff000000', startScale: 1, endScale: 0, blendMode: 'add' },
  rain: { shape: 'line', spawnRate: 80, lifetime: 500, speed: 400, angle: 260, angleVariance: 5, gravity: 200, startColor: '#6699cc', endColor: '#6699cc40', blendMode: 'normal' },
  confetti: { shape: 'square', spawnRate: 30, lifetime: 2500, speed: 100, speedVariance: 80, gravity: 40, startColor: '#ff44aa', endColor: '#4488ff', startAlpha: 1, endAlpha: 0.5, blendMode: 'normal' },
  magic: { shape: 'star', spawnRate: 25, lifetime: 1200, speed: 50, gravity: -10, startColor: '#aa44ff', endColor: '#4466ff00', startScale: 0.8, endScale: 0, blendMode: 'add' },
};

const DEFAULT_CONFIG: ParticleConfig = {
  shape: 'circle', spawnRate: 30, lifetime: 1000, speed: 80, speedVariance: 20,
  gravity: 0, angle: 270, angleVariance: 15, startScale: 1, endScale: 0.2,
  startColor: '#ff6600', endColor: '#ff000000', startAlpha: 1, endAlpha: 0,
  maxParticles: 500, blendMode: 'normal',
};

const DEFAULT_CHANNELS: AudioChannel[] = [
  { id: '1', name: 'Master', volume: 80, pan: 0, reverb: 0, muted: false, solo: false, type: 'sfx' },
  { id: '2', name: 'Music', volume: 60, pan: 0, reverb: 20, muted: false, solo: false, type: 'music' },
  { id: '3', name: 'SFX', volume: 90, pan: 0, reverb: 10, muted: false, solo: false, type: 'sfx' },
  { id: '4', name: 'Voice', volume: 85, pan: 0, reverb: 5, muted: false, solo: false, type: 'voice' },
  { id: '5', name: 'Ambient', volume: 40, pan: 0, reverb: 40, muted: false, solo: false, type: 'ambient' },
  { id: '6', name: 'UI', volume: 70, pan: 0, reverb: 0, muted: false, solo: false, type: 'sfx' },
];

/* ── Component ─────────────────────────────── */
const ParticleAudio = () => {
  const [activeTab, setActiveTab] = useState<'particles' | 'audio'>('particles');

  /* Particle system */
  const [config, setConfig] = useState<ParticleConfig>(DEFAULT_CONFIG);
  const [isPlaying, setIsPlaying] = useState(true);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animRef = useRef<number>(0);

  /* Audio mixer */
  const [channels, setChannels] = useState<AudioChannel[]>(DEFAULT_CHANNELS);

  const applyPreset = (name: string) => {
    setSelectedPreset(name);
    const preset = PARTICLE_PRESETS[name];
    setConfig(prev => ({ ...prev, ...preset }));
  };

  const updateConfig = <K extends keyof ParticleConfig>(key: K, value: ParticleConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const updateChannel = (id: string, updates: Partial<AudioChannel>) => {
    setChannels(prev => prev.map(ch => ch.id === id ? { ...ch, ...updates } : ch));
  };

  const exportParticleConfig = () => {
    const json = JSON.stringify(config, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'particle-config.json'; a.click();
    toast.success('Particle config exported!');
  };

  const exportAudioMix = () => {
    const json = JSON.stringify({ channels, timestamp: Date.now() }, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'audio-mix.json'; a.click();
    toast.success('Audio mix exported!');
  };

  // Particle simulation
  useEffect(() => {
    if (!canvasRef.current || !isPlaying || activeTab !== 'particles') return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2;

    const loop = () => {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#0a0a1a';
      ctx.fillRect(0, 0, W, H);

      // Spawn
      const toSpawn = Math.floor(config.spawnRate / 60);
      for (let i = 0; i < toSpawn && particlesRef.current.length < config.maxParticles; i++) {
        const a = ((config.angle + (Math.random() - 0.5) * config.angleVariance * 2) * Math.PI) / 180;
        const s = config.speed + (Math.random() - 0.5) * config.speedVariance * 2;
        particlesRef.current.push({
          x: cx, y: cy,
          vx: Math.cos(a) * s, vy: Math.sin(a) * s,
          life: config.lifetime, maxLife: config.lifetime,
          scale: config.startScale, alpha: config.startAlpha,
        });
      }

      // Update & draw
      particlesRef.current = particlesRef.current.filter(p => {
        p.life -= 16.67;
        if (p.life <= 0) return false;
        const t = 1 - p.life / p.maxLife;
        p.vy += config.gravity * 0.0167;
        p.x += p.vx * 0.0167;
        p.y += p.vy * 0.0167;
        p.scale = config.startScale + (config.endScale - config.startScale) * t;
        p.alpha = config.startAlpha + (config.endAlpha - config.startAlpha) * t;

        ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));
        const r = Math.max(1, p.scale * 8);

        // Color interpolation (simple)
        const col = t < 0.5 ? config.startColor : config.endColor;
        ctx.fillStyle = col.slice(0, 7);

        if (config.shape === 'circle' || config.shape === 'point') {
          ctx.beginPath();
          ctx.arc(p.x, p.y, config.shape === 'point' ? 2 : r, 0, Math.PI * 2);
          ctx.fill();
        } else if (config.shape === 'square') {
          ctx.fillRect(p.x - r, p.y - r, r * 2, r * 2);
        } else if (config.shape === 'star') {
          ctx.beginPath();
          for (let j = 0; j < 5; j++) {
            const sa = (j * 72 - 90) * Math.PI / 180;
            const method = j === 0 ? 'moveTo' : 'lineTo';
            ctx[method](p.x + Math.cos(sa) * r, p.y + Math.sin(sa) * r);
            const ia = ((j * 72 + 36) - 90) * Math.PI / 180;
            ctx.lineTo(p.x + Math.cos(ia) * r * 0.4, p.y + Math.sin(ia) * r * 0.4);
          }
          ctx.closePath(); ctx.fill();
        } else if (config.shape === 'line') {
          ctx.strokeStyle = col.slice(0, 7);
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 0.02, p.y - p.vy * 0.02);
          ctx.stroke();
        }
        return true;
      });

      ctx.globalAlpha = 1;
      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [config, isPlaying, activeTab]);

  const SLIDERS: Array<{ key: keyof ParticleConfig; label: string; min: number; max: number; step: number }> = [
    { key: 'spawnRate', label: 'Spawn Rate', min: 1, max: 200, step: 1 },
    { key: 'lifetime', label: 'Lifetime (ms)', min: 100, max: 5000, step: 50 },
    { key: 'speed', label: 'Speed', min: 0, max: 500, step: 5 },
    { key: 'speedVariance', label: 'Speed Variance', min: 0, max: 200, step: 5 },
    { key: 'gravity', label: 'Gravity', min: -200, max: 200, step: 5 },
    { key: 'angle', label: 'Angle (°)', min: 0, max: 360, step: 1 },
    { key: 'angleVariance', label: 'Angle Variance', min: 0, max: 180, step: 1 },
    { key: 'startScale', label: 'Start Scale', min: 0.1, max: 5, step: 0.1 },
    { key: 'endScale', label: 'End Scale', min: 0, max: 5, step: 0.1 },
    { key: 'startAlpha', label: 'Start Alpha', min: 0, max: 1, step: 0.05 },
    { key: 'endAlpha', label: 'End Alpha', min: 0, max: 1, step: 0.05 },
    { key: 'maxParticles', label: 'Max Particles', min: 50, max: 2000, step: 50 },
  ];

  return (
    <>
      <Helmet>
        <title>Particle & Audio — Eternity Game Studio</title>
        <meta name="description" content="Visual particle system designer with live preview and configurable emitter. Audio mixer panel with per-channel volume, pan, and reverb controls." />
      </Helmet>
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <main className="pt-[60px]">
          <section className="relative overflow-hidden border-b border-border">
            <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 via-transparent to-primary/3" />
            <div className="mx-auto max-w-5xl px-4 py-8 text-center relative">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <span className="inline-block rounded-full border border-pink-500/30 bg-pink-500/10 px-4 py-1 font-mono text-[10px] uppercase tracking-widest text-pink-400 mb-3">Particle & Audio</span>
                <h1 className="font-heading text-2xl md:text-4xl font-bold mb-2">Effects. Sound. <span className="text-primary">Immersion.</span></h1>
                <p className="text-muted-foreground text-xs max-w-lg mx-auto">Visual particle system designer with live preview. Audio mixer with per-channel controls and JSON export.</p>
              </motion.div>
            </div>
          </section>

          <section className="mx-auto max-w-6xl px-4 py-6">
            <div className="flex gap-1 mb-4">
              {[
                { id: 'particles' as const, label: '✨ Particles' },
                { id: 'audio' as const, label: '🔊 Audio Mixer' },
              ].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-heading font-medium transition-colors ${activeTab === tab.id ? 'bg-card border border-border text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Particle Designer */}
            {activeTab === 'particles' && (
              <div className="grid md:grid-cols-[280px_1fr] gap-4">
                {/* Controls */}
                <div className="space-y-3 max-h-[80vh] overflow-y-auto pr-1">
                  {/* Presets */}
                  <div className="rounded-xl border border-border bg-card p-3">
                    <p className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground mb-2">Presets</p>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.keys(PARTICLE_PRESETS).map(name => (
                        <button key={name} onClick={() => applyPreset(name)}
                          className={`rounded-lg border px-2.5 py-1 text-[10px] font-mono capitalize transition-colors ${selectedPreset === name ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}>
                          {name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Shape */}
                  <div className="rounded-xl border border-border bg-card p-3">
                    <p className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground mb-2">Shape</p>
                    <div className="flex gap-1.5">
                      {(['point', 'circle', 'square', 'star', 'line'] as const).map(s => (
                        <button key={s} onClick={() => updateConfig('shape', s)}
                          className={`rounded-lg border px-2.5 py-1 text-[10px] font-mono capitalize transition-colors ${config.shape === s ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Blend Mode */}
                  <div className="rounded-xl border border-border bg-card p-3">
                    <p className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground mb-2">Blend Mode</p>
                    <div className="flex gap-1.5">
                      {(['normal', 'add', 'multiply'] as const).map(b => (
                        <button key={b} onClick={() => updateConfig('blendMode', b)}
                          className={`rounded-lg border px-2.5 py-1 text-[10px] font-mono capitalize transition-colors ${config.blendMode === b ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}>
                          {b}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Colors */}
                  <div className="rounded-xl border border-border bg-card p-3">
                    <p className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground mb-2">Colors</p>
                    <div className="flex items-center gap-3">
                      <div>
                        <label className="text-[8px] font-mono text-muted-foreground">Start</label>
                        <input type="color" value={config.startColor.slice(0, 7)} onChange={e => updateConfig('startColor', e.target.value)}
                          className="block h-8 w-12 rounded border border-border cursor-pointer" />
                      </div>
                      <span className="text-muted-foreground">→</span>
                      <div>
                        <label className="text-[8px] font-mono text-muted-foreground">End</label>
                        <input type="color" value={config.endColor.slice(0, 7)} onChange={e => updateConfig('endColor', e.target.value)}
                          className="block h-8 w-12 rounded border border-border cursor-pointer" />
                      </div>
                    </div>
                  </div>

                  {/* Sliders */}
                  <div className="rounded-xl border border-border bg-card p-3 space-y-2.5">
                    <p className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">Parameters</p>
                    {SLIDERS.map(s => (
                      <div key={s.key}>
                        <div className="flex justify-between text-[9px] mb-0.5">
                          <span className="text-muted-foreground font-mono">{s.label}</span>
                          <span className="font-mono text-foreground">{config[s.key] as number}</span>
                        </div>
                        <input type="range" min={s.min} max={s.max} step={s.step}
                          value={config[s.key] as number}
                          onChange={e => updateConfig(s.key, Number(e.target.value))}
                          className="w-full h-1 bg-muted rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary" />
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button onClick={() => setIsPlaying(!isPlaying)} className="rounded-lg border border-border px-3 py-1.5 text-[10px] font-mono text-muted-foreground hover:text-foreground">
                      {isPlaying ? '⏸ Pause' : '▶ Play'}
                    </button>
                    <button onClick={() => { particlesRef.current = []; }} className="rounded-lg border border-border px-3 py-1.5 text-[10px] font-mono text-muted-foreground hover:text-foreground">Clear</button>
                    <button onClick={exportParticleConfig} className="rounded-lg bg-primary px-3 py-1.5 text-[10px] font-heading font-semibold text-primary-foreground">Export JSON</button>
                  </div>
                </div>

                {/* Preview Canvas */}
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                    <span className="text-[9px] font-mono text-muted-foreground">Live Preview</span>
                    <span className="text-[9px] font-mono text-muted-foreground">{particlesRef.current.length} active</span>
                  </div>
                  <canvas ref={canvasRef} width={600} height={450} className="w-full" style={{ imageRendering: 'pixelated' }} />

                  {/* Generated code preview */}
                  <div className="border-t border-border p-3">
                    <p className="text-[9px] font-mono uppercase text-muted-foreground mb-1">Generated Code</p>
                    <pre className="text-[9px] font-mono text-foreground/70 bg-background rounded-lg p-2 overflow-x-auto max-h-24">
{`const emitter = scene.add.particles(x, y, 'particle', {
  speed: { min: ${config.speed - config.speedVariance}, max: ${config.speed + config.speedVariance} },
  angle: { min: ${config.angle - config.angleVariance}, max: ${config.angle + config.angleVariance} },
  scale: { start: ${config.startScale}, end: ${config.endScale} },
  alpha: { start: ${config.startAlpha}, end: ${config.endAlpha} },
  lifespan: ${config.lifetime},
  frequency: ${Math.round(1000 / config.spawnRate)},
  gravityY: ${config.gravity},
  maxParticles: ${config.maxParticles},
  blendMode: '${config.blendMode.toUpperCase()}',
});`}
                    </pre>
                  </div>
                </div>
              </div>
            )}

            {/* Audio Mixer */}
            {activeTab === 'audio' && (
              <div className="space-y-4">
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <span className="text-xs font-heading font-semibold">Audio Mixer</span>
                    <div className="flex gap-2">
                      <button onClick={() => setChannels(prev => [...prev, { id: crypto.randomUUID(), name: `Ch ${prev.length + 1}`, volume: 80, pan: 0, reverb: 0, muted: false, solo: false, type: 'sfx' }])}
                        className="rounded border border-border px-2 py-1 text-[9px] font-mono text-muted-foreground hover:text-foreground">+ Channel</button>
                      <button onClick={exportAudioMix} className="rounded-lg bg-primary px-3 py-1 text-[9px] font-heading font-semibold text-primary-foreground">Export Mix</button>
                    </div>
                  </div>

                  {/* Channel strips */}
                  <div className="flex overflow-x-auto p-4 gap-3">
                    {channels.map(ch => (
                      <div key={ch.id} className={`flex-shrink-0 w-28 rounded-xl border bg-background p-3 space-y-3 ${ch.muted ? 'border-border opacity-50' : ch.solo ? 'border-yellow-500/30' : 'border-border'}`}>
                        {/* Label */}
                        <div className="text-center">
                          <input type="text" value={ch.name} onChange={e => updateChannel(ch.id, { name: e.target.value })}
                            className="w-full bg-transparent text-center text-[10px] font-mono font-semibold text-foreground focus:outline-none" />
                          <span className={`inline-block rounded-full px-1.5 py-0.5 text-[7px] font-mono mt-0.5 ${ch.type === 'music' ? 'bg-purple-500/10 text-purple-400' : ch.type === 'voice' ? 'bg-blue-500/10 text-blue-400' : ch.type === 'ambient' ? 'bg-green-500/10 text-green-400' : 'bg-muted text-muted-foreground'}`}>{ch.type}</span>
                        </div>

                        {/* Volume fader (vertical) */}
                        <div className="flex flex-col items-center">
                          <span className="text-[8px] font-mono text-muted-foreground mb-1">Vol</span>
                          <div className="h-32 flex flex-col items-center justify-end relative">
                            <div className="w-2 h-full bg-muted rounded-full relative overflow-hidden">
                              <div className="absolute bottom-0 w-full rounded-full bg-primary transition-all" style={{ height: `${ch.volume}%` }} />
                            </div>
                            <input type="range" min={0} max={100} value={ch.volume}
                              onChange={e => updateChannel(ch.id, { volume: Number(e.target.value) })}
                              className="absolute w-32 -rotate-90 opacity-0 cursor-pointer" style={{ top: '50%', left: '-50px' }} />
                          </div>
                          <span className="text-[9px] font-mono text-foreground mt-1">{ch.volume}</span>
                        </div>

                        {/* Pan */}
                        <div>
                          <span className="text-[8px] font-mono text-muted-foreground block text-center">Pan</span>
                          <input type="range" min={-100} max={100} value={ch.pan}
                            onChange={e => updateChannel(ch.id, { pan: Number(e.target.value) })}
                            className="w-full h-1 bg-muted rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary" />
                          <div className="flex justify-between text-[7px] font-mono text-muted-foreground"><span>L</span><span>{ch.pan}</span><span>R</span></div>
                        </div>

                        {/* Reverb */}
                        <div>
                          <span className="text-[8px] font-mono text-muted-foreground block text-center">Reverb</span>
                          <input type="range" min={0} max={100} value={ch.reverb}
                            onChange={e => updateChannel(ch.id, { reverb: Number(e.target.value) })}
                            className="w-full h-1 bg-muted rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary" />
                          <span className="text-[8px] font-mono text-foreground block text-center">{ch.reverb}%</span>
                        </div>

                        {/* Mute / Solo */}
                        <div className="flex gap-1 justify-center">
                          <button onClick={() => updateChannel(ch.id, { muted: !ch.muted })}
                            className={`rounded px-2 py-0.5 text-[8px] font-mono font-bold ${ch.muted ? 'bg-red-500/20 text-red-400' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>M</button>
                          <button onClick={() => updateChannel(ch.id, { solo: !ch.solo })}
                            className={`rounded px-2 py-0.5 text-[8px] font-mono font-bold ${ch.solo ? 'bg-yellow-500/20 text-yellow-400' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>S</button>
                        </div>

                        {/* Remove */}
                        <button onClick={() => setChannels(prev => prev.filter(c => c.id !== ch.id))}
                          className="w-full text-center text-[8px] font-mono text-destructive/50 hover:text-destructive">Remove</button>
                      </div>
                    ))}
                  </div>

                  {/* Mix summary */}
                  <div className="border-t border-border px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-[9px] font-mono text-muted-foreground">{channels.length} channels</span>
                      <span className="text-[9px] font-mono text-muted-foreground">{channels.filter(c => c.muted).length} muted</span>
                      <span className="text-[9px] font-mono text-muted-foreground">{channels.filter(c => c.solo).length} solo</span>
                    </div>
                    <button onClick={() => setChannels(DEFAULT_CHANNELS)} className="text-[9px] font-mono text-muted-foreground hover:text-foreground">Reset Mix</button>
                  </div>
                </div>
              </div>
            )}
          </section>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default ParticleAudio;
