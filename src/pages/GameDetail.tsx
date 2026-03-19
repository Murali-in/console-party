import { useParams, Link, useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const GAMES_DATA: Record<string, {
  title: string; genre: string; minPlayers: number; maxPlayers: number;
  desc: string; coverClass: string; controls: string[]; rules: string[];
}> = {
  'bomb-arena': {
    title: 'Bomb Pass', genre: 'Party', minPlayers: 2, maxPlayers: 4,
    desc: 'Hot potato meets survival. A ticking bomb is passed between players — hold it when it blows and you\'re out. Last player standing wins the round. Fast reflexes and timing are everything.',
    coverClass: 'cover-bomb-arena',
    controls: ['Joystick: Move around the arena', 'Button A: Pass the bomb to nearest player', 'Button B: Dash to dodge'],
    rules: ['Bomb timer is 8 seconds per round', 'Press A near another player to pass the bomb', 'Last player standing wins', 'Rounds continue until one player remains'],
  },
  'nitro-race': {
    title: 'Nitro Race', genre: 'Racing', minPlayers: 2, maxPlayers: 4,
    desc: 'Top-down arcade racing with nitro boosts. Navigate tight turns, activate nitro for speed bursts, and cross the finish line first. 3 laps to victory.',
    coverClass: 'cover-nitro-race',
    controls: ['Joystick: Steer left/right', 'Joystick Up: Accelerate', 'Button B: Nitro boost'],
    rules: ['Complete 3 laps to win', 'Nitro recharges over time', 'Colliding with walls slows you down', 'First to finish wins'],
  },
  'apex-arena': {
    title: 'Apex Arena', genre: 'Shooter', minPlayers: 2, maxPlayers: 4,
    desc: 'Top-down arena shooter. Move, aim, and fire in a closed arena. First player to reach 10 kills wins. Projectiles bounce off walls for trick shots.',
    coverClass: 'cover-apex-arena',
    controls: ['Joystick: Move and aim', 'Button A: Shoot', 'Button B: Dash'],
    rules: ['First to 10 kills wins', 'Bullets travel in the direction you face', 'Respawn after 2 seconds on death', 'Use walls for ricochet shots'],
  },
  'pong': {
    title: 'Pong', genre: 'Classic', minPlayers: 2, maxPlayers: 2,
    desc: 'The original competitive game. Two paddles, one ball, pure skill. Control your paddle and outmaneuver your opponent. First to 7 points wins.',
    coverClass: 'cover-pong',
    controls: ['Joystick Up/Down: Move paddle', 'Button B: Lunge paddle forward'],
    rules: ['Ball speeds up after each hit', 'Score when the ball passes your opponent', 'First to 7 points wins', 'Angle changes based on where the ball hits the paddle'],
  },
  'tank-battle': {
    title: 'Tank Battle', genre: 'Combat', minPlayers: 2, maxPlayers: 4,
    desc: 'Drive your tank, aim carefully, and blast opponents. Bullets bounce off walls once. Last tank standing in each round scores a point.',
    coverClass: 'cover-tank-battle',
    controls: ['Joystick: Drive tank', 'Button A: Fire cannon', 'Button B: Boost speed'],
    rules: ['Bullets bounce off walls once', 'One hit = one kill', 'Last tank standing scores a point', 'First to 5 points wins'],
  },
  'snake-battle': {
    title: 'Snake Battle', genre: 'Arcade', minPlayers: 2, maxPlayers: 4,
    desc: 'Multiplayer snake on a shared grid. Eat food to grow longer, but crash into a wall or any snake and you\'re out. Last snake alive wins.',
    coverClass: 'cover-snake-battle',
    controls: ['Joystick: Change snake direction', 'Button B: Speed boost'],
    rules: ['Eat food (red squares) to grow', 'Crash into walls or any snake = death', 'Last snake alive wins', 'Speed boost makes you faster but harder to control'],
  },
};

export default function GameDetail() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const game = gameId ? GAMES_DATA[gameId] : null;

  if (!game) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="font-heading text-2xl font-bold text-foreground">Game not found</h1>
          <Link to="/games" className="text-sm text-muted-foreground hover:text-foreground font-mono">
            ← Back to library
          </Link>
        </div>
      </div>
    );
  }

  const handleStartGame = () => {
    sessionStorage.setItem('preselected-game', gameId!);
    navigate('/play/host');
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-20 px-6 max-w-4xl mx-auto">
        {/* Back link */}
        <Link to="/games" className="inline-flex items-center gap-2 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors mb-8">
          ← Back to library
        </Link>

        {/* Hero */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div className={`aspect-video rounded-[10px] overflow-hidden border border-border ${game.coverClass}`} />
          <div className="space-y-4 flex flex-col justify-center">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/20 text-primary">Official</span>
              <span className="text-[10px] font-mono text-muted-foreground">{game.genre}</span>
            </div>
            <h1 className="font-heading text-3xl font-bold text-foreground">{game.title}</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">{game.desc}</p>
            <div className="flex items-center gap-4 pt-2">
              <span className="font-mono text-xs text-muted-foreground">{game.minPlayers}–{game.maxPlayers} players</span>
            </div>
            <button
              onClick={handleStartGame}
              className="bg-primary text-primary-foreground font-heading font-semibold px-6 py-3 rounded-lg hover:opacity-90 transition-opacity text-sm w-fit mt-2"
            >
              Start this game →
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="grid md:grid-cols-2 gap-8">
          <div className="p-6 rounded-[10px] border border-border bg-card space-y-4">
            <h2 className="font-heading text-lg font-semibold text-foreground">Controls</h2>
            <ul className="space-y-2">
              {game.controls.map((c, i) => (
                <li key={i} className="flex items-start gap-3 text-xs text-muted-foreground">
                  <span className="font-mono text-foreground shrink-0 w-4 text-right">{i + 1}.</span>
                  {c}
                </li>
              ))}
            </ul>
          </div>

          <div className="p-6 rounded-[10px] border border-border bg-card space-y-4">
            <h2 className="font-heading text-lg font-semibold text-foreground">Rules</h2>
            <ul className="space-y-2">
              {game.rules.map((r, i) => (
                <li key={i} className="flex items-start gap-3 text-xs text-muted-foreground">
                  <span className="font-mono text-foreground shrink-0 w-4 text-right">•</span>
                  {r}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
