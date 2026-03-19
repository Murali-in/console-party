import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const GAMES = [
  { id: 'bomb-arena', title: 'Bomb Arena', genre: 'Party', players: '2–4', coverClass: 'cover-bomb-arena' },
  { id: 'nitro-race', title: 'Nitro Race', genre: 'Racing', players: '2–4', coverClass: 'cover-nitro-race' },
  { id: 'apex-arena', title: 'Apex Arena', genre: 'Shooter', players: '2–4', coverClass: 'cover-apex-arena' },
  { id: 'pong', title: 'Pong', genre: 'Classic', players: '2', coverClass: 'cover-pong' },
  { id: 'tank-battle', title: 'Tank Battle', genre: 'Combat', players: '2–4', coverClass: 'cover-tank-battle' },
  { id: 'snake-battle', title: 'Snake Battle', genre: 'Arcade', players: '2–4', coverClass: 'cover-snake-battle' },
];

const STEPS = [
  { num: '01', title: 'Open on any screen', desc: 'Load Eternity on your TV, laptop, or PC browser. No installs. Just open the site.' },
  { num: '02', title: 'Players scan QR', desc: 'Each player scans the QR code on their phone. Works over any connection — same Wi-Fi not required.' },
  { num: '03', title: 'Play instantly', desc: 'Phones become controllers. No pairing. No apps. The game starts immediately.' },
];

const DEVICE_TAGS = ['TV', 'Laptop', 'Phone', 'Tablet', 'Car display'];

export default function Landing() {
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
                className="bg-primary text-background font-heading font-semibold px-7 rounded-lg hover:opacity-90 transition-opacity text-sm h-11 inline-flex items-center"
              >
                Start a game
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
              <div
                key={game.id}
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
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Community */}
      <section className="py-20 px-6 border-t border-border">
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div className="space-y-5">
            <h2 className="font-heading text-[28px] font-bold text-foreground leading-tight">A growing platform.</h2>
            <p className="text-[15px] text-muted-foreground leading-relaxed">
              Submit your game. Once reviewed, it goes live to all Eternity players
              with a Community badge. Real players, zero friction.
            </p>
            <Link
              to="/contribute"
              className="inline-flex items-center gap-2 text-foreground text-sm font-heading font-semibold hover:text-primary transition-colors duration-150 border border-border rounded-lg px-5 py-2 mt-2"
            >
              Submit your game →
            </Link>
          </div>
          <div className="flex items-center gap-10 justify-center">
            {[
              { val: '6', label: 'games' },
              { val: '2–4', label: 'players' },
              { val: '0', label: 'downloads' },
            ].map(stat => (
              <div key={stat.label} className="text-center space-y-1">
                <div className="font-heading text-2xl font-bold text-foreground">{stat.val}</div>
                <div className="text-[11px] text-muted-foreground font-mono">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
