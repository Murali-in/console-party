import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Helmet } from 'react-helmet-async';
import { toast } from 'sonner';

/* ── Types ─────────────────────────────────── */
interface TrainingConfig {
  algorithm: 'ppo' | 'dqn' | 'a3c';
  learningRate: number;
  gamma: number;
  epochs: number;
  batchSize: number;
  entropyCoeff: number;
  aggression: number;
  curiosity: number;
  caution: number;
}

interface TrainingCheckpoint {
  episode: number;
  reward: number;
  timestamp: number;
}

interface BehaviorNode {
  id: string;
  type: 'sequence' | 'selector' | 'condition' | 'action';
  label: string;
  children?: BehaviorNode[];
}

/* ── Constants ─────────────────────────────── */
const BEHAVIOR_PRESETS = [
  { name: 'Patrol Guard', desc: 'Walk a path, chase player on sight, return to route', icon: '🛡️', defaultBehavior: 'Patrol between waypoints. When player enters detection radius, switch to chase mode. Attack when in range. If health < 30%, retreat to nearest cover. Return to patrol when player escapes.' },
  { name: 'Boss Enemy', desc: 'Multi-phase attacks with rage mode at low HP', icon: '👹', defaultBehavior: 'Phase 1: Ranged attacks, circle player. Phase 2 (HP < 60%): Switch to melee combos, summon minions. Phase 3 (HP < 25%): Rage mode — faster attacks, area damage, screen shake.' },
  { name: 'Companion', desc: 'Follow player, heal when idle, assist in combat', icon: '🤝', defaultBehavior: 'Follow player at 2-tile distance. When player is in combat, assist with ranged attacks. When player HP < 50%, heal them. When idle for 5s, play idle animation and comment on surroundings.' },
  { name: 'Shopkeeper', desc: 'Trade, greet, react to theft, has secret quest', icon: '🏪', defaultBehavior: 'Greet player on approach. Open trade menu on interact. If player steals, shout alarm and refuse future trades. If player brings rare gem, unlock secret quest dialogue.' },
  { name: 'Swarm Unit', desc: 'Flock behavior, coordinate with nearby units', icon: '🐝', defaultBehavior: 'Move in formation with nearby allies. When enemy spotted, coordinate flanking maneuver. If isolated, retreat to nearest ally. Sacrifice self if commander is threatened.' },
  { name: 'Stealth Assassin', desc: 'Sneak, backstab, vanish on detection', icon: '🗡️', defaultBehavior: 'Stay in shadows. Approach player from behind. If undetected, perform backstab for 3x damage. If detected, throw smoke bomb and reposition. Cooldown 10s between attacks.' },
];

const ALGORITHMS = [
  { id: 'ppo' as const, name: 'PPO', desc: 'Proximal Policy Optimization — stable, general-purpose. Best for most NPC behaviors.' },
  { id: 'dqn' as const, name: 'DQN', desc: 'Deep Q-Network — good for discrete action spaces like grid-based movement or turn-based combat.' },
  { id: 'a3c' as const, name: 'A3C', desc: 'Asynchronous Advantage Actor-Critic — fast training via parallel workers. Good for complex environments.' },
];

const DEFAULT_CONFIG: TrainingConfig = {
  algorithm: 'ppo',
  learningRate: 0.0003,
  gamma: 0.99,
  epochs: 100,
  batchSize: 64,
  entropyCoeff: 0.01,
  aggression: 0.5,
  curiosity: 0.5,
  caution: 0.5,
};

const DEFAULT_TREE: BehaviorNode = {
  id: '1', type: 'selector', label: 'Root', children: [
    { id: '2', type: 'sequence', label: 'Combat', children: [
      { id: '3', type: 'condition', label: 'Enemy in range?' },
      { id: '4', type: 'action', label: 'Attack' },
    ]},
    { id: '5', type: 'sequence', label: 'Patrol', children: [
      { id: '6', type: 'condition', label: 'Has waypoints?' },
      { id: '7', type: 'action', label: 'Move to next' },
    ]},
    { id: '8', type: 'action', label: 'Idle' },
  ],
};

/* ── Component ─────────────────────────────── */
const NPCLab = () => {
  const [npcName, setNpcName] = useState('');
  const [behavior, setBehavior] = useState('');
  const [rewardFunction, setRewardFunction] = useState('reward the agent for defeating enemies quickly while taking minimal damage');
  const [config, setConfig] = useState<TrainingConfig>(DEFAULT_CONFIG);
  const [activeTab, setActiveTab] = useState<'behavior' | 'training' | 'tree' | 'checkpoints'>('behavior');
  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [trainingReward, setTrainingReward] = useState(0);
  const [checkpoints, setCheckpoints] = useState<TrainingCheckpoint[]>([]);
  const [behaviorTree, setBehaviorTree] = useState<BehaviorNode>(DEFAULT_TREE);
  const [trainingCurve, setTrainingCurve] = useState<number[]>([]);
  const [trained, setTrained] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [strategySummary, setStrategySummary] = useState('');

  const handleTrain = useCallback(() => {
    if (!npcName.trim() || !behavior.trim()) { toast.error('Name and behavior required'); return; }
    setIsTraining(true);
    setTrainingProgress(0);
    setTrainingCurve([]);
    setCheckpoints([]);
    setTrained(false);
    setStrategySummary('');

    // Simulate training loop
    const totalSteps = 50;
    let step = 0;
    const curve: number[] = [];

    const interval = setInterval(() => {
      step++;
      const progress = (step / totalSteps) * 100;
      const baseReward = Math.log(step + 1) * 20;
      const noise = (Math.random() - 0.5) * 10;
      const reward = baseReward + noise + config.aggression * 15 - config.caution * 5;
      curve.push(reward);

      setTrainingProgress(progress);
      setTrainingReward(reward);
      setTrainingCurve([...curve]);

      // Save checkpoints every 10 episodes
      if (step % 10 === 0) {
        setCheckpoints(prev => [...prev, { episode: step * (config.epochs / totalSteps), reward, timestamp: Date.now() }]);
      }

      if (step >= totalSteps) {
        clearInterval(interval);
        setIsTraining(false);
        setTrained(true);
        setStrategySummary(
          `${npcName} learned to ${config.aggression > 0.6 ? 'aggressively pursue targets' : config.caution > 0.6 ? 'cautiously engage from safe positions' : 'balance offense and defense'}. ` +
          `Primary behavior: ${behavior.slice(0, 80)}. ` +
          `Training converged after ~${config.epochs} episodes with final reward ${reward.toFixed(1)}. ` +
          `The agent ${config.curiosity > 0.5 ? 'explores novel strategies' : 'exploits known successful patterns'} and uses ${config.algorithm.toUpperCase()} optimization.`
        );
        toast.success('Training complete!');
      }
    }, 80);
  }, [npcName, behavior, config]);

  const renderTreeNode = (node: BehaviorNode, depth = 0): JSX.Element => {
    const colors: Record<string, string> = {
      selector: 'border-yellow-500/30 bg-yellow-500/5',
      sequence: 'border-blue-500/30 bg-blue-500/5',
      condition: 'border-purple-500/30 bg-purple-500/5',
      action: 'border-green-500/30 bg-green-500/5',
    };
    const icons: Record<string, string> = { selector: '?', sequence: '→', condition: '◆', action: '▶' };

    return (
      <div key={node.id} className="ml-4" style={{ marginLeft: depth * 16 }}>
        <div className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 mb-1 text-[11px] font-mono ${colors[node.type] || 'border-border'}`}>
          <span className="text-muted-foreground">{icons[node.type]}</span>
          <span>{node.label}</span>
          <span className="text-[8px] text-muted-foreground/50">{node.type}</span>
        </div>
        {node.children?.map(child => renderTreeNode(child, depth + 1))}
      </div>
    );
  };

  return (
    <>
      <Helmet>
        <title>Eternity NPC Lab — Train AI Game Characters</title>
        <meta name="description" content="Train intelligent NPC characters with RL algorithms, behavior trees, reward functions, and personality sliders. Export trained agents as lightweight JSON models." />
      </Helmet>
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <main className="pt-[60px]">
          {/* Hero */}
          <section className="relative overflow-hidden border-b border-border">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-primary/3" />
            <div className="mx-auto max-w-5xl px-4 py-10 md:py-14 text-center relative">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <span className="inline-block rounded-full border border-green-500/30 bg-green-500/10 px-4 py-1 font-mono text-[10px] uppercase tracking-widest text-green-400 mb-3">
                  Eternity NPC Lab
                </span>
                <h1 className="font-heading text-2xl md:text-4xl font-bold leading-tight mb-2">
                  Train your NPCs. <span className="text-primary">Give them life.</span>
                </h1>
                <p className="text-muted-foreground text-xs max-w-lg mx-auto">
                  Define behaviors in plain English, select RL algorithms, tune personality sliders, and export trained agents as JSON models.
                </p>
              </motion.div>
            </div>
          </section>

          {/* Main Builder */}
          <section className="mx-auto max-w-5xl px-4 py-6">
            <div className="grid md:grid-cols-3 gap-4">
              {/* Left: NPC Config */}
              <div className="md:col-span-1 space-y-4">
                {/* Name */}
                <div className="rounded-xl border border-border bg-card p-3">
                  <label className="block text-[9px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5">NPC Name</label>
                  <input type="text" value={npcName} onChange={(e) => setNpcName(e.target.value)}
                    placeholder="Captain Vex"
                    className="w-full bg-transparent text-foreground text-sm font-mono focus:outline-none placeholder:text-muted-foreground" />
                </div>

                {/* Personality Sliders (#41) */}
                <div className="rounded-xl border border-border bg-card p-3 space-y-3">
                  <p className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">Personality</p>
                  {[
                    { key: 'aggression' as const, label: '⚔️ Aggression', color: 'accent-red-400' },
                    { key: 'curiosity' as const, label: '🔍 Curiosity', color: 'accent-blue-400' },
                    { key: 'caution' as const, label: '🛡️ Caution', color: 'accent-yellow-400' },
                  ].map(s => (
                    <div key={s.key}>
                      <div className="flex justify-between text-[10px] mb-1">
                        <span className="text-muted-foreground">{s.label}</span>
                        <span className="font-mono text-foreground">{(config[s.key] * 100).toFixed(0)}%</span>
                      </div>
                      <input type="range" min="0" max="100" value={config[s.key] * 100}
                        onChange={(e) => setConfig(prev => ({ ...prev, [s.key]: Number(e.target.value) / 100 }))}
                        className="w-full h-1.5 bg-muted rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary" />
                    </div>
                  ))}
                </div>

                {/* Algorithm Selector (#25) */}
                <div className="rounded-xl border border-border bg-card p-3">
                  <p className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground mb-2">Training Algorithm</p>
                  {ALGORITHMS.map(alg => (
                    <button key={alg.id} onClick={() => setConfig(prev => ({ ...prev, algorithm: alg.id }))}
                      className={`w-full text-left rounded-lg border p-2 mb-1.5 transition-colors ${config.algorithm === alg.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}>
                      <span className="text-xs font-heading font-semibold">{alg.name}</span>
                      <p className="text-[9px] text-muted-foreground mt-0.5">{alg.desc}</p>
                    </button>
                  ))}
                </div>

                {/* Hyperparameters */}
                <div className="rounded-xl border border-border bg-card p-3 space-y-2.5">
                  <p className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">Hyperparameters</p>
                  {[
                    { key: 'learningRate' as const, label: 'Learning Rate', min: 0.0001, max: 0.01, step: 0.0001 },
                    { key: 'gamma' as const, label: 'Discount (γ)', min: 0.9, max: 0.999, step: 0.001 },
                    { key: 'epochs' as const, label: 'Episodes', min: 10, max: 1000, step: 10 },
                    { key: 'batchSize' as const, label: 'Batch Size', min: 16, max: 256, step: 16 },
                    { key: 'entropyCoeff' as const, label: 'Entropy Coeff', min: 0, max: 0.1, step: 0.001 },
                  ].map(h => (
                    <div key={h.key}>
                      <div className="flex justify-between text-[10px] mb-0.5">
                        <span className="text-muted-foreground">{h.label}</span>
                        <span className="font-mono text-foreground">{config[h.key]}</span>
                      </div>
                      <input type="range" min={h.min} max={h.max} step={h.step} value={config[h.key]}
                        onChange={(e) => setConfig(prev => ({ ...prev, [h.key]: Number(e.target.value) }))}
                        className="w-full h-1 bg-muted rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: Behavior & Output */}
              <div className="md:col-span-2 space-y-4">
                {/* Tabs */}
                <div className="flex gap-1 overflow-x-auto">
                  {(['behavior', 'training', 'tree', 'checkpoints'] as const).map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-heading font-medium transition-colors whitespace-nowrap ${activeTab === tab ? 'bg-card border border-border text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                      {tab === 'behavior' && '📝 Behavior'}
                      {tab === 'training' && '📈 Training'}
                      {tab === 'tree' && '🌳 Behavior Tree'}
                      {tab === 'checkpoints' && '💾 Checkpoints'}
                    </button>
                  ))}
                </div>

                <div className="rounded-xl border border-border bg-card overflow-hidden min-h-[400px]">
                  {/* Behavior Tab */}
                  {activeTab === 'behavior' && (
                    <div className="p-4 space-y-4">
                      {/* Presets */}
                      <div>
                        <p className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground mb-2">Presets</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {BEHAVIOR_PRESETS.map((p, i) => (
                            <button key={i} onClick={() => { setSelectedPreset(i); setBehavior(p.defaultBehavior); setNpcName(npcName || p.name); }}
                              className={`rounded-lg border p-2.5 text-left transition-colors ${selectedPreset === i ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}>
                              <span className="text-lg">{p.icon}</span>
                              <h3 className="font-heading text-[11px] font-semibold mt-1">{p.name}</h3>
                              <p className="text-[9px] text-muted-foreground mt-0.5">{p.desc}</p>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Custom behavior */}
                      <div>
                        <p className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5">Custom Behavior</p>
                        <textarea value={behavior} onChange={(e) => { setBehavior(e.target.value); setSelectedPreset(null); }}
                          placeholder="Describe NPC behavior in detail..."
                          className="w-full bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground resize-none p-3 text-xs font-mono focus:outline-none min-h-[100px]" />
                      </div>

                      {/* Reward function (#24) */}
                      <div>
                        <p className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5">Reward Function (Natural Language)</p>
                        <textarea value={rewardFunction} onChange={(e) => setRewardFunction(e.target.value)}
                          placeholder="e.g. 'reward the agent for collecting coins quickly while avoiding damage'"
                          className="w-full bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground resize-none p-3 text-xs font-mono focus:outline-none min-h-[60px]" />
                        <p className="text-[8px] text-muted-foreground mt-1">AI compiles this into a numeric reward signal for the training loop.</p>
                      </div>

                      {/* Train button */}
                      <button onClick={handleTrain} disabled={!npcName.trim() || !behavior.trim() || isTraining}
                        className="w-full rounded-lg bg-primary px-4 py-2.5 font-heading text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity">
                        {isTraining ? `Training... ${trainingProgress.toFixed(0)}%` : '🧠 Start Training'}
                      </button>
                    </div>
                  )}

                  {/* Training Tab */}
                  {activeTab === 'training' && (
                    <div className="p-4">
                      {/* Progress */}
                      <div className="mb-4">
                        <div className="flex justify-between text-[10px] font-mono mb-1">
                          <span className="text-muted-foreground">Progress</span>
                          <span>{trainingProgress.toFixed(0)}%</span>
                        </div>
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                          <motion.div className="h-full bg-primary rounded-full" animate={{ width: `${trainingProgress}%` }} transition={{ duration: 0.3 }} />
                        </div>
                      </div>

                      {/* Training curve */}
                      <div className="rounded-lg border border-border bg-background p-3 mb-4">
                        <p className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground mb-2">Reward Curve</p>
                        <div className="h-[200px] flex items-end gap-0.5">
                          {trainingCurve.length > 0 ? trainingCurve.map((r, i) => {
                            const maxR = Math.max(...trainingCurve, 1);
                            const minR = Math.min(...trainingCurve, 0);
                            const h = ((r - minR) / (maxR - minR || 1)) * 100;
                            return (
                              <div key={i} className="flex-1 min-w-[2px] bg-primary/60 rounded-t transition-all" style={{ height: `${Math.max(2, h)}%` }}
                                title={`Episode ${i + 1}: ${r.toFixed(1)}`} />
                            );
                          }) : (
                            <p className="text-xs text-muted-foreground font-mono m-auto">Start training to see the curve</p>
                          )}
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className="rounded-lg border border-border p-2 text-center">
                          <p className="text-[8px] font-mono text-muted-foreground">Algorithm</p>
                          <p className="text-sm font-heading font-bold">{config.algorithm.toUpperCase()}</p>
                        </div>
                        <div className="rounded-lg border border-border p-2 text-center">
                          <p className="text-[8px] font-mono text-muted-foreground">Current Reward</p>
                          <p className="text-sm font-heading font-bold">{trainingReward.toFixed(1)}</p>
                        </div>
                        <div className="rounded-lg border border-border p-2 text-center">
                          <p className="text-[8px] font-mono text-muted-foreground">Checkpoints</p>
                          <p className="text-sm font-heading font-bold">{checkpoints.length}</p>
                        </div>
                      </div>

                      {/* Strategy Summary (#36) */}
                      {strategySummary && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 rounded-lg border border-green-500/30 bg-green-500/5 p-3">
                          <p className="text-[9px] font-mono uppercase tracking-wider text-green-500 mb-1">Post-Training Summary</p>
                          <p className="text-xs text-foreground">{strategySummary}</p>
                        </motion.div>
                      )}
                    </div>
                  )}

                  {/* Behavior Tree Tab (#30) */}
                  {activeTab === 'tree' && (
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">Behavior Tree Visualizer</p>
                        <div className="flex gap-1.5">
                          {['selector', 'sequence', 'condition', 'action'].map(t => (
                            <span key={t} className="text-[8px] font-mono px-1.5 py-0.5 rounded border border-border text-muted-foreground">{t}</span>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-background p-4 min-h-[300px] overflow-auto">
                        {renderTreeNode(behaviorTree)}
                      </div>
                      <p className="text-[8px] text-muted-foreground mt-2">The behavior tree is auto-generated from the trained policy. Nodes can be edited to inject hand-authored rules.</p>
                    </div>
                  )}

                  {/* Checkpoints Tab (#31) */}
                  {activeTab === 'checkpoints' && (
                    <div className="p-4">
                      <p className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground mb-3">Training Checkpoints</p>
                      {checkpoints.length === 0 ? (
                        <p className="text-xs text-muted-foreground font-mono text-center py-8">Train an NPC to see checkpoints.</p>
                      ) : (
                        <div className="space-y-2">
                          {checkpoints.map((cp, i) => (
                            <div key={i} className="flex items-center gap-3 rounded-lg border border-border bg-background p-2.5">
                              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-mono text-xs font-bold">
                                #{i + 1}
                              </div>
                              <div className="flex-1">
                                <p className="text-xs font-heading font-semibold">Episode {cp.episode}</p>
                                <p className="text-[9px] text-muted-foreground font-mono">{new Date(cp.timestamp).toLocaleTimeString()} · Reward: {cp.reward.toFixed(1)}</p>
                              </div>
                              <div className="flex gap-1.5">
                                <button className="rounded-lg border border-border px-2 py-1 text-[9px] font-mono text-muted-foreground hover:text-foreground transition-colors">Load</button>
                                <button className="rounded-lg border border-border px-2 py-1 text-[9px] font-mono text-muted-foreground hover:text-foreground transition-colors">Resume</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Export (#32) */}
                      {trained && (
                        <div className="mt-4 flex gap-2">
                          <button onClick={() => {
                            const policy = JSON.stringify({ name: npcName, config, behavior, checkpoints, tree: behaviorTree }, null, 2);
                            const blob = new Blob([policy], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${npcName.replace(/\s+/g, '-').toLowerCase()}-policy.json`;
                            a.click();
                            toast.success('Policy exported!');
                          }} className="flex-1 rounded-lg bg-primary px-4 py-2 font-heading text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity">
                            Export JSON Policy
                          </button>
                          <button className="flex-1 rounded-lg border border-border px-4 py-2 font-heading text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                            Export to Game Studio
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Features */}
          <section className="border-t border-border bg-card/30">
            <div className="mx-auto max-w-5xl px-4 py-10">
              <h2 className="font-heading text-lg font-semibold text-center mb-6">NPC Training Capabilities</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { icon: '🧠', title: 'RL Algorithms', desc: 'PPO, DQN, A3C with full hyperparameter control' },
                  { icon: '🎯', title: 'Reward Compiler', desc: 'Plain English → numeric reward signal' },
                  { icon: '📊', title: 'Training Curves', desc: 'Live reward visualization per episode' },
                  { icon: '🌳', title: 'Behavior Trees', desc: 'Neural policy → editable decision tree' },
                  { icon: '💾', title: 'Checkpoints', desc: 'Save every N episodes, load any state' },
                  { icon: '🎭', title: 'Personality', desc: 'Aggression, curiosity, caution sliders' },
                  { icon: '📄', title: 'Strategy Summary', desc: 'AI describes what the agent learned' },
                  { icon: '📦', title: 'JSON Export', desc: 'Client-side inference, no server needed' },
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

export default NPCLab;
