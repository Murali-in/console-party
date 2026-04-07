import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Helmet } from 'react-helmet-async';
import { toast } from 'sonner';

const EXAMPLE_PROMPTS = [
  "A 2D platformer with double-jump and wall-slide mechanics",
  "Top-down zombie survival shooter with wave-based enemies",
  "Puzzle game where players rotate gravity to solve levels",
  "Racing game with power-ups and destructible environments",
  "Asteroids clone with shield mechanics and boss waves",
  "Snake battle royale with AI opponents and power pellets",
];

const GameStudio = () => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [charCount, setCharCount] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const streamGame = useCallback(async (gamePrompt: string) => {
    if (!gamePrompt.trim()) return;

    setIsGenerating(true);
    setGeneratedCode('');
    setShowPreview(false);
    setShowCode(true);
    setActiveTab('code');
    setCharCount(0);

    abortRef.current = new AbortController();
    let fullCode = '';

    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-game`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ prompt: gamePrompt }),
          signal: abortRef.current.signal,
        }
      );

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

        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullCode += content;
              setCharCount(prev => prev + content.length);
              setGeneratedCode(fullCode);
            }
          } catch {
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }

      // Clean up any markdown wrapping
      let cleanCode = fullCode.trim();
      if (cleanCode.startsWith('```html')) {
        cleanCode = cleanCode.slice(7);
      } else if (cleanCode.startsWith('```')) {
        cleanCode = cleanCode.slice(3);
      }
      if (cleanCode.endsWith('```')) {
        cleanCode = cleanCode.slice(0, -3);
      }
      cleanCode = cleanCode.trim();

      setGeneratedCode(cleanCode);
      setShowPreview(true);
      setActiveTab('preview');
      toast.success('Game generated! Check the preview.');
    } catch (e: any) {
      if (e.name === 'AbortError') {
        toast.info('Generation cancelled.');
      } else {
        toast.error(e.message || 'Failed to generate game');
        console.error('Generation error:', e);
      }
    } finally {
      setIsGenerating(false);
      abortRef.current = null;
    }
  }, []);

  const handleGenerate = () => streamGame(prompt);
  const handleCancel = () => abortRef.current?.abort();

  const handleDownload = () => {
    const blob = new Blob([generatedCode], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'eternity-game.html';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Game downloaded!');
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedCode);
    toast.success('Code copied to clipboard!');
  };

  return (
    <>
      <Helmet>
        <title>Eternity Game Studio — Build Games with AI</title>
        <meta name="description" content="Create playable games instantly from a single sentence. AI-powered vibe coding that generates real, runnable Phaser 3 games." />
      </Helmet>
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <main className="pt-[60px]">
          {/* Hero */}
          <section className="relative overflow-hidden border-b border-border">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/3" />
            <div className="mx-auto max-w-5xl px-4 py-12 md:py-20 text-center relative">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                <span className="inline-block rounded-full border border-primary/30 bg-primary/10 px-4 py-1 font-mono text-[10px] uppercase tracking-widest text-primary mb-4">
                  Eternity Game Studio
                </span>
                <h1 className="font-heading text-2xl md:text-5xl font-bold leading-tight mb-3">
                  One sentence.<br />
                  <span className="text-primary">One playable game.</span>
                </h1>
                <p className="text-muted-foreground text-xs md:text-sm max-w-xl mx-auto">
                  Describe your game idea and watch AI generate a fully playable game in real-time. No setup, no boilerplate — just pure creation.
                </p>
              </motion.div>
            </div>
          </section>

          {/* Prompt Input */}
          <section className="mx-auto max-w-4xl px-4 py-8">
            <div className="rounded-xl border border-border bg-card p-1">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value.slice(0, 2000))}
                placeholder="Describe your game... e.g. 'A space shooter where the player dodges asteroids and collects power-ups with increasing difficulty'"
                className="w-full bg-transparent text-foreground placeholder:text-muted-foreground resize-none p-4 text-sm font-mono focus:outline-none min-h-[100px]"
                disabled={isGenerating}
              />
              <div className="flex items-center justify-between border-t border-border p-3">
                <span className="text-[10px] text-muted-foreground font-mono">
                  {prompt.length} / 2000
                </span>
                <div className="flex gap-2">
                  {isGenerating && (
                    <button
                      onClick={handleCancel}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 font-heading text-xs font-medium text-destructive hover:bg-destructive/20 transition-colors"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
                      Stop
                    </button>
                  )}
                  <button
                    onClick={handleGenerate}
                    disabled={!prompt.trim() || isGenerating}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 font-heading text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {isGenerating ? (
                      <>
                        <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" />
                        </svg>
                        Generating... ({charCount} chars)
                      </>
                    ) : (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                        Generate Game
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Examples */}
            <div className="mt-4">
              <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-2">Try an example</p>
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_PROMPTS.map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => !isGenerating && setPrompt(ex)}
                    disabled={isGenerating}
                    className="rounded-lg border border-border bg-card/50 px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors text-left disabled:opacity-50"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Output Panel */}
          <AnimatePresence>
            {(showCode || showPreview) && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mx-auto max-w-5xl px-4 pb-12"
              >
                {/* Tabs */}
                <div className="flex items-center gap-1 mb-2">
                  <button
                    onClick={() => setActiveTab('preview')}
                    className={`px-4 py-2 rounded-t-lg text-xs font-heading font-medium transition-colors ${
                      activeTab === 'preview'
                        ? 'bg-card border border-b-0 border-border text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    🎮 Preview
                  </button>
                  <button
                    onClick={() => setActiveTab('code')}
                    className={`px-4 py-2 rounded-t-lg text-xs font-heading font-medium transition-colors ${
                      activeTab === 'code'
                        ? 'bg-card border border-b-0 border-border text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {'</>'} Code
                  </button>

                  {generatedCode && !isGenerating && (
                    <div className="ml-auto flex gap-2">
                      <button onClick={handleCopyCode} className="rounded-lg border border-border px-3 py-1.5 text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors">
                        Copy
                      </button>
                      <button onClick={handleDownload} className="rounded-lg bg-primary px-3 py-1.5 text-[10px] font-heading font-semibold text-primary-foreground hover:opacity-90 transition-opacity">
                        Download .html
                      </button>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  {activeTab === 'preview' && showPreview ? (
                    <div className="relative aspect-video bg-[#0a0a1a]">
                      <iframe
                        ref={iframeRef}
                        srcDoc={generatedCode}
                        className="w-full h-full border-0"
                        sandbox="allow-scripts allow-same-origin"
                        title="Game Preview"
                      />
                      <div className="absolute top-2 right-2 flex gap-1">
                        <button
                          onClick={() => {
                            if (iframeRef.current) {
                              iframeRef.current.srcdoc = '';
                              setTimeout(() => {
                                if (iframeRef.current) iframeRef.current.srcdoc = generatedCode;
                              }, 50);
                            }
                          }}
                          className="rounded-md bg-background/80 backdrop-blur px-2 py-1 text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors"
                        >
                          ↻ Restart
                        </button>
                      </div>
                    </div>
                  ) : activeTab === 'preview' && !showPreview ? (
                    <div className="aspect-video flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <svg className="mx-auto mb-3 text-muted-foreground/40" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
                        </svg>
                        <p className="text-xs font-mono">
                          {isGenerating ? 'Generating... preview will appear when done' : 'Generate a game to see the preview'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <pre className="p-4 text-[11px] font-mono text-muted-foreground overflow-auto max-h-[500px] leading-relaxed">
                        <code>{generatedCode || 'Waiting for generation...'}</code>
                        {isGenerating && (
                          <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-0.5" />
                        )}
                      </pre>
                    </div>
                  )}
                </div>

                {/* Status bar */}
                <div className="flex items-center justify-between mt-2 px-1">
                  <div className="flex items-center gap-3">
                    {isGenerating && (
                      <span className="flex items-center gap-1.5 text-[10px] text-primary font-mono">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                        Streaming...
                      </span>
                    )}
                    {!isGenerating && generatedCode && (
                      <span className="flex items-center gap-1.5 text-[10px] text-green-500 font-mono">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                        Complete
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {generatedCode.length > 0 && `${generatedCode.length} chars · ${generatedCode.split('\n').length} lines`}
                  </span>
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          {/* How it works */}
          <section className="border-t border-border bg-card/30">
            <div className="mx-auto max-w-5xl px-4 py-12">
              <h2 className="font-heading text-lg font-semibold text-center mb-8">How It Works</h2>
              <div className="grid md:grid-cols-3 gap-6">
                {[
                  { step: '01', title: 'Describe', desc: 'Write one sentence describing your game — genre, mechanics, style.' },
                  { step: '02', title: 'Watch It Build', desc: 'AI streams real game code character-by-character. Watch your game being written.' },
                  { step: '03', title: 'Play Instantly', desc: 'The moment generation finishes, your game is running. Download or publish it.' },
                ].map((item) => (
                  <motion.div key={item.step} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center">
                    <span className="font-mono text-2xl font-bold text-primary/20">{item.step}</span>
                    <h3 className="font-heading text-sm font-semibold mt-1 mb-1">{item.title}</h3>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
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
