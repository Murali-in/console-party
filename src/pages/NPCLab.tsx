import { useState } from 'react';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Helmet } from 'react-helmet-async';

const BEHAVIOR_PRESETS = [
  { name: 'Patrol Guard', desc: 'Walks a set path, chases player on sight', icon: '🛡️' },
  { name: 'Shopkeeper', desc: 'Greets players, opens trade menu on interact', icon: '🏪' },
  { name: 'Boss Enemy', desc: 'Multi-phase attacks with rage mode at low HP', icon: '👹' },
  { name: 'Companion', desc: 'Follows player, assists in combat, heals when idle', icon: '🤝' },
];

const NPCLab = () => {
  const [npcName, setNpcName] = useState('');
  const [behavior, setBehavior] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [isTraining, setIsTraining] = useState(false);
  const [trained, setTrained] = useState(false);

  const handleTrain = () => {
    if (!npcName.trim() || !behavior.trim()) return;
    setIsTraining(true);
    setTimeout(() => {
      setIsTraining(false);
      setTrained(true);
    }, 4000);
  };

  return (
    <>
      <Helmet>
        <title>Eternity NPC Lab — Train AI Game Characters</title>
        <meta name="description" content="Train intelligent NPC characters with custom behaviors using AI. Define personality, combat style, and dialogue for your game characters." />
      </Helmet>
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <main className="pt-[60px]">
          {/* Hero */}
          <section className="relative overflow-hidden border-b border-border">
            <div className="absolute inset-0 bg-gradient-to-br from-success/5 via-transparent to-primary/3" />
            <div className="mx-auto max-w-5xl px-6 py-20 text-center relative">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <span className="inline-block rounded-full border border-success/30 bg-success/10 px-4 py-1 font-mono text-[10px] uppercase tracking-widest text-foreground mb-6">
                  Eternity NPC Lab
                </span>
                <h1 className="font-heading text-3xl md:text-5xl font-bold leading-tight mb-4">
                  Train your NPCs.<br />
                  <span className="text-primary">Give them life.</span>
                </h1>
                <p className="text-muted-foreground text-sm md:text-base max-w-2xl mx-auto">
                  Define NPC behaviors, personality, combat patterns, and dialogue using natural language. AI trains your characters to act intelligently in any game scenario.
                </p>
              </motion.div>
            </div>
          </section>

          {/* NPC Builder */}
          <section className="mx-auto max-w-4xl px-6 py-16">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <h2 className="font-heading text-xl font-semibold mb-6 text-center">Design Your NPC</h2>

              <div className="space-y-6">
                {/* Name */}
                <div className="rounded-xl border border-border bg-card p-4">
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">NPC Name</label>
                  <input
                    type="text"
                    value={npcName}
                    onChange={(e) => setNpcName(e.target.value)}
                    placeholder="e.g., Captain Vex, The Merchant, Shadow Wolf"
                    className="w-full bg-transparent text-foreground placeholder:text-muted-foreground text-sm font-mono focus:outline-none"
                  />
                </div>

                {/* Behavior presets */}
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-3">Behavior Presets</p>
                  <div className="grid grid-cols-2 gap-3">
                    {BEHAVIOR_PRESETS.map((preset, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setSelectedPreset(i);
                          setBehavior(preset.desc);
                        }}
                        className={`rounded-xl border p-4 text-left transition-colors ${
                          selectedPreset === i ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/30'
                        }`}
                      >
                        <span className="text-xl">{preset.icon}</span>
                        <h3 className="font-heading text-xs font-semibold mt-2">{preset.name}</h3>
                        <p className="text-[10px] text-muted-foreground mt-1">{preset.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom behavior */}
                <div className="rounded-xl border border-border bg-card p-1">
                  <textarea
                    value={behavior}
                    onChange={(e) => { setBehavior(e.target.value); setSelectedPreset(null); }}
                    placeholder="Describe NPC behavior in detail... e.g., 'A friendly merchant who offers better prices to players with high reputation. Gets scared and runs away during combat. Has a secret quest line if player brings a rare gem.'"
                    className="w-full bg-transparent text-foreground placeholder:text-muted-foreground resize-none p-4 text-sm font-mono focus:outline-none min-h-[100px]"
                  />
                  <div className="flex items-center justify-between border-t border-border p-3">
                    <span className="text-[10px] text-muted-foreground font-mono">Custom behavior description</span>
                    <button
                      onClick={handleTrain}
                      disabled={!npcName.trim() || !behavior.trim() || isTraining}
                      className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 font-heading text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                      {isTraining ? (
                        <>
                          <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" />
                          </svg>
                          Training NPC...
                        </>
                      ) : (
                        <>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
                          Train NPC
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </section>

          {/* Trained result */}
          {trained && (
            <section className="mx-auto max-w-4xl px-6 pb-16">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="rounded-xl border border-success/30 bg-card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                  <span className="font-heading text-sm font-semibold">NPC Trained Successfully</span>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div>
                      <span className="text-[10px] font-mono text-muted-foreground uppercase">Name</span>
                      <p className="font-heading text-sm font-semibold">{npcName}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-muted-foreground uppercase">Behavior</span>
                      <p className="text-xs text-muted-foreground">{behavior}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-muted-foreground uppercase">AI Model</span>
                      <p className="text-xs text-muted-foreground">Behavior Tree v3 + Reinforcement Learning</p>
                    </div>
                  </div>
                  <div className="aspect-square rounded-lg bg-background border border-border flex items-center justify-center">
                    <div className="text-center">
                      <span className="text-4xl">🤖</span>
                      <p className="text-[10px] text-muted-foreground font-mono mt-2">NPC Preview</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button className="flex-1 rounded-lg border border-border px-4 py-2.5 font-heading text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                    Retrain
                  </button>
                  <button className="flex-1 rounded-lg bg-primary px-4 py-2.5 font-heading text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity">
                    Export to Game Studio
                  </button>
                </div>
              </motion.div>
            </section>
          )}

          {/* Features */}
          <section className="border-t border-border bg-card/30">
            <div className="mx-auto max-w-5xl px-6 py-16">
              <h2 className="font-heading text-xl font-semibold text-center mb-10">NPC Training Capabilities</h2>
              <div className="grid md:grid-cols-3 gap-8">
                {[
                  { title: 'Combat AI', desc: 'Train NPCs with attack patterns, dodge mechanics, aggro ranges, and difficulty scaling.' },
                  { title: 'Dialogue Trees', desc: 'Build branching conversations with memory, reputation tracking, and emotional states.' },
                  { title: 'World Interaction', desc: 'NPCs that open doors, trade items, follow schedules, and react to game events.' },
                ].map((item) => (
                  <motion.div key={item.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="rounded-xl border border-border bg-card p-5">
                    <h3 className="font-heading text-sm font-semibold mb-2">{item.title}</h3>
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

export default NPCLab;
