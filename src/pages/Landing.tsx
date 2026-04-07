import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { supabase } from '@/integrations/supabase/client';

const GAMES = [
  { id: 'apex-arena', title: 'Apex Arena', genre: 'Shooter', players: '1–4', coverClass: 'cover-apex-arena' },
  { id: 'pong', title: 'Pong', genre: 'Classic', players: '1–2', coverClass: 'cover-pong' },
  { id: 'maze-runner', title: 'Maze Runner', genre: 'Puzzle', players: '1–4', coverClass: 'cover-maze-runner' },
];

const STEPS = [
  { num: '01', title: 'Play solo on phone', desc: 'Open any game, tap Play — your phone is the console AND controller. Solo play, instant, no setup.' },
  { num: '02', title: 'Or scan QR for big screen', desc: 'Open Eternity on a TV or laptop. Players scan the QR code on their phone. Works over any network.' },
  { num: '03', title: 'Phones become controllers', desc: 'D-pad + buttons on your phone. Up to 4 players. No pairing, no app downloads, no accounts.' },
];

const PhoneIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-foreground">
    <rect x="7" y="2" width="10" height="20" rx="2" />
    <line x1="12" y1="18" x2="12" y2="18.01" />
  </svg>
);

const LaptopPhoneIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-foreground">
    <rect x="2" y="4" width="14" height="10" rx="1" />
    <path d="M0 14h18" />
    <rect x="17" y="6" width="6" height="12" rx="1" />
    <line x1="20" y1="15" x2="20" y2="15.01" />
  </svg>
);

const MultiplayerIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-foreground">
    <path d="M6 11h4M8 9v4" />
    <line x1="15" y1="12" x2="15.01" y2="12" />
    <line x1="18" y1="10" x2="18.01" y2="10" />
    <path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z" />
  </svg>
);

const PLAY_MODES = [
  { icon: PhoneIcon, title: 'Phone Only', desc: 'Play solo on your phone. Game + controller on one screen.', link: '/play/solo' },
  { icon: LaptopPhoneIcon, title: 'Laptop + Phone', desc: 'Game on laptop, phone as controller. Scan QR to connect.', link: '/play/host' },
  { icon: MultiplayerIcon, title: 'Multiplayer', desc: 'Up to 4 players. Each phone is a controller.', link: '/play' },
];

const DEVICE_TAGS = ['TV', 'Laptop', 'Phone', 'Tablet', 'Car display'];
const ENGINES = ['HTML5', 'Phaser 3', 'Unity', 'Godot', 'Unreal'];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as const } }),
};

const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
};

interface PlatformStats {
  totalGames: number;
  totalUsers: number;
  activeSessions: number;
}

interface Contributor {
  username: string | null;
  email: string;
  avatar_url: string | null;
  role: string;
}

export default function Landing() {
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [stats, setStats] = useState<PlatformStats>({ totalGames: 3, totalUsers: 0, activeSessions: 0 });
  const [onlineCount, setOnlineCount] = useState(0);

  useEffect(() => {
    supabase.from('profiles').select('username, email, avatar_url, role').order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data) {
          setContributors(data as Contributor[]);
          setStats(s => ({ ...s, totalUsers: data.length }));
        }
      });
    supabase.from('play_events').select('id', { count: 'exact', head: true })
      .then(({ count }) => setStats(s => ({ ...s, activeSessions: count || 0 })));
    supabase.from('approved_games').select('id', { count: 'exact', head: true })
      .then(({ count }) => setStats(s => ({ ...s, totalGames: 3 + (count || 0) })));

    // Track online presence
    const visitorId = sessionStorage.getItem('visitor-id') || crypto.randomUUID();
    sessionStorage.setItem('visitor-id', visitorId);
    const presenceChannel = supabase.channel('online-users', { config: { presence: { key: visitorId } } });
    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        setOnlineCount(Object.keys(presenceChannel.presenceState()).length);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => { supabase.removeChannel(presenceChannel); };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-32 pb-24 px-6 noise-overlay overflow-hidden">
        <div className="max-w-5xl mx-auto">
          <motion.div
            className="max-w-2xl space-y-6"
            initial="hidden"
            animate="visible"
            variants={stagger}
          >
            <motion.span variants={fadeUp} custom={0} className="font-mono text-[10px] text-primary tracking-[0.2em] uppercase block">
              ∞ Eternity Console
            </motion.span>
            <motion.h1 variants={fadeUp} custom={1} className="font-heading text-[clamp(36px,5.2vw,56px)] font-extrabold leading-[1.05] tracking-tight text-foreground">
              Your screen.<br />Their phones.<br /><span className="text-muted-foreground">One game.</span>
            </motion.h1>
            <motion.p variants={fadeUp} custom={2} className="text-[15px] text-muted-foreground max-w-[420px] leading-relaxed font-body">
              Play solo on phone or play together on any screen. No downloads, no accounts, no pairing. Just open and play.
            </motion.p>
            <motion.div variants={fadeUp} custom={3} className="flex items-center gap-3 pt-4 flex-wrap">
              <Link to="/play" className="bg-primary text-primary-foreground font-heading font-semibold px-7 rounded-lg hover:opacity-90 transition-opacity text-sm h-11 inline-flex items-center">
                Start a game →
              </Link>
              <Link to="/play/solo" className="border border-border text-foreground font-heading font-semibold px-7 rounded-lg hover:border-primary/30 transition-colors text-sm h-11 inline-flex items-center">
                Solo on phone
              </Link>
              <Link to="/games" className="border border-border text-foreground font-heading font-semibold px-7 rounded-lg hover:border-primary/30 transition-colors text-sm h-11 inline-flex items-center">
                Browse games
              </Link>
            </motion.div>
            <motion.div variants={fadeUp} custom={4} className="flex items-center gap-2 pt-2 flex-wrap">
              {DEVICE_TAGS.map(tag => (
                <span key={tag} className="text-[10px] text-muted-foreground border border-border rounded-full px-3 py-1 font-mono">{tag}</span>
              ))}
            </motion.div>
            <motion.div variants={fadeUp} custom={5} className="flex items-center gap-6 pt-2">
              <span className="font-mono text-[10px] text-muted-foreground">{stats.totalGames} games</span>
              <span className="font-mono text-[10px] text-muted-foreground">{stats.totalUsers} players</span>
              {stats.activeSessions > 0 && <span className="font-mono text-[10px] text-muted-foreground">{stats.activeSessions} game players</span>}
              {onlineCount > 0 && (
                <span className="font-mono text-[10px] text-primary flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  {onlineCount} online
                </span>
              )}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Play Modes */}
      <section className="py-20 px-6 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <motion.span
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            className="font-mono text-[11px] text-muted-foreground tracking-[0.12em] uppercase block mb-10"
          >
            Choose how to play
          </motion.span>
          <div className="grid md:grid-cols-3 gap-4">
            {PLAY_MODES.map((mode, i) => (
              <motion.div
                key={mode.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
              >
                <Link
                  to={mode.link}
                  className="block p-6 rounded-[10px] border border-border bg-card hover:border-primary/30 transition-all duration-200 hover:shadow-lg hover:shadow-primary/5 h-full"
                >
                  <span className="block mb-3"><mode.icon /></span>
                  <h3 className="font-heading text-sm font-semibold text-foreground mb-1">{mode.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{mode.desc}</p>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-6 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <motion.span
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            className="font-mono text-[11px] text-muted-foreground tracking-[0.12em] uppercase block mb-10"
          >
            How it works
          </motion.span>
          <div className="grid md:grid-cols-3 gap-12">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12, duration: 0.45 }}
                className="space-y-3"
              >
                <span className="font-mono text-primary text-xs">{step.num}</span>
                <h3 className="font-heading text-[15px] font-semibold text-foreground">{step.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Game library */}
      <section className="py-20 px-6 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <motion.span
              initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
              className="font-mono text-[11px] text-muted-foreground tracking-[0.12em] uppercase"
            >
              Game library
            </motion.span>
            <Link to="/games" className="font-mono text-[11px] text-primary hover:text-primary/80 transition-colors">View all →</Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {GAMES.map((game, i) => (
              <motion.div
                key={game.id}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.35 }}
              >
                <Link to={`/games/${game.id}`} className="group rounded-[10px] border border-border overflow-hidden hover:border-primary/30 transition-colors duration-150 bg-card block">
                  <div className={`aspect-video relative ${game.coverClass}`}>
                    <span className="absolute top-2 right-2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/20 text-primary">Official</span>
                  </div>
                  <div className="p-3 space-y-1">
                    <h3 className="font-heading font-semibold text-sm text-foreground group-hover:text-primary transition-colors duration-150">{game.title}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-muted-foreground">{game.genre}</span>
                      <span className="text-[10px] font-mono text-muted-foreground">· {game.players} players</span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contribute */}
      <section className="py-20 px-6 border-t border-border">
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="space-y-5"
          >
            <h2 className="font-heading text-[28px] font-bold text-foreground leading-tight">Build for Eternity.</h2>
            <p className="text-[15px] text-muted-foreground leading-relaxed">
              Submit your GitHub repo or Unity build. We handle multiplayer, hosting, and security scanning. Once reviewed, your game goes live with a Community badge.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {ENGINES.map(e => (
                <span key={e} className="text-[10px] font-mono text-muted-foreground border border-border rounded-full px-3 py-1">{e}</span>
              ))}
            </div>
            <div className="flex gap-3 pt-2">
              <Link to="/contribute" className="inline-flex items-center gap-2 text-foreground text-sm font-heading font-semibold hover:text-primary transition-colors border border-border rounded-lg px-5 py-2">
                Submit your game →
              </Link>
              <Link to="/developers" className="inline-flex items-center text-muted-foreground text-sm font-heading font-medium hover:text-foreground transition-colors border border-border rounded-lg px-5 py-2">
                Dev docs
              </Link>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="flex items-center gap-10 justify-center"
          >
            {[
              { val: String(stats.totalGames), label: 'games' },
              { val: '1–4', label: 'players' },
              { val: '∞', label: 'screens' },
            ].map(stat => (
              <div key={stat.label} className="text-center space-y-1">
                <div className="font-heading text-2xl font-bold text-foreground">{stat.val}</div>
                <div className="text-[11px] text-muted-foreground font-mono">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Eternity Ecosystem */}
      <section className="py-20 px-6 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
            <span className="font-mono text-[11px] text-muted-foreground tracking-[0.12em] uppercase block mb-2">The Eternity Ecosystem</span>
            <h2 className="font-heading text-[28px] font-bold text-foreground leading-tight mb-3">More than a console.</h2>
            <p className="text-sm text-muted-foreground max-w-lg mb-10">Eternity is expanding into a full game creation ecosystem. Build games, train NPCs, and play — all from your browser.</p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-4">
            {/* Eternity Console */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0, duration: 0.4 }}
              className="relative p-6 rounded-[10px] border border-primary/30 bg-card"
            >
              <span className="absolute top-3 right-3 text-[9px] font-mono px-2 py-0.5 rounded-full bg-primary/20 text-primary">Live</span>
              <span className="block mb-3">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                  <path d="M6 11h4M8 9v4" /><line x1="15" y1="12" x2="15.01" y2="12" /><line x1="18" y1="10" x2="18.01" y2="10" />
                  <path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z" />
                </svg>
              </span>
              <h3 className="font-heading text-sm font-semibold text-foreground mb-1">Eternity Console</h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">Play multiplayer games instantly. Your phone is the controller. No downloads, no apps.</p>
              <span className="text-[10px] font-mono text-primary">You're here →</span>
            </motion.div>

            {/* Eternity Game Studio */}
            <motion.a
              href="/studio"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="relative p-6 rounded-[10px] border border-border bg-card hover:border-primary/20 transition-colors group"
            >
              <span className="absolute top-3 right-3 text-[9px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary">Live</span>
              <span className="block mb-3">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-foreground group-hover:text-primary transition-colors">
                  <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /><line x1="14" y1="4" x2="10" y2="20" />
                </svg>
              </span>
              <h3 className="font-heading text-sm font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">Eternity Game Studio</h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">Build games by describing them. Live code editor with AI — just tell it what you want and watch your game come to life.</p>
              <span className="text-[10px] font-mono text-muted-foreground group-hover:text-primary transition-colors">Open Studio →</span>
            </motion.a>

            {/* Eternity NPC Lab */}
            <motion.a
              href="/npc-lab"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="relative p-6 rounded-[10px] border border-border bg-card hover:border-primary/20 transition-colors group"
            >
              <span className="absolute top-3 right-3 text-[9px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary">Live</span>
              <span className="block mb-3">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-foreground group-hover:text-primary transition-colors">
                  <path d="M12 2a4 4 0 0 1 4 4c0 1.5-.8 2.8-2 3.5V11h3a3 3 0 0 1 3 3v1" /><path d="M12 2a4 4 0 0 0-4 4c0 1.5.8 2.8 2 3.5V11H7a3 3 0 0 0-3 3v1" />
                  <circle cx="12" cy="5" r="1" /><path d="M7 18h10" /><path d="M9 22v-4" /><path d="M15 22v-4" />
                </svg>
              </span>
              <h3 className="font-heading text-sm font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">Eternity NPC Lab</h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">Train NPC characters with AI behavior. Connect your Game Studio project and watch NPCs learn, adapt, and react intelligently.</p>
              <span className="text-[10px] font-mono text-muted-foreground group-hover:text-primary transition-colors">Open NPC Lab →</span>
            </motion.a>
          </div>
        </div>
      </section>

      {/* Contributors */}
      {contributors.length > 0 && (
        <section className="py-16 px-6 border-t border-border">
          <div className="max-w-5xl mx-auto">
            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
              <span className="font-mono text-[11px] text-muted-foreground tracking-[0.12em] uppercase">Contributors of Eternity</span>
              <p className="text-xs text-muted-foreground mt-2 mb-8">The people building and shaping Eternity Console.</p>
            </motion.div>
            <div className="flex flex-wrap gap-3">
              {contributors.map((c, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05, duration: 0.3 }}
                >
                  <Link to={c.username ? `/dev/${c.username}` : '#'} className="flex items-center gap-2.5 bg-card border border-border rounded-lg px-4 py-2.5 hover:border-primary/20 transition-colors">
                    {c.avatar_url ? (
                      <img src={c.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                        <span className="text-xs font-mono text-muted-foreground">{(c.username || c.email)[0]?.toUpperCase()}</span>
                      </div>
                    )}
                    <div>
                      <span className="font-heading text-xs font-semibold text-foreground block leading-tight">{c.username || c.email.split('@')[0]}</span>
                      <span className="font-mono text-[9px] text-muted-foreground uppercase">
                        {c.role === 'admin' ? 'Founder & Admin' : c.role === 'developer' ? 'Developer' : 'Member'}
                      </span>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
}
