import { useState } from 'react';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Helmet } from 'react-helmet-async';

const EXAMPLE_PROMPTS = [
  "Create a 2D platformer with double-jump and wall-slide mechanics",
  "Build a top-down zombie survival shooter with wave-based enemies",
  "Make a puzzle game where players rotate gravity to solve levels",
  "Design a racing game with power-ups and destructible environments",
];

const GameStudio = () => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPreview, setGeneratedPreview] = useState<string | null>(null);

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    // Simulate generation for now
    setTimeout(() => {
      setIsGenerating(false);
      setGeneratedPreview(prompt);
    }, 3000);
  };

  return (
    <>
      <Helmet>
        <title>Eternity Game Studio — Build Games with AI Prompts</title>
        <meta name="description" content="Create games instantly by describing what you want. Eternity Game Studio uses AI to turn your ideas into playable games." />
      </Helmet>
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <main className="pt-[60px]">
          {/* Hero */}
          <section className="relative overflow-hidden border-b border-border">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/3" />
            <div className="mx-auto max-w-5xl px-6 py-20 text-center relative">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                <span className="inline-block rounded-full border border-primary/30 bg-primary/10 px-4 py-1 font-mono text-[10px] uppercase tracking-widest text-primary mb-6">
                  Eternity Game Studio
                </span>
                <h1 className="font-heading text-3xl md:text-5xl font-bold leading-tight mb-4">
                  Describe your game.<br />
                  <span className="text-primary">We build it.</span>
                </h1>
                <p className="text-muted-foreground text-sm md:text-base max-w-2xl mx-auto">
                  Turn your game ideas into reality with AI-powered vibe coding. Just describe what you want — mechanics, art style, gameplay — and watch your game come to life.
                </p>
              </motion.div>
            </div>
          </section>

          {/* Prompt Builder */}
          <section className="mx-auto max-w-4xl px-6 py-16">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <h2 className="font-heading text-xl font-semibold mb-6 text-center">What game do you want to create?</h2>
              
              <div className="rounded-xl border border-border bg-card p-1">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe your game idea in detail... e.g., 'A side-scrolling platformer where the player controls a cat that can double-jump and collect fish while avoiding obstacles'"
                  className="w-full bg-transparent text-foreground placeholder:text-muted-foreground resize-none p-4 text-sm font-mono focus:outline-none min-h-[120px]"
                />
                <div className="flex items-center justify-between border-t border-border p-3">
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {prompt.length} / 2000 characters
                  </span>
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
                        Generating...
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

              {/* Example prompts */}
              <div className="mt-6">
                <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-3">Try an example</p>
                <div className="flex flex-wrap gap-2">
                  {EXAMPLE_PROMPTS.map((ex, i) => (
                    <button
                      key={i}
                      onClick={() => setPrompt(ex)}
                      className="rounded-lg border border-border bg-card/50 px-3 py-2 text-[11px] text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors text-left"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </section>

          {/* Generated Preview */}
          {generatedPreview && (
            <section className="mx-auto max-w-4xl px-6 pb-16">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="rounded-xl border border-primary/30 bg-card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                  <span className="font-heading text-sm font-semibold">Game Generated</span>
                  <span className="ml-auto rounded-full border border-warning/30 bg-warning/10 px-3 py-0.5 text-[10px] text-warning font-mono">Preview</span>
                </div>
                <div className="aspect-video rounded-lg bg-background border border-border flex items-center justify-center mb-4">
                  <div className="text-center">
                    <svg className="mx-auto mb-3 text-muted-foreground" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
                    </svg>
                    <p className="text-xs text-muted-foreground font-mono">Game preview will render here</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">"{generatedPreview.slice(0, 60)}..."</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button className="flex-1 rounded-lg border border-border px-4 py-2.5 font-heading text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                    Edit Prompt
                  </button>
                  <button className="flex-1 rounded-lg bg-primary px-4 py-2.5 font-heading text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity">
                    Publish to Eternity Console
                  </button>
                </div>
              </motion.div>
            </section>
          )}

          {/* How it works */}
          <section className="border-t border-border bg-card/30">
            <div className="mx-auto max-w-5xl px-6 py-16">
              <h2 className="font-heading text-xl font-semibold text-center mb-10">How It Works</h2>
              <div className="grid md:grid-cols-3 gap-8">
                {[
                  { step: '01', title: 'Describe', desc: 'Write a prompt describing your game — genre, mechanics, art style, everything.' },
                  { step: '02', title: 'Generate', desc: 'AI builds your game code, assets, and logic in real-time. Watch it come together.' },
                  { step: '03', title: 'Publish', desc: 'One click to deploy your game to Eternity Console for the world to play.' },
                ].map((item) => (
                  <motion.div key={item.step} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center">
                    <span className="font-mono text-3xl font-bold text-primary/20">{item.step}</span>
                    <h3 className="font-heading text-sm font-semibold mt-2 mb-2">{item.title}</h3>
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
