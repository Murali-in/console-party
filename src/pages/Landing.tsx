import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
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

const DEVICE_TAGS = ['TV', 'Laptop', 'Phone', 'Tablet', 'Car display'];
const ENGINES = ['HTML5', 'Phaser 3', 'Unity', 'Godot', 'Unreal'];

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

  useEffect(() => {
    supabase.from('profiles').select('username, email, avatar_url, role').order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data) {
          setContributors(data as Contributor[]);
          setStats(s => ({ ...s, totalUsers: data.length }));
        }
      });

    // Get active play events in last hour
    supabase.from('play_events').select('id', { count: 'exact', head: true })
      .gte('played_at', new Date(Date.now() - 3600000).toISOString())
      .then(({ count }) => {
        setStats(s => ({ ...s, activeSessions: count || 0 }));
      });

    // Count approved games
    supabase.from('approved_games').select('id', { count: 'exact', head: true })
      .then(({ count }) => {
        setStats(s => ({ ...s, totalGames: 3 + (count || 0) }));
      });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-32 pb-24 px-6 noise-overlay overflow-hidden">
        <div className="max-w-5xl mx-auto">
          <div className="max-w-2xl space-y-6">
            <span className="font-mono text-[10px] text-primary tracking-[0.2em] uppercase">∞ Eternity Console</span>
            <h1 className="font-heading text-[clamp(36px,5.2vw,56px)] font-extrabold leading-[1.05] tracking-tight text-foreground">
              Your screen.<br />Their phones.<br /><span className="text-muted-foreground">One game.</span>
            </h1>
            <p className="text-[15px] text-muted-foreground max-w-[420px] leading-relaxed font-body">
              Play solo on phone or play together on any screen. No downloads, no accounts, no pairing. Just open and play.
            </p>
            <div className="flex items-center gap-3 pt-4 flex-wrap">
              <Link to="/play" className="bg-primary text-primary-foreground font-heading font-semibold px-7 rounded-lg hover:opacity-90 transition-opacity text-sm h-11 inline-flex items-center">
                Start a game →
              </Link>
              <Link to="/play/solo" className="border border-border text-foreground font-heading font-semibold px-7 rounded-lg hover:border-primary/30 transition-colors text-sm h-11 inline-flex items-center">
                Solo on phone
              </Link>
              <Link to="/games" className="border border-border text-foreground font-heading font-semibold px-7 rounded-lg hover:border-primary/30 transition-colors text-sm h-11 inline-flex items-center">
                Browse games
              </Link>
            </div>
            <div className="flex items-center gap-2 pt-2 flex-wrap">
              {DEVICE_TAGS.map(tag => (
                <span key={tag} className="text-[10px] text-muted-foreground border border-border rounded-full px-3 py-1 font-mono">{tag}</span>
              ))}
            </div>
            {/* Live stats */}
            <div className="flex items-center gap-6 pt-2">
              <span className="font-mono text-[10px] text-muted-foreground">{stats.totalGames} games</span>
              <span className="font-mono text-[10px] text-muted-foreground">{stats.totalUsers} contributors</span>
              {stats.activeSessions > 0 && <span className="font-mono text-[10px] text-primary">{stats.activeSessions} playing now</span>}
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-6 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <span className="font-mono text-[11px] text-muted-foreground tracking-[0.12em] uppercase">How it works</span>
          <div className="grid md:grid-cols-3 gap-12 mt-10">
            {STEPS.map(step => (
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
            <Link to="/games" className="font-mono text-[11px] text-primary hover:text-primary/80 transition-colors">View all →</Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {GAMES.map(game => (
              <Link key={game.id} to={`/games/${game.id}`} className="group rounded-[10px] border border-border overflow-hidden hover:border-primary/30 transition-colors duration-150 bg-card">
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
          </div>
          <div className="flex items-center gap-10 justify-center">
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
          </div>
        </div>
      </section>

      {/* Contributors */}
      {contributors.length > 0 && (
        <section className="py-16 px-6 border-t border-border">
          <div className="max-w-5xl mx-auto">
            <span className="font-mono text-[11px] text-muted-foreground tracking-[0.12em] uppercase">Contributors of Eternity</span>
            <p className="text-xs text-muted-foreground mt-2 mb-8">The people building and shaping Eternity Console.</p>
            <div className="flex flex-wrap gap-3">
              {contributors.map((c, i) => (
                <Link key={i} to={c.username ? `/dev/${c.username}` : '#'} className="flex items-center gap-2.5 bg-card border border-border rounded-lg px-4 py-2.5 hover:border-primary/20 transition-colors">
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
                      {c.role === 'admin' ? 'Admin' : c.role === 'developer' ? 'Developer' : 'Member'}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
}
