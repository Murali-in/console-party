import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { supabase } from '@/integrations/supabase/client';

const GAMES = [
  { id: 'bomb-arena', title: 'Bomb Pass', genre: 'Party', players: '2–4', coverClass: 'cover-bomb-arena' },
  { id: 'nitro-race', title: 'Nitro Race', genre: 'Racing', players: '2–4', coverClass: 'cover-nitro-race' },
  { id: 'apex-arena', title: 'Apex Arena', genre: 'Shooter', players: '2–4', coverClass: 'cover-apex-arena' },
  { id: 'pong', title: 'Pong', genre: 'Classic', players: '2', coverClass: 'cover-pong' },
  { id: 'tank-battle', title: 'Tank Battle', genre: 'Combat', players: '2–4', coverClass: 'cover-tank-battle' },
  { id: 'snake-battle', title: 'Snake Battle', genre: 'Arcade', players: '2–4', coverClass: 'cover-snake-battle' },
  { id: 'platform-fighter', title: 'Brawl Zone', genre: 'Fighter', players: '2–4', coverClass: 'cover-platform-fighter' },
  { id: 'maze-runner', title: 'Maze Runner', genre: 'Puzzle', players: '2–4', coverClass: 'cover-maze-runner' },
  { id: 'trivia-clash', title: 'Trivia Clash', genre: 'Quiz', players: '2–4', coverClass: 'cover-trivia-clash' },
];

const STEPS = [
  { num: '01', title: 'Open on any screen', desc: 'Load Eternity on your TV, laptop, or PC browser. No installs. Just open the site.' },
  { num: '02', title: 'Players scan QR', desc: 'Each player scans the QR code on their phone. Works over any connection — same Wi-Fi not required.' },
  { num: '03', title: 'Play instantly', desc: 'Phones become controllers. No pairing. No apps. The game starts immediately.' },
];

const DEVICE_TAGS = ['TV', 'Laptop', 'Phone', 'Tablet', 'Car display'];
const ENGINES = ['HTML5', 'Phaser 3', 'Unity', 'Godot', 'Unreal'];

interface Contributor {
  username: string | null;
  email: string;
  avatar_url: string | null;
  role: string;
}

export default function Landing() {
  const [contributors, setContributors] = useState<Contributor[]>([]);

  useEffect(() => {
    // Fetch real contributors (users who have submitted games or are developers/admin)
    supabase
      .from('profiles')
      .select('username, email, avatar_url, role')
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data) setContributors(data as Contributor[]);
      });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-32 pb-24 px-6 noise-overlay overflow-hidden">
        <div className="max-w-5xl mx-auto">
          <div className="max-w-2xl space-y-6">
            <span className="font-mono text-[10px] text-primary tracking-[0.2em] uppercase">
              ∞ Eternity Console
            </span>
            <h1 className="font-heading text-[clamp(36px,5.2vw,56px)] font-extrabold leading-[1.05] tracking-tight text-foreground">
              Your screen.<br />
              Their phones.<br />
              <span className="text-muted-foreground">One game.</span>
            </h1>
            <p className="text-[15px] text-muted-foreground max-w-[420px] leading-relaxed font-body">
              No downloads. No pairing. Open on any screen, scan the QR,
              and play instantly. Works over any network.
            </p>
            <div className="flex items-center gap-3 pt-4">
              <Link
                to="/play"
                className="bg-primary text-primary-foreground font-heading font-semibold px-7 rounded-lg hover:opacity-90 transition-opacity text-sm h-11 inline-flex items-center"
              >
                Start a game →
              </Link>
              <Link
                to="/games"
                className="border border-border text-foreground font-heading font-semibold px-7 rounded-lg hover:border-primary/30 transition-colors text-sm h-11 inline-flex items-center"
              >
                Browse games
              </Link>
            </div>
            <div className="flex items-center gap-2 pt-2 flex-wrap">
              {DEVICE_TAGS.map(tag => (
                <span key={tag} className="text-[10px] text-muted-foreground border border-border rounded-full px-3 py-1 font-mono">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-6 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <span className="font-mono text-[11px] text-muted-foreground tracking-[0.12em] uppercase">How it works</span>
          <div className="grid md:grid-cols-3 gap-12 mt-10">
            {STEPS.map((step) => (
              <div key={step.num} className="space-y-3">
                <span className="font-mono text-primary text-xs">{step.num}</span>
                <h3 className="font-heading text-[15px] font-semibold text-foreground">{step.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Game library */}
      <section className="py-20 px-6 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <span className="font-mono text-[11px] text-muted-foreground tracking-[0.12em] uppercase">Game library</span>
            <span className="font-mono text-[11px] text-muted-foreground">{GAMES.length} games</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {GAMES.map((game) => (
              <Link
                key={game.id}
                to={`/games/${game.id}`}
                className="group rounded-[10px] border border-border overflow-hidden hover:border-primary/30 transition-colors duration-150 bg-card"
              >
                <div className={`aspect-video relative ${game.coverClass}`}>
                  <span className="absolute top-2 right-2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/20 text-primary">
                    Official
                  </span>
                </div>
                <div className="p-3 space-y-1">
                  <h3 className="font-heading font-semibold text-sm text-foreground group-hover:text-primary transition-colors duration-150">
                    {game.title}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-muted-foreground">{game.genre}</span>
                    <span className="text-[10px] font-mono text-muted-foreground">· {game.players} players</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Contribute */}
      <section className="py-20 px-6 border-t border-border">
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div className="space-y-5">
            <h2 className="font-heading text-[28px] font-bold text-foreground leading-tight">Build for Eternity.</h2>
            <p className="text-[15px] text-muted-foreground leading-relaxed">
              Submit your GitHub repo or Unity build. We handle multiplayer,
              hosting, and security scanning. Once reviewed, your game goes
              live to all players with a Community badge.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {ENGINES.map(e => (
                <span key={e} className="text-[10px] font-mono text-muted-foreground border border-border rounded-full px-3 py-1">
                  {e}
                </span>
              ))}
            </div>
            <Link
              to="/contribute"
              className="inline-flex items-center gap-2 text-foreground text-sm font-heading font-semibold hover:text-primary transition-colors duration-150 border border-border rounded-lg px-5 py-2 mt-2"
            >
              Submit your game →
            </Link>
          </div>
          <div className="flex items-center gap-10 justify-center">
            {[
              { val: '9', label: 'games' },
              { val: '2–4', label: 'players' },
              { val: '∞', label: 'screens' },
            ].map(stat => (
              <div key={stat.label} className="text-center space-y-1">
                <div className="font-heading text-2xl font-bold text-foreground">{stat.val}</div>
                <div className="text-[11px] text-muted-foreground font-mono">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contributors — real data from database */}
      {contributors.length > 0 && (
        <section className="py-16 px-6 border-t border-border">
          <div className="max-w-5xl mx-auto">
            <span className="font-mono text-[11px] text-muted-foreground tracking-[0.12em] uppercase">
              Contributors of Eternity
            </span>
            <p className="text-xs text-muted-foreground mt-2 mb-8">
              The people building and shaping Eternity Console.
            </p>
            <div className="flex flex-wrap gap-3">
              {contributors.map((c, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2.5 bg-card border border-border rounded-lg px-4 py-2.5"
                >
                  {c.avatar_url ? (
                    <img src={c.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                      <span className="text-xs font-mono text-muted-foreground">
                        {(c.username || c.email)[0]?.toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="font-heading text-xs font-semibold text-foreground block leading-tight">
                      {c.username || c.email.split('@')[0]}
                    </span>
                    <span className="font-mono text-[9px] text-muted-foreground uppercase">
                      {c.role === 'admin' ? 'Admin' : c.role === 'developer' ? 'Developer' : 'Member'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
}
