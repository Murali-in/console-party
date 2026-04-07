import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Helmet } from 'react-helmet-async';
import { toast } from 'sonner';
import PreviewToolbar from '@/components/studio/PreviewToolbar';

/* ── Types ─────────────────────────────────── */
interface PromptEntry {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  engine?: string;
  mode?: 'create' | 'patch';
}

interface ExtractedMechanics {
  genre: string;
  playerCount: string;
  winCondition: string;
  physicsType: string;
  artStyle: string;
  engine: string;
  engineName: string;
}

/* ── Constants ─────────────────────────────── */
const EXAMPLE_PROMPTS = [
  "A 2D platformer with double-jump and wall-slide mechanics",
  "Top-down zombie survival shooter with wave-based enemies",
  "3D first-person maze explorer with collectible orbs",
  "Simple retro snake game with AI opponents",
  "Puzzle game where players rotate gravity to solve levels",
  "Asteroids clone with shield mechanics and boss waves",
];

const ENGINE_LABELS: Record<string, { label: string; color: string }> = {
  phaser: { label: 'Phaser 3', color: 'text-cyan-400' },
  threejs: { label: 'Three.js', color: 'text-purple-400' },
  kaboom: { label: 'Kaboom.js', color: 'text-yellow-400' },
};

/* ── Mechanic Extraction ─────────────────────── */
function extractMechanics(prompt: string): Partial<ExtractedMechanics> {
  const lower = prompt.toLowerCase();
  const result: Partial<ExtractedMechanics> = {};
  const genres = ['platformer','shooter','puzzle','racing','rpg','survival','strategy','fighting','sports','arcade','runner','tower defense'];
  result.genre = genres.find(g => lower.includes(g)) || 'arcade';
  if (/\b(multiplayer|co.op|pvp|versus)\b/.test(lower)) result.playerCount = '2-4 players';
  else result.playerCount = '1 player';
  if (/\b(score|points|high.score)\b/.test(lower)) result.winCondition = 'High score';
  else if (/\b(survive|survival|waves)\b/.test(lower)) result.winCondition = 'Survival';
  else if (/\b(finish|complete|levels)\b/.test(lower)) result.winCondition = 'Level completion';
  else result.winCondition = 'Score-based';
  if (/\b(gravity|jump|fall|bounce)\b/.test(lower)) result.physicsType = 'Gravity + Collisions';
  else if (/\b(top.down)\b/.test(lower)) result.physicsType = 'Top-down collisions';
  else result.physicsType = 'Arcade physics';
  if (/\b(pixel|8.bit|retro)\b/.test(lower)) result.artStyle = 'Pixel / Retro';
  else if (/\b(neon|glow|cyber)\b/.test(lower)) result.artStyle = 'Neon / Cyberpunk';
  else result.artStyle = 'Neon / Minimal';
  const is3D = /\b(3d|first.person|third.person|fps|tps|voxel)\b/.test(lower);
  const isSimple = /\b(simple|retro|pixel|8.bit|game.jam|quick|tiny|mini)\b/.test(lower);
  if (is3D) { result.engine = 'threejs'; result.engineName = 'Three.js'; }
  else if (isSimple) { result.engine = 'kaboom'; result.engineName = 'Kaboom.js'; }
  else { result.engine = 'phaser'; result.engineName = 'Phaser 3'; }
  return result;
}

/* ── Conflict Detection ─────────────────────── */
function detectConflict(oldPrompt: string, newPrompt: string): string | null {
  const contradictions = [
    { a: /\b(remove|delete|no)\s+(jump)/i, b: /\b(add|double.jump|wall.jump)\b/i, desc: 'Jump mechanics' },
    { a: /\b(2d|side.scroll|top.down)\b/i, b: /\b(3d|first.person|third.person)\b/i, desc: 'Dimension (2D vs 3D)' },
    { a: /\b(remove|no)\s+(enemies|shooting)\b/i, b: /\b(add|more)\s+(enemies|shooting)\b/i, desc: 'Combat system' },
    { a: /\b(slow|calm|peaceful)\b/i, b: /\b(fast|intense|action)\b/i, desc: 'Game pace' },
  ];
  for (const c of contradictions) {
    if ((c.a.test(oldPrompt) && c.b.test(newPrompt)) || (c.b.test(oldPrompt) && c.a.test(newPrompt))) return c.desc;
  }
  return null;
}

/* ── SSE Stream Parser ─────────────────────── */
async function streamFromAPI(
  body: Record<string, unknown>,
  onDelta: (text: string) => void,
  onEngine: (engine: string, engineName: string) => void,
  onDone: () => void,
  signal?: AbortSignal,
) {
  const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-game`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
    body: JSON.stringify(body),
    signal,
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: 'Generation failed' }));
    throw new Error(err.error || `HTTP ${resp.status}`);
  }
  if (!resp.body) throw new Error('No response body');
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf('\n')) !== -1) {
      let line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 1);
      if (line.endsWith('\r')) line = line.slice(0, -1);
      if (line.startsWith(':') || line.trim() === '') continue;
      if (!line.startsWith('data: ')) continue;
      const jsonStr = line.slice(6).trim();
      if (jsonStr === '[DONE]') { onDone(); return; }
      try {
        const parsed = JSON.parse(jsonStr);
        if (parsed.custom === 'engine_info') { onEngine(parsed.engine, parsed.engineName); continue; }
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) onDelta(content);
      } catch { buffer = line + '\n' + buffer; break; }
    }
  }
  onDone();
}

function cleanCode(raw: string): string {
  let c = raw.trim();
  if (c.startsWith('```html')) c = c.slice(7);
  else if (c.startsWith('```')) c = c.slice(3);
  if (c.endsWith('```')) c = c.slice(0, -3);
  return c.trim();
}

/* ── Component ─────────────────────────────── */
const GameStudio = () => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [showOutput, setShowOutput] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'code' | 'history' | 'mechanics'>('preview');
  const [charCount, setCharCount] = useState(0);
  const [detectedEngine, setDetectedEngine] = useState('phaser');
  const [mechanics, setMechanics] = useState<Partial<ExtractedMechanics>>({});
  const [promptHistory, setPromptHistory] = useState<PromptEntry[]>([]);
  const [conversationMessages, setConversationMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const [conflictNewPrompt, setConflictNewPrompt] = useState('');
  // Split preview (#17)
  const [splitPreview, setSplitPreview] = useState(false);
  const [previousCode, setPreviousCode] = useState('');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const codeRef = useRef('');

  const previewTools = PreviewToolbar({
    iframeRef,
    generatedCode,
    onRestart: () => {
      if (iframeRef.current) {
        iframeRef.current.srcdoc = '';
        setTimeout(() => { if (iframeRef.current) iframeRef.current.srcdoc = previewTools.getInjectedCode(); }, 50);
      }
    },
  });

  const generate = useCallback(async (gamePrompt: string, mode: 'create' | 'patch' = 'create') => {
    if (!gamePrompt.trim()) return;
    if (mode === 'patch' && promptHistory.length > 0) {
      const lastUserPrompt = promptHistory.filter(p => p.role === 'user').pop()?.content || '';
      const conflict = detectConflict(lastUserPrompt, gamePrompt);
      if (conflict && !conflictWarning) { setConflictWarning(conflict); setConflictNewPrompt(gamePrompt); return; }
    }
    setConflictWarning(null);
    const mech = extractMechanics(gamePrompt);
    setMechanics(mech);

    // Save previous for split preview
    if (generatedCode) setPreviousCode(generatedCode);

    setIsGenerating(true);
    setShowOutput(true);
    setActiveTab('code');
    setCharCount(0);
    codeRef.current = '';
    setGeneratedCode('');
    abortRef.current = new AbortController();

    const isPatching = mode === 'patch' && previousCode.length > 0;
    const newMsg = { role: 'user' as const, content: isPatching ? `Modify the existing game: ${gamePrompt}` : `Create this game: ${gamePrompt}` };
    const updatedConversation = [...conversationMessages, newMsg];
    const reqBody: Record<string, unknown> = { prompt: gamePrompt, messages: updatedConversation, mode: isPatching ? 'patch' : 'create', engine: mech.engine };
    if (isPatching) reqBody.existingCode = previousCode;

    setPromptHistory(prev => [...prev, { id: crypto.randomUUID(), role: 'user', content: gamePrompt, timestamp: Date.now(), engine: mech.engine, mode: isPatching ? 'patch' : 'create' }]);

    try {
      await streamFromAPI(reqBody,
        (text) => { codeRef.current += text; setCharCount(prev => prev + text.length); setGeneratedCode(codeRef.current); },
        (engine, engineName) => { setDetectedEngine(engine); setMechanics(prev => ({ ...prev, engine, engineName })); },
        () => {
          const clean = cleanCode(codeRef.current);
          setGeneratedCode(clean);
          codeRef.current = clean;
          setActiveTab('preview');
          setConversationMessages([...updatedConversation, { role: 'assistant', content: clean }]);
          setPromptHistory(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: `Generated ${clean.split('\n').length} lines`, timestamp: Date.now(), engine: detectedEngine }]);
          toast.success('Game generated!');
        },
        abortRef.current.signal,
      );
    } catch (e: any) {
      if (e.name === 'AbortError') toast.info('Cancelled.');
      else toast.error(e.message);
    } finally { setIsGenerating(false); abortRef.current = null; }
  }, [generatedCode, previousCode, conversationMessages, promptHistory, conflictWarning, detectedEngine]);

  const handleGenerate = () => generate(prompt, generatedCode.length > 0 ? 'patch' : 'create');
  const handleNewGame = () => { setGeneratedCode(''); setPreviousCode(''); setConversationMessages([]); setPromptHistory([]); setMechanics({}); setShowOutput(false); setPrompt(''); setSplitPreview(false); };
  const handleCancel = () => abortRef.current?.abort();
  const handleDownload = () => { const b = new Blob([generatedCode], { type: 'text/html' }); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = 'eternity-game.html'; a.click(); URL.revokeObjectURL(u); };
  const handleCopy = () => { navigator.clipboard.writeText(generatedCode); toast.success('Copied!'); };
  const handleConflictResolve = (keep: 'old' | 'new') => { if (keep === 'new') { setConflictWarning(null); generate(conflictNewPrompt, 'patch'); } else { setConflictWarning(null); setConflictNewPrompt(''); } };

  const engineInfo = ENGINE_LABELS[detectedEngine] || ENGINE_LABELS.phaser;
  const deviceFrame = previewTools.deviceFrame;

  return (
    <>
      <Helmet>
        <title>Eternity Game Studio — AI Game Generator</title>
        <meta name="description" content="Create playable games from a single sentence. AI-powered with streaming code, multi-turn refinement, engine auto-selection, conflict resolver, and more." />
      </Helmet>
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <main className="pt-[60px]">
          {/* Hero */}
          <section className="relative overflow-hidden border-b border-border">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/3" />
            <div className="mx-auto max-w-5xl px-4 py-8 md:py-14 text-center relative">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <span className="inline-block rounded-full border border-primary/30 bg-primary/10 px-4 py-1 font-mono text-[10px] uppercase tracking-widest text-primary mb-3">
                  Eternity Game Studio
                </span>
                <h1 className="font-heading text-2xl md:text-4xl font-bold leading-tight mb-2">
                  One sentence. <span className="text-primary">One playable game.</span>
                </h1>
                <p className="text-muted-foreground text-xs max-w-lg mx-auto">
                  Describe → Stream → Play → Refine. Full preview toolkit with FPS counter, speed control, recording, and console.
                </p>
              </motion.div>
            </div>
          </section>

          {/* Conflict Modal */}
          <AnimatePresence>
            {conflictWarning && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
                <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="rounded-xl border border-destructive/30 bg-card p-6 max-w-md w-full">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-destructive">⚠️</span>
                    <h3 className="font-heading text-sm font-semibold">Conflict Detected: {conflictWarning}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">Your new prompt contradicts a previous instruction. Which behaviour to keep?</p>
                  <div className="flex gap-3">
                    <button onClick={() => handleConflictResolve('old')} className="flex-1 rounded-lg border border-border px-4 py-2 text-xs font-heading text-muted-foreground hover:text-foreground transition-colors">Keep Previous</button>
                    <button onClick={() => handleConflictResolve('new')} className="flex-1 rounded-lg bg-primary px-4 py-2 text-xs font-heading font-semibold text-primary-foreground hover:opacity-90 transition-opacity">Apply New</button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Prompt */}
          <section className="mx-auto max-w-4xl px-4 py-5">
            {prompt.trim().length > 10 && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-2 rounded-lg border border-border bg-card/50 p-2.5">
                <p className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5">Detected</p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(extractMechanics(prompt)).map(([k, v]) => (
                    <span key={k} className="rounded-full border border-border bg-background px-2 py-0.5 text-[9px] font-mono">
                      <span className="text-muted-foreground">{k}: </span><span className="text-foreground">{v}</span>
                    </span>
                  ))}
                </div>
              </motion.div>
            )}
            <div className="rounded-xl border border-border bg-card p-1">
              <textarea value={prompt} onChange={(e) => setPrompt(e.target.value.slice(0, 2000))}
                placeholder={generatedCode ? "Refine: 'add double jump', 'make enemies faster'..." : "Describe your game..."}
                className="w-full bg-transparent text-foreground placeholder:text-muted-foreground resize-none p-3 text-sm font-mono focus:outline-none min-h-[70px]"
                disabled={isGenerating}
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleGenerate(); } }}
              />
              <div className="flex items-center justify-between border-t border-border p-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground font-mono">{prompt.length}/2000</span>
                  {generatedCode && <span className="rounded-full bg-primary/5 border border-primary/20 px-2 py-0.5 text-[9px] font-mono text-primary">Patch mode</span>}
                </div>
                <div className="flex gap-2">
                  {generatedCode && !isGenerating && <button onClick={handleNewGame} className="rounded-lg border border-border px-3 py-1.5 text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors">New</button>}
                  {isGenerating && <button onClick={handleCancel} className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs font-heading text-destructive">Stop</button>}
                  <button onClick={handleGenerate} disabled={!prompt.trim() || isGenerating}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-1.5 font-heading text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity">
                    {isGenerating ? `${charCount} chars...` : generatedCode ? '⚡ Patch' : '⚡ Generate'}
                  </button>
                </div>
              </div>
            </div>
            {!generatedCode && !isGenerating && (
              <div className="mt-3">
                <p className="text-[9px] text-muted-foreground font-mono uppercase tracking-wider mb-1.5">Examples</p>
                <div className="flex flex-wrap gap-1.5">
                  {EXAMPLE_PROMPTS.map((ex, i) => (
                    <button key={i} onClick={() => setPrompt(ex)} className="rounded-lg border border-border bg-card/50 px-2.5 py-1 text-[10px] text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors text-left">{ex}</button>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Output */}
          <AnimatePresence>
            {showOutput && (
              <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-5xl px-4 pb-8">
                <div className="flex items-center gap-1 mb-2 overflow-x-auto">
                  {(['preview', 'code', 'history', 'mechanics'] as const).map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                      className={`px-3 py-1.5 rounded-t-lg text-[11px] font-heading font-medium transition-colors whitespace-nowrap ${activeTab === tab ? 'bg-card border border-b-0 border-border text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                      {tab === 'preview' && '🎮 Preview'}{tab === 'code' && '</> Code'}{tab === 'history' && '📜 History'}{tab === 'mechanics' && '🔧 Mechanics'}
                    </button>
                  ))}
                  <div className="ml-auto flex items-center gap-1.5">
                    {/* Split preview toggle */}
                    {previousCode && !isGenerating && (
                      <button onClick={() => setSplitPreview(!splitPreview)}
                        className={`rounded-lg border px-2 py-1 text-[9px] font-mono transition-colors ${splitPreview ? 'border-primary/30 bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}>
                        {splitPreview ? '◫ Split ON' : '◫ Split'}
                      </button>
                    )}
                    <span className={`rounded-full border border-border bg-background px-2 py-0.5 text-[9px] font-mono ${engineInfo.color}`}>{engineInfo.label}</span>
                    {generatedCode && !isGenerating && (
                      <>
                        <button onClick={handleCopy} className="rounded-lg border border-border px-2 py-1 text-[9px] font-mono text-muted-foreground hover:text-foreground">Copy</button>
                        <button onClick={handleDownload} className="rounded-lg bg-primary px-2 py-1 text-[9px] font-heading font-semibold text-primary-foreground hover:opacity-90">Download</button>
                      </>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  {activeTab === 'preview' && (
                    <>
                      {/* Preview Toolbar (#14-#23) */}
                      {generatedCode && !isGenerating && previewTools.toolbar}

                      {generatedCode && !isGenerating ? (
                        <div className={`${splitPreview ? 'grid grid-cols-2 gap-0.5 bg-border' : ''}`}>
                          {/* Current version */}
                          <div className="relative bg-[#0a0a1a] flex items-center justify-center" style={deviceFrame.id !== 'none' ? { padding: '16px' } : {}}>
                            {deviceFrame.id !== 'none' && <p className="absolute top-1 left-3 text-[8px] font-mono text-muted-foreground/40">{splitPreview ? 'NEW' : deviceFrame.label}</p>}
                            <div className={deviceFrame.bezel ? 'rounded-xl border-2 border-muted-foreground/20 overflow-hidden shadow-2xl' : 'w-full'}
                              style={deviceFrame.id !== 'none' ? { width: deviceFrame.width, height: deviceFrame.height, maxWidth: '100%', maxHeight: '60vh' } : { aspectRatio: '16/9' }}>
                              <iframe ref={iframeRef} srcDoc={previewTools.getInjectedCode()} className="w-full h-full border-0" sandbox="allow-scripts allow-same-origin" title="Game Preview" />
                            </div>
                          </div>
                          {/* Previous version (split) */}
                          {splitPreview && previousCode && (
                            <div className="relative bg-[#0a0a1a] flex items-center justify-center" style={deviceFrame.id !== 'none' ? { padding: '16px' } : {}}>
                              <p className="absolute top-1 left-3 text-[8px] font-mono text-muted-foreground/40">PREVIOUS</p>
                              <div className={deviceFrame.bezel ? 'rounded-xl border-2 border-muted-foreground/20 overflow-hidden shadow-2xl' : 'w-full'}
                                style={deviceFrame.id !== 'none' ? { width: deviceFrame.width, height: deviceFrame.height, maxWidth: '100%', maxHeight: '60vh' } : { aspectRatio: '16/9' }}>
                                <iframe srcDoc={previousCode} className="w-full h-full border-0" sandbox="allow-scripts allow-same-origin" title="Previous Version" />
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="aspect-video flex items-center justify-center">
                          <p className="text-xs font-mono text-muted-foreground">{isGenerating ? 'Generating...' : 'Generate a game to preview'}</p>
                        </div>
                      )}

                      {/* Console Panel (#22) */}
                      {previewTools.consolePanel}
                    </>
                  )}

                  {activeTab === 'code' && (
                    <pre className="p-3 text-[11px] font-mono text-muted-foreground overflow-auto max-h-[500px] leading-relaxed">
                      <code>
                        {(generatedCode || 'Waiting...').split('\n').map((line, i) => (
                          <div key={i} className="flex group">
                            <span className="select-none w-8 text-right pr-3 text-muted-foreground/30 text-[10px]">{i + 1}</span>
                            <span className="flex-1">{line}</span>
                            {!isGenerating && promptHistory.filter(p => p.role === 'user').length > 0 && (
                              <span className="opacity-0 group-hover:opacity-100 ml-4 text-[9px] text-primary/40 whitespace-nowrap transition-opacity">
                                ← prompt #{Math.min(Math.ceil((i + 1) / Math.max(1, generatedCode.split('\n').length / promptHistory.filter(p => p.role === 'user').length)), promptHistory.filter(p => p.role === 'user').length)}
                              </span>
                            )}
                          </div>
                        ))}
                      </code>
                      {isGenerating && <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-0.5" />}
                    </pre>
                  )}

                  {activeTab === 'history' && (
                    <div className="p-4 max-h-[500px] overflow-auto">
                      {promptHistory.length === 0 ? (
                        <p className="text-xs text-muted-foreground font-mono text-center py-8">No history yet.</p>
                      ) : (
                        <div className="space-y-2">
                          {promptHistory.map((entry, i) => (
                            <div key={entry.id} className={`rounded-lg border p-2.5 ${entry.role === 'user' ? 'border-primary/20 bg-primary/5' : 'border-border bg-background'}`}>
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className={`text-[10px] font-mono font-bold ${entry.role === 'user' ? 'text-primary' : 'text-green-500'}`}>{entry.role === 'user' ? '→' : '←'}</span>
                                <span className="text-[9px] text-muted-foreground font-mono">#{i + 1} · {new Date(entry.timestamp).toLocaleTimeString()}</span>
                                {entry.mode && <span className={`text-[8px] font-mono rounded-full px-1.5 py-0.5 ${entry.mode === 'patch' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-green-500/10 text-green-500'}`}>{entry.mode}</span>}
                                {entry.engine && <span className={`text-[8px] font-mono ${ENGINE_LABELS[entry.engine]?.color || ''}`}>{ENGINE_LABELS[entry.engine]?.label}</span>}
                              </div>
                              <p className="text-[11px] text-foreground">{entry.content}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'mechanics' && (
                    <div className="p-4">
                      {Object.keys(mechanics).length === 0 ? (
                        <p className="text-xs text-muted-foreground font-mono text-center py-8">Type a prompt to see mechanics.</p>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                          {Object.entries(mechanics).map(([k, v]) => (
                            <div key={k} className="rounded-lg border border-border bg-background p-2.5">
                              <p className="text-[9px] font-mono uppercase text-muted-foreground mb-0.5">{k.replace(/([A-Z])/g, ' $1')}</p>
                              <p className="text-xs font-heading font-semibold">{v}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between mt-1.5 px-1">
                  <div className="flex items-center gap-2">
                    {isGenerating && <span className="flex items-center gap-1 text-[10px] text-primary font-mono"><span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />Streaming</span>}
                    {!isGenerating && generatedCode && <span className="flex items-center gap-1 text-[10px] text-green-500 font-mono"><span className="h-1.5 w-1.5 rounded-full bg-green-500" />Ready</span>}
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {generatedCode.length > 0 && `${generatedCode.length} chars · ${generatedCode.split('\n').length} lines · ${promptHistory.filter(p => p.role === 'user').length} prompts`}
                  </span>
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          {/* Feature Grid */}
          <section className="border-t border-border bg-card/30">
            <div className="mx-auto max-w-5xl px-4 py-10">
              <h2 className="font-heading text-lg font-semibold text-center mb-6">Built-in Intelligence</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { icon: '⚡', title: 'Streaming Build', desc: 'Code written character-by-character' },
                  { icon: '🔧', title: 'Incremental Patch', desc: 'Modify only affected code' },
                  { icon: '⚠️', title: 'Conflict Resolver', desc: 'Detects contradicting prompts' },
                  { icon: '🔍', title: 'Mechanic Extraction', desc: 'Auto-detect genre, physics, win condition' },
                  { icon: '🎮', title: 'Engine Auto-Select', desc: 'Phaser, Three.js, or Kaboom' },
                  { icon: '💬', title: 'Multi-Turn', desc: 'AI remembers all prior instructions' },
                  { icon: '📜', title: 'Prompt History', desc: 'Replayable command log' },
                  { icon: '🏷️', title: 'Prompt Blame', desc: 'Hover to see which prompt wrote each line' },
                  { icon: '📊', title: 'FPS Counter', desc: 'Real-time performance overlay' },
                  { icon: '🐢', title: 'Speed Control', desc: '0.25× to 2× playback speed' },
                  { icon: '📱', title: 'Device Frames', desc: 'Phone, tablet, desktop, arcade' },
                  { icon: '⏺', title: 'Video Recorder', desc: 'One-click WebM recording' },
                  { icon: '🖥️', title: 'Console', desc: 'Intercepts all game console.log' },
                  { icon: '⏸', title: 'Auto-Pause', desc: 'Freeze on runtime errors' },
                  { icon: '◫', title: 'Split Preview', desc: 'Before/after side-by-side' },
                  { icon: '💾', title: 'Download', desc: 'Export as standalone HTML' },
                ].map((f, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.03 }}
                    className="rounded-lg border border-border bg-card p-2.5 text-center">
                    <span className="text-lg">{f.icon}</span>
                    <h3 className="font-heading text-[11px] font-semibold mt-0.5">{f.title}</h3>
                    <p className="text-[9px] text-muted-foreground mt-0.5">{f.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default GameStudio;
