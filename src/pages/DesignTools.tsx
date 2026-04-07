import { useState } from 'react';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Helmet } from 'react-helmet-async';
import { toast } from 'sonner';
import StudioNav from '@/components/studio/StudioNav';

/* ── Component ─────────────────────────────── */
const DesignTools = () => {
  const [activeTab, setActiveTab] = useState<'dialogue' | 'balance' | 'antipattern' | 'accessibility' | 'monetisation' | 'tdd'>('dialogue');
  // Dialogue tree
  const [charName, setCharName] = useState('');
  const [storyContext, setStoryContext] = useState('');
  const [dialogueNodes, setDialogueNodes] = useState<Array<{ id: string; speaker: string; text: string; choices: string[] }>>([]);
  const [isGeneratingDialogue, setIsGeneratingDialogue] = useState(false);
  // Balance
  const [balanceVars, setBalanceVars] = useState([
    { name: 'Player Speed', value: 200, suggested: 180 },
    { name: 'Enemy Damage', value: 15, suggested: 12 },
    { name: 'Respawn Time', value: 3, suggested: 5 },
    { name: 'Health Regen', value: 2, suggested: 1.5 },
    { name: 'XP Multiplier', value: 1.5, suggested: 1.2 },
  ]);
  // Accessibility
  const [accessibilityIssues] = useState([
    { severity: 'high', issue: 'No colour-blind mode detected', fix: 'Add deuteranopia/protanopia filter option in settings' },
    { severity: 'high', issue: 'Controls are hard-coded', fix: 'Add key rebinding in settings menu' },
    { severity: 'medium', issue: 'No subtitles for sound cues', fix: 'Add visual indicators for audio events' },
    { severity: 'medium', issue: 'Small touch targets (< 44px)', fix: 'Increase button size to minimum 44×44px' },
    { severity: 'low', issue: 'No screen reader support for menus', fix: 'Add ARIA labels to UI elements' },
    { severity: 'low', issue: 'No high-contrast mode', fix: 'Add toggle for increased contrast ratio' },
  ]);

  const generateDialogue = () => {
    if (!charName.trim()) return;
    setIsGeneratingDialogue(true);
    setTimeout(() => {
      setDialogueNodes([
        { id: '1', speaker: charName, text: `Welcome, traveler. ${storyContext ? `I've heard about ${storyContext}.` : "What brings you here?"}`, choices: ['Ask about quest', 'Trade items', 'Leave'] },
        { id: '2', speaker: charName, text: "There's a dark force growing in the eastern caverns. If you're brave enough, I could use someone to investigate.", choices: ['Accept quest', 'Ask for reward first', 'Decline'] },
        { id: '3', speaker: charName, text: "Excellent! Take this map. The entrance is past the old bridge. Be careful — the creatures there are... different.", choices: ['Ask about creatures', 'Head out immediately'] },
        { id: '4', speaker: charName, text: "I can offer 500 gold and a rare enchantment upon your return. Fair?", choices: ['Accept deal', 'Negotiate higher', 'Decline'] },
      ]);
      setIsGeneratingDialogue(false);
      toast.success('Dialogue tree generated!');
    }, 2000);
  };

  return (
    <>
      <Helmet>
        <title>Design Tools — Eternity Game Studio</title>
        <meta name="description" content="Game design assistant with dialogue tree writer, balance analyzer, anti-pattern detector, accessibility audit, and monetisation advisor." />
      </Helmet>
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <main className="pt-[60px]">
          <StudioNav />
          <section className="relative overflow-hidden border-b border-border">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-primary/3" />
            <div className="mx-auto max-w-5xl px-4 py-8 text-center relative">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <span className="inline-block rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1 font-mono text-[10px] uppercase tracking-widest text-violet-400 mb-3">Design Tools</span>
                <h1 className="font-heading text-2xl md:text-4xl font-bold mb-2">Design. Balance. <span className="text-primary">Polish.</span></h1>
                <p className="text-muted-foreground text-xs max-w-lg mx-auto">AI-powered game design assistant with dialogue writing, balance analysis, anti-pattern detection, and accessibility auditing.</p>
              </motion.div>
            </div>
          </section>

          <section className="mx-auto max-w-5xl px-4 py-6">
            <div className="flex gap-1 mb-4 overflow-x-auto">
              {(['dialogue', 'balance', 'antipattern', 'accessibility', 'monetisation', 'tdd'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-heading font-medium transition-colors whitespace-nowrap ${activeTab === tab ? 'bg-card border border-border text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                  {tab === 'dialogue' && '💬 Dialogue'}{tab === 'balance' && '⚖️ Balance'}{tab === 'antipattern' && '🚫 Anti-Patterns'}
                  {tab === 'accessibility' && '♿ Accessibility'}{tab === 'monetisation' && '💰 Monetisation'}{tab === 'tdd' && '📄 Tech Doc'}
                </button>
              ))}
            </div>

            <div className="rounded-xl border border-border bg-card overflow-hidden min-h-[400px]">
              {/* Dialogue Tree (#59) */}
              {activeTab === 'dialogue' && (
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] font-mono uppercase text-muted-foreground mb-1 block">Character Name</label>
                      <input type="text" value={charName} onChange={e => setCharName(e.target.value)} placeholder="The Blacksmith"
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-[9px] font-mono uppercase text-muted-foreground mb-1 block">Story Context</label>
                      <input type="text" value={storyContext} onChange={e => setStoryContext(e.target.value)} placeholder="a cursed kingdom..."
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none" />
                    </div>
                  </div>
                  <button onClick={generateDialogue} disabled={!charName.trim() || isGeneratingDialogue}
                    className="rounded-lg bg-primary px-5 py-2 font-heading text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
                    {isGeneratingDialogue ? 'Generating...' : '💬 Generate Dialogue Tree'}
                  </button>
                  {dialogueNodes.length > 0 && (
                    <div className="space-y-2 mt-4">
                      {dialogueNodes.map((node, i) => (
                        <motion.div key={node.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                          className="rounded-lg border border-border bg-background p-3">
                          <p className="text-[10px] font-mono text-primary mb-1">{node.speaker}:</p>
                          <p className="text-xs text-foreground mb-2">"{node.text}"</p>
                          <div className="flex flex-wrap gap-1.5">
                            {node.choices.map((c, ci) => (
                              <span key={ci} className="rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-[9px] font-mono text-primary">→ {c}</span>
                            ))}
                          </div>
                        </motion.div>
                      ))}
                      <button onClick={() => {
                        const json = JSON.stringify(dialogueNodes, null, 2);
                        const blob = new Blob([json], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url; a.download = `${charName.toLowerCase().replace(/\s+/g, '-')}-dialogue.json`; a.click();
                        toast.success('Dialogue exported!');
                      }} className="rounded-lg border border-border px-4 py-2 text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors">
                        Export as JSON
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Balance Analyzer (#62) */}
              {activeTab === 'balance' && (
                <div className="p-5">
                  <p className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground mb-3">Game Variable Balance</p>
                  <div className="space-y-3">
                    {balanceVars.map((v, i) => (
                      <div key={v.name} className="flex items-center gap-4 rounded-lg border border-border bg-background p-3">
                        <div className="w-28">
                          <p className="text-[11px] font-heading font-semibold">{v.name}</p>
                        </div>
                        <div className="flex-1">
                          <input type="range" min={0} max={v.value * 3} value={v.value}
                            onChange={e => setBalanceVars(prev => prev.map((bv, bi) => bi === i ? { ...bv, value: Number(e.target.value) } : bv))}
                            className="w-full h-1.5 bg-muted rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary" />
                        </div>
                        <span className="w-12 text-right text-xs font-mono text-foreground">{v.value}</span>
                        <span className="text-[9px] font-mono text-muted-foreground">→</span>
                        <span className="w-12 text-right text-xs font-mono text-green-400">{v.suggested}</span>
                        <button onClick={() => setBalanceVars(prev => prev.map((bv, bi) => bi === i ? { ...bv, value: bv.suggested } : bv))}
                          className="rounded border border-green-500/30 px-2 py-0.5 text-[9px] font-mono text-green-500 hover:bg-green-500/10">Apply</button>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => { setBalanceVars(prev => prev.map(v => ({ ...v, value: v.suggested }))); toast.success('All suggestions applied!'); }}
                    className="mt-4 rounded-lg bg-primary px-5 py-2 font-heading text-xs font-semibold text-primary-foreground hover:opacity-90">Apply All Suggestions</button>
                </div>
              )}

              {/* Anti-Pattern Detector (#61) */}
              {activeTab === 'antipattern' && (
                <div className="p-5">
                  <p className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground mb-3">Detected Anti-Patterns</p>
                  <div className="space-y-2">
                    {[
                      { severity: 'high', pattern: 'Rubber-band Difficulty', desc: 'Difficulty adjusts too aggressively based on player performance, making skilled play feel unrewarded.', fix: 'Cap difficulty adjustment to ±15% per checkpoint.' },
                      { severity: 'medium', pattern: 'Unavoidable Death Zone', desc: 'Area near coordinates (450, 200) has overlapping hazards with no safe path.', fix: 'Add a 32px safe corridor between hazard zones.' },
                      { severity: 'medium', pattern: 'Infinite Resource Loop', desc: 'Player can farm health potions faster than they are consumed in combat.', fix: 'Add diminishing returns to potion drops after 5 consecutive uses.' },
                      { severity: 'low', pattern: 'First-try Fail State', desc: 'New players are likely to fail the first obstacle without any prior training.', fix: 'Add a tutorial section before the first challenge.' },
                    ].map((ap, i) => (
                      <div key={i} className={`rounded-lg border p-3 ${ap.severity === 'high' ? 'border-red-500/30 bg-red-500/5' : ap.severity === 'medium' ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-border bg-background'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`rounded-full px-1.5 py-0.5 text-[8px] font-mono font-bold ${ap.severity === 'high' ? 'bg-red-500/20 text-red-400' : ap.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-muted text-muted-foreground'}`}>{ap.severity.toUpperCase()}</span>
                          <span className="text-xs font-heading font-semibold">{ap.pattern}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mb-1">{ap.desc}</p>
                        <p className="text-[10px] text-green-400">💡 Fix: {ap.fix}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Accessibility Audit (#65) */}
              {activeTab === 'accessibility' && (
                <div className="p-5">
                  <p className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground mb-3">Accessibility Audit Results</p>
                  <div className="space-y-2">
                    {accessibilityIssues.map((issue, i) => (
                      <div key={i} className={`rounded-lg border p-3 ${issue.severity === 'high' ? 'border-red-500/30 bg-red-500/5' : issue.severity === 'medium' ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-border bg-background'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`rounded-full px-1.5 py-0.5 text-[8px] font-mono font-bold ${issue.severity === 'high' ? 'bg-red-500/20 text-red-400' : issue.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-muted text-muted-foreground'}`}>{issue.severity.toUpperCase()}</span>
                          <span className="text-xs font-heading font-semibold">{issue.issue}</span>
                        </div>
                        <p className="text-[10px] text-green-400">💡 {issue.fix}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 rounded-lg border border-border bg-background p-3 text-center">
                    <p className="text-xs font-heading font-semibold">Score: 4/10</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">Fix high-severity issues to reach minimum accessibility standards.</p>
                  </div>
                </div>
              )}

              {/* Monetisation (#66) */}
              {activeTab === 'monetisation' && (
                <div className="p-5 space-y-4">
                  <p className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">Monetisation Strategy Report</p>
                  <div className="grid md:grid-cols-3 gap-3">
                    {[
                      { title: '💎 Cosmetic Store', desc: 'Sell skins, trails, and emotes. Non-pay-to-win. Estimated: $0.50-2.00 ARPDAU.', fit: 'Best for competitive/social games.' },
                      { title: '🎥 Rewarded Ads', desc: 'Offer extra lives, power-ups, or currency for watching 15-30s video ads.', fit: 'Best for casual/puzzle games.' },
                      { title: '🏆 Battle Pass', desc: 'Season-based progression with free/premium tracks. 60-day cadence.', fit: 'Best for games with regular content updates.' },
                    ].map((strat, i) => (
                      <div key={i} className="rounded-lg border border-border bg-background p-3">
                        <h3 className="text-xs font-heading font-semibold mb-1">{strat.title}</h3>
                        <p className="text-[10px] text-muted-foreground mb-2">{strat.desc}</p>
                        <p className="text-[9px] text-primary font-mono">{strat.fit}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Technical Design Doc (#67) */}
              {activeTab === 'tdd' && (
                <div className="p-5">
                  <p className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground mb-3">Technical Design Document</p>
                  <div className="rounded-lg border border-border bg-background p-4 max-h-[400px] overflow-auto">
                    <div className="prose prose-sm prose-invert max-w-none">
                      <h3 className="text-sm font-heading font-semibold text-foreground">Architecture Overview</h3>
                      <p className="text-[11px] text-muted-foreground">This document describes every major decision the AI made during code generation.</p>
                      <h4 className="text-xs font-heading font-semibold text-foreground mt-3">Engine Selection</h4>
                      <p className="text-[11px] text-muted-foreground">Phaser 3 was selected based on: 2D genre detection, arcade physics requirements, and browser-first deployment target.</p>
                      <h4 className="text-xs font-heading font-semibold text-foreground mt-3">Physics System</h4>
                      <p className="text-[11px] text-muted-foreground">Arcade physics chosen over Matter.js for performance. Gravity set to 300px/s². Collision groups separate player, enemies, and projectiles.</p>
                      <h4 className="text-xs font-heading font-semibold text-foreground mt-3">State Management</h4>
                      <p className="text-[11px] text-muted-foreground">Scene-based state machine: TitleScreen → GameScene → GameOver. Score persisted in scene data. No external state library needed.</p>
                      <h4 className="text-xs font-heading font-semibold text-foreground mt-3">Performance Budget</h4>
                      <p className="text-[11px] text-muted-foreground">Target: 60fps on mid-range mobile. Max draw calls: 50. Max simultaneous particles: 200. Sprite atlas used to minimize texture swaps.</p>
                    </div>
                  </div>
                  <button onClick={() => toast.success('TDD exported!')} className="mt-3 rounded-lg border border-border px-4 py-2 text-[10px] font-mono text-muted-foreground hover:text-foreground">Export as Markdown</button>
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

export default DesignTools;
