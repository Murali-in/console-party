import { useState } from 'react';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Helmet } from 'react-helmet-async';
import { toast } from 'sonner';
import StudioNav from '@/components/studio/StudioNav';

/* ── Types ─────────────────────────────────── */
interface Asset {
  id: string;
  name: string;
  type: 'sprite' | 'sound' | 'music' | 'font' | 'atlas';
  size: string;
  timestamp: number;
  preview?: string;
  versions: number;
}

/* ── Constants ─────────────────────────────── */
const SPRITE_STYLES = ['Pixel Art (16×16)', 'Pixel Art (32×32)', 'Flat Vector', 'Rendered 3D-style', 'Hand-drawn'];
const SOUND_STYLES = ['8-bit Retro', 'Cinematic', 'Ambient', 'UI/Menu', 'Comic/Cartoon'];
const MUSIC_GENRES = ['Chiptune', 'Synthwave', 'Orchestral', 'Lo-fi', 'Ambient', 'Rock', 'EDM'];

const AssetTools = () => {
  const [activeTab, setActiveTab] = useState<'sprites' | 'sounds' | 'music' | 'manager' | 'atlas'>('sprites');
  const [assets, setAssets] = useState<Asset[]>([]);
  // Sprite generator
  const [spritePrompt, setSpritePrompt] = useState('');
  const [spriteStyle, setSpriteStyle] = useState(SPRITE_STYLES[0]);
  const [isGeneratingSprite, setIsGeneratingSprite] = useState(false);
  // Sound generator
  const [soundPrompt, setSoundPrompt] = useState('');
  const [soundStyle, setSoundStyle] = useState(SOUND_STYLES[0]);
  const [isGeneratingSound, setIsGeneratingSound] = useState(false);
  // Music generator
  const [musicPrompt, setMusicPrompt] = useState('');
  const [musicGenre, setMusicGenre] = useState(MUSIC_GENRES[0]);
  const [musicBPM, setMusicBPM] = useState(120);
  const [musicMood, setMusicMood] = useState('energetic');
  const [isGeneratingMusic, setIsGeneratingMusic] = useState(false);
  // Atlas
  const [atlasSprites, setAtlasSprites] = useState<string[]>([]);
  const [atlasPadding, setAtlasPadding] = useState(2);
  const [atlasPOT, setAtlasPOT] = useState(true);
  // Compressor
  const [maxBundleSize, setMaxBundleSize] = useState(5);

  const addAsset = (name: string, type: Asset['type'], size: string) => {
    const asset: Asset = { id: crypto.randomUUID(), name, type, size, timestamp: Date.now(), versions: 1 };
    setAssets(prev => [...prev, asset]);
    return asset;
  };

  const generateSprite = () => {
    if (!spritePrompt.trim()) return;
    setIsGeneratingSprite(true);
    setTimeout(() => {
      addAsset(`${spritePrompt.split(' ').slice(0, 2).join('_')}.png`, 'sprite', '2.4 KB');
      setIsGeneratingSprite(false);
      toast.success('Sprite generated!');
    }, 2000);
  };

  const generateSound = () => {
    if (!soundPrompt.trim()) return;
    setIsGeneratingSound(true);
    setTimeout(() => {
      addAsset(`${soundPrompt.split(' ').slice(0, 2).join('_')}.ogg`, 'sound', '18 KB');
      setIsGeneratingSound(false);
      toast.success('Sound effect generated!');
    }, 2000);
  };

  const generateMusic = () => {
    if (!musicPrompt.trim()) return;
    setIsGeneratingMusic(true);
    setTimeout(() => {
      addAsset(`${musicGenre.toLowerCase()}_loop.ogg`, 'music', '340 KB');
      setIsGeneratingMusic(false);
      toast.success('Music track generated!');
    }, 3000);
  };

  const duplicates = assets.filter((a, i) => assets.findIndex(b => b.name === a.name) !== i);
  const totalSize = assets.length * 0.05; // Simulated

  return (
    <>
      <Helmet>
        <title>Asset Tools — Eternity Game Studio</title>
        <meta name="description" content="AI-powered asset generation: sprites, sound effects, music. Plus asset manager, texture atlas builder, and auto-compressor." />
      </Helmet>
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <main className="pt-[60px]">
          <StudioNav />
          <section className="relative overflow-hidden border-b border-border">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-primary/3" />
            <div className="mx-auto max-w-5xl px-4 py-8 text-center relative">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <span className="inline-block rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-1 font-mono text-[10px] uppercase tracking-widest text-orange-400 mb-3">Asset Tools</span>
                <h1 className="font-heading text-2xl md:text-4xl font-bold mb-2">Generate. Manage. <span className="text-primary">Optimize.</span></h1>
                <p className="text-muted-foreground text-xs max-w-lg mx-auto">AI-powered sprite, sound, and music generation. Smart asset management with atlas building and auto-compression.</p>
              </motion.div>
            </div>
          </section>

          <section className="mx-auto max-w-5xl px-4 py-6">
            {/* Tabs */}
            <div className="flex gap-1 mb-4 overflow-x-auto">
              {(['sprites', 'sounds', 'music', 'manager', 'atlas'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-heading font-medium transition-colors whitespace-nowrap ${activeTab === tab ? 'bg-card border border-border text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                  {tab === 'sprites' && '🎨 Sprites'}{tab === 'sounds' && '🔊 Sounds'}{tab === 'music' && '🎵 Music'}{tab === 'manager' && '📦 Manager'}{tab === 'atlas' && '🗺️ Atlas'}
                </button>
              ))}
            </div>

            <div className="rounded-xl border border-border bg-card overflow-hidden min-h-[400px]">
              {/* Sprites (#53) */}
              {activeTab === 'sprites' && (
                <div className="p-5 space-y-4">
                  <div>
                    <p className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5">Describe your sprite</p>
                    <textarea value={spritePrompt} onChange={e => setSpritePrompt(e.target.value)}
                      placeholder="e.g. 'a warrior character with a sword, facing right, idle animation frame'"
                      className="w-full bg-background border border-border rounded-lg p-3 text-xs font-mono min-h-[60px] resize-none text-foreground placeholder:text-muted-foreground focus:outline-none" />
                  </div>
                  <div>
                    <p className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5">Style</p>
                    <div className="flex flex-wrap gap-1.5">
                      {SPRITE_STYLES.map(s => (
                        <button key={s} onClick={() => setSpriteStyle(s)}
                          className={`rounded-lg border px-3 py-1 text-[10px] font-mono transition-colors ${spriteStyle === s ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}>{s}</button>
                      ))}
                    </div>
                  </div>
                  <button onClick={generateSprite} disabled={!spritePrompt.trim() || isGeneratingSprite}
                    className="rounded-lg bg-primary px-5 py-2 font-heading text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity">
                    {isGeneratingSprite ? 'Generating...' : '🎨 Generate Sprite'}
                  </button>
                </div>
              )}

              {/* Sounds (#54) */}
              {activeTab === 'sounds' && (
                <div className="p-5 space-y-4">
                  <div>
                    <p className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5">Describe your sound effect</p>
                    <textarea value={soundPrompt} onChange={e => setSoundPrompt(e.target.value)}
                      placeholder="e.g. 'a laser blast sound, short and punchy with a sci-fi feel'"
                      className="w-full bg-background border border-border rounded-lg p-3 text-xs font-mono min-h-[60px] resize-none text-foreground placeholder:text-muted-foreground focus:outline-none" />
                  </div>
                  <div>
                    <p className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5">Style</p>
                    <div className="flex flex-wrap gap-1.5">
                      {SOUND_STYLES.map(s => (
                        <button key={s} onClick={() => setSoundStyle(s)}
                          className={`rounded-lg border px-3 py-1 text-[10px] font-mono transition-colors ${soundStyle === s ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}>{s}</button>
                      ))}
                    </div>
                  </div>
                  <button onClick={generateSound} disabled={!soundPrompt.trim() || isGeneratingSound}
                    className="rounded-lg bg-primary px-5 py-2 font-heading text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity">
                    {isGeneratingSound ? 'Generating...' : '🔊 Generate Sound'}
                  </button>
                  <p className="text-[8px] text-muted-foreground">Exports as OGG and MP3 simultaneously.</p>
                </div>
              )}

              {/* Music (#55) */}
              {activeTab === 'music' && (
                <div className="p-5 space-y-4">
                  <div>
                    <p className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5">Track description</p>
                    <textarea value={musicPrompt} onChange={e => setMusicPrompt(e.target.value)}
                      placeholder="e.g. 'an intense boss battle theme with rising tension'"
                      className="w-full bg-background border border-border rounded-lg p-3 text-xs font-mono min-h-[60px] resize-none text-foreground placeholder:text-muted-foreground focus:outline-none" />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <p className="text-[9px] font-mono uppercase text-muted-foreground mb-1">Genre</p>
                      <div className="flex flex-wrap gap-1">
                        {MUSIC_GENRES.map(g => (
                          <button key={g} onClick={() => setMusicGenre(g)}
                            className={`rounded px-2 py-0.5 text-[9px] font-mono ${musicGenre === g ? 'bg-primary/10 text-primary border border-primary/30' : 'border border-border text-muted-foreground'}`}>{g}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[9px] font-mono uppercase text-muted-foreground mb-1">BPM</p>
                      <input type="range" min={60} max={200} value={musicBPM} onChange={e => setMusicBPM(Number(e.target.value))}
                        className="w-full h-1.5 bg-muted rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary" />
                      <span className="text-[10px] font-mono text-foreground">{musicBPM} BPM</span>
                    </div>
                    <div>
                      <p className="text-[9px] font-mono uppercase text-muted-foreground mb-1">Mood</p>
                      <div className="flex flex-wrap gap-1">
                        {['energetic', 'dark', 'calm', 'heroic', 'mysterious'].map(m => (
                          <button key={m} onClick={() => setMusicMood(m)}
                            className={`rounded px-2 py-0.5 text-[9px] font-mono ${musicMood === m ? 'bg-primary/10 text-primary border border-primary/30' : 'border border-border text-muted-foreground'}`}>{m}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button onClick={generateMusic} disabled={!musicPrompt.trim() || isGeneratingMusic}
                    className="rounded-lg bg-primary px-5 py-2 font-heading text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity">
                    {isGeneratingMusic ? 'Generating loop...' : '🎵 Generate Music'}
                  </button>
                  <p className="text-[8px] text-muted-foreground">Generates a seamless looping track.</p>
                </div>
              )}

              {/* Asset Manager (#56-57) */}
              {activeTab === 'manager' && (
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-heading font-semibold">{assets.length} Assets</span>
                      <span className="text-[10px] font-mono text-muted-foreground">{totalSize.toFixed(1)} MB total</span>
                      {duplicates.length > 0 && (
                        <span className="rounded-full bg-yellow-500/10 border border-yellow-500/30 px-2 py-0.5 text-[9px] font-mono text-yellow-500">
                          {duplicates.length} duplicates detected
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono text-muted-foreground">Max bundle:</span>
                      <input type="number" value={maxBundleSize} onChange={e => setMaxBundleSize(Number(e.target.value))}
                        className="w-16 bg-background border border-border rounded px-2 py-0.5 text-[10px] font-mono text-foreground" />
                      <span className="text-[9px] font-mono text-muted-foreground">MB</span>
                      <button onClick={() => toast.info('Auto-compressor would run here')}
                        className="rounded-lg border border-border px-2 py-1 text-[9px] font-mono text-muted-foreground hover:text-foreground">
                        🗜️ Compress
                      </button>
                    </div>
                  </div>
                  {assets.length === 0 ? (
                    <p className="text-xs text-muted-foreground font-mono text-center py-12">Generate sprites, sounds, or music to populate the asset manager.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {assets.map(asset => (
                        <div key={asset.id} className="flex items-center gap-3 rounded-lg border border-border bg-background p-2.5">
                          <span className="text-lg">{asset.type === 'sprite' ? '🎨' : asset.type === 'sound' ? '🔊' : asset.type === 'music' ? '🎵' : '📦'}</span>
                          <div className="flex-1">
                            <p className="text-[11px] font-mono font-semibold text-foreground">{asset.name}</p>
                            <p className="text-[9px] text-muted-foreground font-mono">{asset.size} · v{asset.versions} · {new Date(asset.timestamp).toLocaleTimeString()}</p>
                          </div>
                          <button className="text-[9px] font-mono text-muted-foreground hover:text-foreground px-2 py-1 rounded border border-border">Swap</button>
                          <button className="text-[9px] font-mono text-muted-foreground hover:text-foreground px-2 py-1 rounded border border-border">History</button>
                          <button className="text-[9px] font-mono text-destructive hover:text-destructive/80 px-2 py-1 rounded border border-destructive/30"
                            onClick={() => setAssets(prev => prev.filter(a => a.id !== asset.id))}>×</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Texture Atlas (#58) */}
              {activeTab === 'atlas' && (
                <div className="p-5 space-y-4">
                  <p className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">Texture Atlas Builder</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-2">Select sprites to pack:</p>
                      {assets.filter(a => a.type === 'sprite').length === 0 ? (
                        <p className="text-[10px] text-muted-foreground/50 font-mono">No sprites generated yet.</p>
                      ) : (
                        assets.filter(a => a.type === 'sprite').map(a => (
                          <label key={a.id} className="flex items-center gap-2 text-[10px] font-mono mb-1 cursor-pointer">
                            <input type="checkbox" checked={atlasSprites.includes(a.id)}
                              onChange={e => setAtlasSprites(prev => e.target.checked ? [...prev, a.id] : prev.filter(id => id !== a.id))}
                              className="rounded border-border" />
                            {a.name}
                          </label>
                        ))
                      )}
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="text-[9px] font-mono text-muted-foreground">Padding (px)</label>
                        <input type="number" value={atlasPadding} onChange={e => setAtlasPadding(Number(e.target.value))}
                          className="w-full bg-background border border-border rounded px-2 py-1 text-[10px] font-mono text-foreground" />
                      </div>
                      <label className="flex items-center gap-2 text-[10px] font-mono cursor-pointer">
                        <input type="checkbox" checked={atlasPOT} onChange={e => setAtlasPOT(e.target.checked)} className="rounded border-border" />
                        Power-of-two size
                      </label>
                      <button onClick={() => toast.success('Atlas built!')} disabled={atlasSprites.length < 2}
                        className="w-full rounded-lg bg-primary px-4 py-2 text-[10px] font-heading font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity">
                        Build Atlas ({atlasSprites.length} sprites)
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default AssetTools;
