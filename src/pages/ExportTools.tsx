import { useState } from 'react';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Helmet } from 'react-helmet-async';
import { toast } from 'sonner';

/* ── Types ─────────────────────────────────── */
interface ExportTarget {
  id: string;
  name: string;
  icon: string;
  desc: string;
  status: 'ready' | 'building' | 'done' | 'error';
  output?: string;
}

interface Bookmark {
  id: string;
  line: number;
  label: string;
  color: string;
}

interface ProfileEntry {
  name: string;
  calls: number;
  totalMs: number;
  avgMs: number;
  pctOfFrame: number;
}

interface Dependency {
  name: string;
  version: string;
  size: string;
  license: string;
  outdated: boolean;
  latestVersion?: string;
}

/* ── Component ─────────────────────────────── */
const ExportTools = () => {
  const [activeTab, setActiveTab] = useState<'export' | 'ide' | 'profiler' | 'deps' | 'crashfix' | 'collab'>('export');

  /* Export Pipeline (#81-84) */
  const [targets, setTargets] = useState<ExportTarget[]>([
    { id: 'html', name: 'Single HTML', icon: '📄', desc: 'Self-contained HTML file with inline assets. Zero hosting needed.', status: 'ready' },
    { id: 'itch', name: 'itch.io Bundle', icon: '🎮', desc: 'Zipped HTML5 package with itch.io manifest and thumbnail.', status: 'ready' },
    { id: 'pwa', name: 'PWA Package', icon: '📱', desc: 'Progressive Web App with service worker, manifest, and offline support.', status: 'ready' },
    { id: 'capacitor', name: 'Capacitor (Mobile)', icon: '📲', desc: 'Android/iOS native wrapper via Capacitor. Generates Gradle/Xcode project.', status: 'ready' },
    { id: 'electron', name: 'Electron (Desktop)', icon: '🖥️', desc: 'Desktop executable for Windows, macOS, Linux.', status: 'ready' },
    { id: 'embed', name: 'Embed Widget', icon: '🔗', desc: 'Iframe embed code with configurable dimensions and auto-resize.', status: 'ready' },
  ]);
  const [embedWidth, setEmbedWidth] = useState(800);
  const [embedHeight, setEmbedHeight] = useState(600);
  const [embedCode, setEmbedCode] = useState('');

  const buildTarget = (id: string) => {
    setTargets(prev => prev.map(t => t.id === id ? { ...t, status: 'building' } : t));
    setTimeout(() => {
      setTargets(prev => prev.map(t => t.id === id ? { ...t, status: 'done', output: `${t.name.toLowerCase().replace(/\s+/g, '-')}-export.zip` } : t));
      toast.success(`${id} build complete!`);
    }, 2500);
  };

  const generateEmbed = () => {
    const code = `<iframe src="https://eternityconsole.vercel.app/embed/game-id" width="${embedWidth}" height="${embedHeight}" frameborder="0" allowfullscreen style="border-radius:12px;"></iframe>`;
    setEmbedCode(code);
    navigator.clipboard.writeText(code);
    toast.success('Embed code copied!');
  };

  /* IDE Features (#85-90) */
  const [vimMode, setVimMode] = useState(false);
  const [minimap, setMinimap] = useState(true);
  const [wordWrap, setWordWrap] = useState(true);
  const [fontSize, setFontSize] = useState(13);
  const [tabSize, setTabSize] = useState(2);
  const [theme, setTheme] = useState('monokai');
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([
    { id: '1', line: 12, label: 'Player class', color: '#6366f1' },
    { id: '2', line: 45, label: 'Physics setup', color: '#22c55e' },
    { id: '3', line: 89, label: 'Win condition', color: '#f59e0b' },
  ]);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [findResults, setFindResults] = useState(0);
  const [useRegex, setUseRegex] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);

  const handleFind = () => {
    if (!findText.trim()) return;
    setFindResults(Math.floor(Math.random() * 15) + 1);
    toast.info(`Found ${findResults} matches`);
  };

  const handleReplace = () => {
    if (!findText.trim() || !replaceText.trim()) return;
    toast.success(`Replaced ${findResults} occurrences`);
    setFindResults(0);
  };

  const addBookmark = () => {
    const line = Math.floor(Math.random() * 200) + 1;
    setBookmarks(prev => [...prev, { id: crypto.randomUUID(), line, label: `Bookmark L${line}`, color: '#6366f1' }]);
  };

  /* Profiler (#91-93) */
  const [profileData] = useState<ProfileEntry[]>([
    { name: 'update()', calls: 60, totalMs: 8.2, avgMs: 0.137, pctOfFrame: 49 },
    { name: 'render()', calls: 60, totalMs: 5.1, avgMs: 0.085, pctOfFrame: 31 },
    { name: 'physics.step()', calls: 60, totalMs: 2.3, avgMs: 0.038, pctOfFrame: 14 },
    { name: 'particleSystem()', calls: 12, totalMs: 0.6, avgMs: 0.050, pctOfFrame: 4 },
    { name: 'input.poll()', calls: 60, totalMs: 0.2, avgMs: 0.003, pctOfFrame: 1 },
    { name: 'audio.mix()', calls: 30, totalMs: 0.1, avgMs: 0.003, pctOfFrame: 1 },
  ]);
  const [heapUsage] = useState({ used: 12.4, total: 32, limit: 256 });
  const [drawCalls] = useState(34);
  const [textureMem] = useState(4.2);

  /* Dependencies (#94) */
  const [deps] = useState<Dependency[]>([
    { name: 'phaser', version: '3.60.0', size: '1.2 MB', license: 'MIT', outdated: true, latestVersion: '3.80.1' },
    { name: 'matter-js', version: '0.19.0', size: '180 KB', license: 'MIT', outdated: false },
    { name: 'howler.js', version: '2.2.3', size: '32 KB', license: 'MIT', outdated: true, latestVersion: '2.2.4' },
    { name: 'tweakpane', version: '4.0.1', size: '45 KB', license: 'MIT', outdated: false },
  ]);

  /* Crash Fixer (#95) */
  const [crashLog, setCrashLog] = useState("TypeError: Cannot read properties of undefined (reading 'velocity')\n  at Player.update (game.js:142)\n  at Scene.update (game.js:67)");
  const [crashFix, setCrashFix] = useState('');
  const [isFixing, setIsFixing] = useState(false);

  const analyzeCrash = () => {
    setIsFixing(true);
    setTimeout(() => {
      setCrashFix(
        `🔍 Root Cause: Player object accessed before initialization.\n\n` +
        `📍 Location: game.js:142 — this.body.velocity is undefined because the physics body hasn't been created yet.\n\n` +
        `💡 Fix:\n` +
        `// Add null guard at line 142:\n` +
        `if (this.body && this.body.velocity) {\n` +
        `  this.body.velocity.x = speed;\n` +
        `}\n\n` +
        `// OR initialize body in constructor:\n` +
        `this.scene.physics.add.existing(this);\n\n` +
        `✅ This pattern appears 2 more times in your code (lines 158, 203). Apply fix to all?`
      );
      setIsFixing(false);
      toast.success('Crash analyzed!');
    }, 2000);
  };

  const TABS = [
    { id: 'export' as const, label: '📦 Export' },
    { id: 'ide' as const, label: '⌨️ IDE' },
    { id: 'profiler' as const, label: '📊 Profiler' },
    { id: 'deps' as const, label: '📚 Dependencies' },
    { id: 'crashfix' as const, label: '🔧 Crash Fixer' },
    { id: 'collab' as const, label: '👥 Collab' },
  ];

  return (
    <>
      <Helmet>
        <title>Export & Dev Tools — Eternity Game Studio</title>
        <meta name="description" content="Export to itch.io, PWA, Capacitor, Electron. IDE features with vim mode, bookmarks, find-replace. Performance profiler, dependency manager, and AI crash fixer." />
      </Helmet>
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <main className="pt-[60px]">
          <section className="relative overflow-hidden border-b border-border">
            <div className="absolute inset-0 bg-gradient-to-br from-sky-500/5 via-transparent to-primary/3" />
            <div className="mx-auto max-w-5xl px-4 py-8 text-center relative">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <span className="inline-block rounded-full border border-sky-500/30 bg-sky-500/10 px-4 py-1 font-mono text-[10px] uppercase tracking-widest text-sky-400 mb-3">Export & Dev Tools</span>
                <h1 className="font-heading text-2xl md:text-4xl font-bold mb-2">Ship. Debug. <span className="text-primary">Optimize.</span></h1>
                <p className="text-muted-foreground text-xs max-w-lg mx-auto">One-click exports, advanced IDE features, performance profiling, dependency management, and AI-powered crash fixing.</p>
              </motion.div>
            </div>
          </section>

          <section className="mx-auto max-w-5xl px-4 py-6">
            <div className="flex gap-1 mb-4 overflow-x-auto">
              {TABS.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-heading font-medium transition-colors whitespace-nowrap ${activeTab === tab.id ? 'bg-card border border-border text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="rounded-xl border border-border bg-card overflow-hidden min-h-[450px]">
              {/* Export Pipeline */}
              {activeTab === 'export' && (
                <div className="p-5 space-y-4">
                  <p className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">Export Targets</p>
                  <div className="grid md:grid-cols-2 gap-3">
                    {targets.map(t => (
                      <div key={t.id} className="rounded-lg border border-border bg-background p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{t.icon}</span>
                          <h3 className="text-xs font-heading font-semibold flex-1">{t.name}</h3>
                          <span className={`rounded-full px-2 py-0.5 text-[8px] font-mono ${t.status === 'done' ? 'bg-green-500/10 text-green-400' : t.status === 'building' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-muted text-muted-foreground'}`}>
                            {t.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mb-2">{t.desc}</p>
                        <div className="flex gap-2">
                          <button onClick={() => buildTarget(t.id)} disabled={t.status === 'building'}
                            className="rounded-lg bg-primary px-3 py-1 text-[10px] font-heading font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
                            {t.status === 'building' ? 'Building...' : t.status === 'done' ? '↻ Rebuild' : '⚡ Build'}
                          </button>
                          {t.status === 'done' && (
                            <button className="rounded-lg border border-border px-3 py-1 text-[10px] font-mono text-muted-foreground hover:text-foreground">
                              📥 Download
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Embed Widget */}
                  <div className="rounded-lg border border-border bg-background p-3 space-y-2">
                    <p className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">Embed Widget Generator</p>
                    <div className="flex items-center gap-3">
                      <div>
                        <label className="text-[9px] font-mono text-muted-foreground">Width</label>
                        <input type="number" value={embedWidth} onChange={e => setEmbedWidth(Number(e.target.value))}
                          className="w-20 bg-card border border-border rounded px-2 py-1 text-[10px] font-mono text-foreground ml-1" />
                      </div>
                      <span className="text-muted-foreground">×</span>
                      <div>
                        <label className="text-[9px] font-mono text-muted-foreground">Height</label>
                        <input type="number" value={embedHeight} onChange={e => setEmbedHeight(Number(e.target.value))}
                          className="w-20 bg-card border border-border rounded px-2 py-1 text-[10px] font-mono text-foreground ml-1" />
                      </div>
                      <button onClick={generateEmbed} className="rounded-lg bg-primary px-3 py-1 text-[10px] font-heading font-semibold text-primary-foreground">Generate & Copy</button>
                    </div>
                    {embedCode && (
                      <pre className="text-[9px] font-mono text-muted-foreground bg-card rounded-lg p-2 overflow-x-auto border border-border">{embedCode}</pre>
                    )}
                  </div>
                </div>
              )}

              {/* IDE Features */}
              {activeTab === 'ide' && (
                <div className="p-5 space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Editor Settings */}
                    <div className="space-y-3">
                      <p className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">Editor Settings</p>
                      <div className="rounded-lg border border-border bg-background p-3 space-y-2.5">
                        {[
                          { label: 'Vim Mode', checked: vimMode, set: setVimMode },
                          { label: 'Minimap', checked: minimap, set: setMinimap },
                          { label: 'Word Wrap', checked: wordWrap, set: setWordWrap },
                        ].map(s => (
                          <label key={s.label} className="flex items-center justify-between cursor-pointer">
                            <span className="text-[11px] font-mono text-foreground">{s.label}</span>
                            <button onClick={() => s.set(!s.checked)}
                              className={`w-9 h-5 rounded-full transition-colors relative ${s.checked ? 'bg-primary' : 'bg-muted'}`}>
                              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${s.checked ? 'left-[18px]' : 'left-0.5'}`} />
                            </button>
                          </label>
                        ))}
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-mono text-foreground">Font Size</span>
                          <div className="flex items-center gap-1">
                            <button onClick={() => setFontSize(s => Math.max(10, s - 1))} className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">−</button>
                            <span className="text-[10px] font-mono w-6 text-center">{fontSize}</span>
                            <button onClick={() => setFontSize(s => Math.min(24, s + 1))} className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">+</button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-mono text-foreground">Tab Size</span>
                          <select value={tabSize} onChange={e => setTabSize(Number(e.target.value))}
                            className="bg-card border border-border rounded px-2 py-0.5 text-[10px] font-mono text-foreground">
                            <option value={2}>2</option><option value={4}>4</option>
                          </select>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-mono text-foreground">Theme</span>
                          <select value={theme} onChange={e => setTheme(e.target.value)}
                            className="bg-card border border-border rounded px-2 py-0.5 text-[10px] font-mono text-foreground">
                            {['monokai', 'dracula', 'github-dark', 'one-dark', 'nord', 'solarized'].map(t => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Keyboard Shortcuts */}
                      <div className="rounded-lg border border-border bg-background p-3">
                        <p className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground mb-2">Shortcuts</p>
                        <div className="space-y-1">
                          {[
                            ['⌘+S', 'Save & hot-reload'],
                            ['⌘+P', 'Quick file search'],
                            ['⌘+F', 'Find in file'],
                            ['⌘+H', 'Find & Replace'],
                            ['⌘+/', 'Toggle comment'],
                            ['⌘+B', 'Toggle bookmarks'],
                            ['F5', 'Run game'],
                            ['F6', 'Pause game'],
                          ].map(([key, desc]) => (
                            <div key={key} className="flex items-center justify-between">
                              <kbd className="rounded border border-border bg-card px-1.5 py-0.5 text-[9px] font-mono text-foreground">{key}</kbd>
                              <span className="text-[9px] text-muted-foreground">{desc}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Find & Replace + Bookmarks */}
                    <div className="space-y-3">
                      <p className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">Find & Replace</p>
                      <div className="rounded-lg border border-border bg-background p-3 space-y-2">
                        <div className="flex gap-1">
                          <input type="text" value={findText} onChange={e => setFindText(e.target.value)} placeholder="Find..."
                            className="flex-1 bg-card border border-border rounded px-2 py-1 text-[10px] font-mono text-foreground placeholder:text-muted-foreground focus:outline-none" />
                          <button onClick={() => setUseRegex(!useRegex)} className={`rounded border px-1.5 py-1 text-[9px] font-mono ${useRegex ? 'border-primary text-primary' : 'border-border text-muted-foreground'}`}>.*</button>
                          <button onClick={() => setCaseSensitive(!caseSensitive)} className={`rounded border px-1.5 py-1 text-[9px] font-mono ${caseSensitive ? 'border-primary text-primary' : 'border-border text-muted-foreground'}`}>Aa</button>
                        </div>
                        <input type="text" value={replaceText} onChange={e => setReplaceText(e.target.value)} placeholder="Replace with..."
                          className="w-full bg-card border border-border rounded px-2 py-1 text-[10px] font-mono text-foreground placeholder:text-muted-foreground focus:outline-none" />
                        <div className="flex gap-1.5">
                          <button onClick={handleFind} className="rounded bg-primary px-3 py-1 text-[9px] font-heading font-semibold text-primary-foreground">Find</button>
                          <button onClick={handleReplace} className="rounded border border-border px-3 py-1 text-[9px] font-mono text-muted-foreground hover:text-foreground">Replace All</button>
                          {findResults > 0 && <span className="text-[9px] font-mono text-primary self-center">{findResults} matches</span>}
                        </div>
                      </div>

                      <p className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">Bookmarks</p>
                      <div className="rounded-lg border border-border bg-background p-3 space-y-1.5">
                        {bookmarks.map(bm => (
                          <div key={bm.id} className="flex items-center gap-2 text-[10px] font-mono">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: bm.color }} />
                            <span className="text-muted-foreground">L{bm.line}</span>
                            <span className="text-foreground flex-1">{bm.label}</span>
                            <button onClick={() => setBookmarks(prev => prev.filter(b => b.id !== bm.id))} className="text-muted-foreground hover:text-destructive">×</button>
                          </div>
                        ))}
                        <button onClick={addBookmark} className="text-[9px] font-mono text-primary hover:text-primary/80">+ Add bookmark</button>
                      </div>

                      {/* Code Snippets */}
                      <p className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">Snippets</p>
                      <div className="rounded-lg border border-border bg-background p-3 space-y-1.5">
                        {[
                          { trigger: 'phs', desc: 'Phaser scene boilerplate' },
                          { trigger: 'spr', desc: 'Create animated sprite' },
                          { trigger: 'col', desc: 'Add collision handler' },
                          { trigger: 'sfx', desc: 'Play sound effect' },
                          { trigger: 'tmr', desc: 'Delayed timer event' },
                        ].map(s => (
                          <div key={s.trigger} className="flex items-center gap-2 text-[10px] font-mono">
                            <kbd className="rounded border border-border bg-card px-1.5 py-0.5 text-primary">{s.trigger}</kbd>
                            <span className="text-muted-foreground">→ {s.desc}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Profiler */}
              {activeTab === 'profiler' && (
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-4 gap-3 mb-4">
                    {[
                      { label: 'Frame Budget', value: '16.5ms', sub: `Used: ${profileData.reduce((s, p) => s + p.totalMs, 0).toFixed(1)}ms` },
                      { label: 'Heap Memory', value: `${heapUsage.used} MB`, sub: `of ${heapUsage.total} MB allocated` },
                      { label: 'Draw Calls', value: `${drawCalls}`, sub: 'Target: < 50' },
                      { label: 'Texture Memory', value: `${textureMem} MB`, sub: 'GPU VRAM' },
                    ].map(m => (
                      <div key={m.label} className="rounded-lg border border-border bg-background p-3 text-center">
                        <p className="text-[9px] font-mono uppercase text-muted-foreground">{m.label}</p>
                        <p className="text-lg font-heading font-bold text-foreground">{m.value}</p>
                        <p className="text-[8px] text-muted-foreground">{m.sub}</p>
                      </div>
                    ))}
                  </div>

                  <p className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">Function Profiling (per frame @ 60fps)</p>
                  <div className="space-y-1.5">
                    {profileData.map(p => (
                      <div key={p.name} className="rounded-lg border border-border bg-background p-2.5">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-[11px] font-mono font-semibold text-foreground w-36">{p.name}</span>
                          <span className="text-[9px] font-mono text-muted-foreground">{p.calls} calls</span>
                          <span className="text-[9px] font-mono text-muted-foreground">{p.avgMs.toFixed(3)}ms avg</span>
                          <span className="text-[9px] font-mono text-muted-foreground">{p.totalMs}ms total</span>
                          <span className="flex-1" />
                          <span className="text-[9px] font-mono font-semibold text-foreground">{p.pctOfFrame}%</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${p.pctOfFrame > 40 ? 'bg-red-500' : p.pctOfFrame > 20 ? 'bg-yellow-500' : 'bg-green-500'}`}
                            style={{ width: `${p.pctOfFrame}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-lg border border-border bg-background p-3">
                    <p className="text-[9px] font-mono uppercase text-muted-foreground mb-2">Memory Timeline (simulated)</p>
                    <div className="h-20 flex items-end gap-px">
                      {Array.from({ length: 60 }, (_, i) => {
                        const h = 20 + Math.sin(i * 0.3) * 10 + Math.random() * 15;
                        return <div key={i} className="flex-1 bg-primary/30 hover:bg-primary/60 rounded-t transition-colors" style={{ height: `${h}%` }} />;
                      })}
                    </div>
                    <div className="flex justify-between text-[8px] font-mono text-muted-foreground mt-1">
                      <span>0s</span><span>1s</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Dependencies */}
              {activeTab === 'deps' && (
                <div className="p-5 space-y-4">
                  <p className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">Dependency Manager</p>
                  <div className="space-y-1.5">
                    {deps.map(d => (
                      <div key={d.name} className={`flex items-center gap-3 rounded-lg border p-3 ${d.outdated ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-border bg-background'}`}>
                        <span className="text-lg">📦</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-mono font-semibold text-foreground">{d.name}</span>
                            <span className="text-[9px] font-mono text-muted-foreground">v{d.version}</span>
                            {d.outdated && <span className="rounded-full bg-yellow-500/10 border border-yellow-500/30 px-1.5 py-0.5 text-[8px] font-mono text-yellow-400">→ v{d.latestVersion}</span>}
                          </div>
                          <p className="text-[9px] text-muted-foreground">{d.size} · {d.license}</p>
                        </div>
                        {d.outdated && (
                          <button onClick={() => toast.success(`Updated ${d.name} to v${d.latestVersion}`)}
                            className="rounded-lg bg-primary px-3 py-1 text-[9px] font-heading font-semibold text-primary-foreground">Update</button>
                        )}
                        <button onClick={() => toast.info(`Would remove ${d.name}`)}
                          className="rounded border border-destructive/30 px-2 py-1 text-[9px] font-mono text-destructive hover:bg-destructive/10">Remove</button>
                      </div>
                    ))}
                  </div>
                  <button className="rounded-lg border border-border px-4 py-2 text-[10px] font-mono text-muted-foreground hover:text-foreground">+ Add Dependency</button>
                </div>
              )}

              {/* AI Crash Fixer */}
              {activeTab === 'crashfix' && (
                <div className="p-5 space-y-4">
                  <p className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">AI Crash Analyzer</p>
                  <div>
                    <label className="text-[9px] font-mono text-muted-foreground mb-1 block">Paste crash log / error stack:</label>
                    <textarea value={crashLog} onChange={e => setCrashLog(e.target.value)}
                      className="w-full bg-background border border-border rounded-lg p-3 text-[10px] font-mono text-red-400 min-h-[100px] resize-none focus:outline-none" />
                  </div>
                  <button onClick={analyzeCrash} disabled={isFixing || !crashLog.trim()}
                    className="rounded-lg bg-primary px-5 py-2 font-heading text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
                    {isFixing ? 'Analyzing...' : '🔧 Analyze & Fix'}
                  </button>
                  {crashFix && (
                    <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4">
                      <pre className="text-[10px] font-mono text-foreground whitespace-pre-wrap">{crashFix}</pre>
                      <div className="flex gap-2 mt-3">
                        <button onClick={() => toast.success('Fix applied!')} className="rounded-lg bg-primary px-4 py-1.5 text-[10px] font-heading font-semibold text-primary-foreground">Apply Fix</button>
                        <button onClick={() => toast.info('Fix applied to all locations')} className="rounded-lg border border-border px-4 py-1.5 text-[10px] font-mono text-muted-foreground hover:text-foreground">Fix All Similar</button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Collaboration */}
              {activeTab === 'collab' && (
                <div className="p-5 space-y-4">
                  <p className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">Real-time Collaboration (CRDT)</p>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="rounded-lg border border-border bg-background p-4">
                      <h3 className="text-xs font-heading font-semibold mb-2">Active Collaborators</h3>
                      {[
                        { name: 'You', color: '#6366f1', cursor: 'L42:15', status: 'editing' },
                        { name: 'Player2', color: '#22c55e', cursor: 'L89:3', status: 'viewing' },
                        { name: 'DevBot', color: '#f59e0b', cursor: 'L12:1', status: 'suggesting' },
                      ].map(u => (
                        <div key={u.name} className="flex items-center gap-2 mb-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: u.color }} />
                          <span className="text-[11px] font-mono text-foreground flex-1">{u.name}</span>
                          <span className="text-[9px] font-mono text-muted-foreground">{u.cursor}</span>
                          <span className={`rounded-full px-1.5 py-0.5 text-[8px] font-mono ${u.status === 'editing' ? 'bg-primary/10 text-primary' : u.status === 'suggesting' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-muted text-muted-foreground'}`}>{u.status}</span>
                        </div>
                      ))}
                    </div>
                    <div className="rounded-lg border border-border bg-background p-4">
                      <h3 className="text-xs font-heading font-semibold mb-2">Session Settings</h3>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono text-muted-foreground">Share Link</span>
                          <button onClick={() => { navigator.clipboard.writeText('https://eternityconsole.vercel.app/studio/collab/abc123'); toast.success('Link copied!'); }}
                            className="rounded border border-border px-2 py-1 text-[9px] font-mono text-primary hover:bg-primary/10">Copy Link</button>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono text-muted-foreground">Permission</span>
                          <select className="bg-card border border-border rounded px-2 py-0.5 text-[10px] font-mono text-foreground">
                            <option>Edit</option><option>View Only</option><option>Suggest</option>
                          </select>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono text-muted-foreground">Voice Chat</span>
                          <button className="rounded border border-border px-2 py-1 text-[9px] font-mono text-muted-foreground hover:text-foreground">🎤 Join</button>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono text-muted-foreground">Change Log</span>
                          <button className="rounded border border-border px-2 py-1 text-[9px] font-mono text-muted-foreground hover:text-foreground">View History</button>
                        </div>
                      </div>
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

export default ExportTools;
