import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const BUILT_IN_GAMES = [
  { id: 'bomb-pass', title: 'Bomb Pass', genre: 'Party', players: '2–4', coverClass: 'cover-bomb-pass' },
  { id: 'nitro-race', title: 'Nitro Race', genre: 'Racing', players: '2–4', coverClass: 'cover-nitro-race' },
  { id: 'apex-arena', title: 'Apex Arena', genre: 'Shooter', players: '2–4', coverClass: 'cover-apex-arena' },
  { id: 'prop-hunt', title: 'Prop Hunt', genre: 'Party', players: '2–4', coverClass: 'cover-prop-hunt' },
  { id: 'siege-battle', title: 'Siege Battle', genre: 'Strategy', players: '2', coverClass: 'cover-siege-battle' },
];

const STEPS = [
  { num: '01', title: 'Open on any screen', desc: 'TV, laptop, tablet — any browser works as the game screen.' },
  { num: '02', title: 'Players scan QR', desc: 'Each player scans the QR code with their phone to connect.' },
  { num: '03', title: 'Play instantly', desc: 'No downloads. Phones become controllers. Game starts immediately.' },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-32 pb-24 px-6 noise-overlay overflow-hidden">
        <div className="max-w-5xl mx-auto">
          <div className="max-w-2xl space-y-6">
            <span className="font-mono text-xs text-primary tracking-[0.15em] uppercase">
              ∞ Eternity Console
            </span>
            <h1 className="font-heading text-[52px] font-extrabold leading-[1.08] tracking-tight text-foreground">
              Your screen.<br />
              Their phones.<br />
              <span className="text-primary">One game.</span>
            </h1>
            <p className="text-[15px] text-muted-foreground max-w-lg leading-relaxed">
              No downloads. No controllers. Open the room on any screen — players
              join from their phone browser and play instantly.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <Link
                to="/play"
                className="bg-primary text-primary-foreground font-heading font-semibold px-7 py-2.5 rounded-lg hover:opacity-90 transition-opacity text-sm h-10 inline-flex items-center"
              >
                Start a game
              </Link>
              <Link
                to="/games"
                className="border border-border text-foreground font-heading font-medium px-7 py-2.5 rounded-lg hover:bg-secondary transition-colors text-sm h-10 inline-flex items-center"
              >
                Browse games →
              </Link>
            </div>
            <div className="flex items-center gap-3 pt-2">
              {['📺 TV', '💻 Laptop', '📱 Phone', '🚗 Car display'].map(tag => (
                <span key={tag} className="text-[11px] text-muted-foreground border border-border rounded-full px-3 py-1 font-mono">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 px-6 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-heading text-lg font-semibold text-center mb-12 text-foreground">How it works</h2>
          <div className="grid md:grid-cols-3 gap-8">
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

      {/* Game showcase */}
      <section className="py-16 px-6 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-heading text-lg font-semibold mb-6 text-foreground">Game library</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {BUILT_IN_GAMES.map((game) => (
              <div
                key={game.id}
                className="group rounded-lg border border-border overflow-hidden hover:border-primary/30 transition-colors bg-card"
              >
                <div className={`aspect-video relative ${game.coverClass}`}>
                  <span className="absolute top-2 right-2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/20 text-primary backdrop-blur-sm">
                    Official
                  </span>
                </div>
                <div className="p-3 space-y-1">
                  <h3 className="font-heading font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
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

      {/* Community / Developer */}
      <section className="py-16 px-6 border-t border-border">
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-4">
            <h2 className="font-heading text-lg font-semibold text-foreground">A growing platform.</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Have a game you've built? Submit it to Eternity Console.
              Players on TVs and phones instantly get access to your game.
              All submissions are reviewed before going live.
            </p>
            <Link
              to="/contribute"
              className="inline-flex items-center gap-2 text-primary text-sm font-heading font-medium hover:opacity-80 transition-opacity border border-border rounded-lg px-5 py-2"
            >
              Submit your game →
            </Link>
          </div>
          <div className="flex items-center gap-8 justify-center">
            {[
              { val: '5', label: 'games' },
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
