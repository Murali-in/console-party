import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import GameCard from '@/components/GameCard';

const BUILT_IN_GAMES = [
  { title: 'Bomb Pass', genre: 'Party', minPlayers: 2, maxPlayers: 4, gameType: 'official' as const, desc: 'Hot potato meets battle royale' },
  { title: 'Nitro Race', genre: 'Racing', minPlayers: 2, maxPlayers: 4, gameType: 'official' as const, desc: 'Top-down arcade racing' },
  { title: 'Apex Arena', genre: 'Shooter', minPlayers: 2, maxPlayers: 4, gameType: 'official' as const, desc: 'Top-down competitive shooter' },
  { title: 'Prop Hunt', genre: 'Party', minPlayers: 2, maxPlayers: 4, gameType: 'official' as const, desc: 'Hide as objects, seek and destroy' },
  { title: 'Siege Battle', genre: 'Strategy', minPlayers: 2, maxPlayers: 2, gameType: 'official' as const, desc: 'Physics-based siege warfare' },
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
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h1 className="font-heading text-5xl md:text-7xl font-bold leading-tight tracking-tight text-foreground">
            Your screen. Their phones.{' '}
            <span className="text-primary">One game.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Browser-based local multiplayer. No downloads. No controllers needed.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              to="/play"
              className="bg-primary text-primary-foreground font-medium px-8 py-3 rounded-lg hover:opacity-90 transition-opacity text-sm"
            >
              Start a Game
            </Link>
            <Link
              to="/play"
              className="border border-border text-foreground font-medium px-8 py-3 rounded-lg hover:bg-secondary transition-colors text-sm"
            >
              Join with Code
            </Link>
          </div>
          <p className="text-xs text-muted-foreground pt-2">
            Works on TV · Laptop · Phone · Car Display
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-6 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-heading text-2xl font-semibold text-center mb-16 text-foreground">How it works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((step) => (
              <div key={step.num} className="space-y-4">
                <span className="font-mono text-primary text-sm">{step.num}</span>
                <h3 className="font-heading text-lg font-semibold text-foreground">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Game showcase */}
      <section className="py-20 px-6 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-heading text-2xl font-semibold mb-8 text-foreground">Featured Games</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {BUILT_IN_GAMES.map((game) => (
              <GameCard
                key={game.title}
                title={game.title}
                genre={game.genre}
                minPlayers={game.minPlayers}
                maxPlayers={game.maxPlayers}
                gameType={game.gameType}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Community */}
      <section className="py-20 px-6 border-t border-border">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h2 className="font-heading text-2xl font-semibold text-foreground">This is a growing platform.</h2>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xl mx-auto">
            Eternity Console is a growing platform. New games are added regularly —
            by our team and by developers like you. If you've built a small multiplayer
            browser game, you can submit it here. Once it passes our review, it goes
            live to all players. Your game. Real players. Zero distribution hassle.
          </p>
          <Link
            to="/contribute"
            className="inline-flex items-center gap-2 text-primary text-sm font-medium hover:opacity-80 transition-opacity"
          >
            Submit Your Game →
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
