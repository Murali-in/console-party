import { useParams, Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface LeaderboardEntry {
  player_name: string;
  score: number;
  is_winner: boolean;
  played_at: string;
}

interface ApprovedGameRecord {
  id: string;
  is_private: boolean;
}

const GAMES_DATA: Record<string, {
  title: string;
  genre: string;
  minPlayers: number;
  maxPlayers: number;
  desc: string;
  coverClass: string;
  controls: string[];
  rules: string[];
  sourceUrl?: string;
  githubUrl?: string;
}> = {
  'bomb-arena': {
    title: 'Bomb Pass', genre: 'Party', minPlayers: 2, maxPlayers: 4,
    desc: 'Hot potato meets survival. A ticking bomb is passed between players — hold it when it blows and you\'re out. Last player standing wins the round.',
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
    desc: 'Top-down arena shooter. Move, aim, and fire in a closed arena. First player to reach 10 kills wins.',
    coverClass: 'cover-apex-arena',
    controls: ['Joystick: Move and aim', 'Button A: Shoot', 'Button B: Dash'],
    rules: ['First to 10 kills wins', 'Bullets travel in the direction you face', 'Respawn after 2 seconds on death'],
  },
  'pong': {
    title: 'Pong', genre: 'Classic', minPlayers: 2, maxPlayers: 2,
    desc: 'The original competitive game. Two paddles, one ball, pure skill. First to 7 points wins.',
    coverClass: 'cover-pong',
    controls: ['Joystick Up/Down: Move paddle', 'Button B: Lunge paddle forward'],
    rules: ['Ball speeds up after each hit', 'Score when the ball passes your opponent', 'First to 7 points wins'],
  },
  'tank-battle': {
    title: 'Tank Battle', genre: 'Combat', minPlayers: 2, maxPlayers: 4,
    desc: 'Drive your tank, aim carefully, and blast opponents. Bullets bounce off walls once. Last tank standing scores a point.',
    coverClass: 'cover-tank-battle',
    controls: ['Joystick: Drive tank', 'Button A: Fire cannon', 'Button B: Boost speed'],
    rules: ['Bullets bounce off walls once', 'One hit = one kill', 'Last tank standing scores a point', 'First to 5 points wins'],
  },
  'snake-battle': {
    title: 'Snake Battle', genre: 'Arcade', minPlayers: 2, maxPlayers: 4,
    desc: 'Multiplayer snake on a shared grid. Eat food to grow longer, crash into anything and you\'re out.',
    coverClass: 'cover-snake-battle',
    controls: ['Joystick: Change snake direction', 'Button B: Speed boost'],
    rules: ['Eat food to grow', 'Crash into walls or any snake = death', 'Last snake alive wins'],
  },
  'platform-fighter': {
    title: 'Brawl Zone', genre: 'Fighter', minPlayers: 2, maxPlayers: 4,
    desc: 'Platform fighter with double jumps, punches, and knockback. First to 5 KOs wins.',
    coverClass: 'cover-platform-fighter',
    controls: ['Joystick: Move left/right', 'Joystick Up / Button B: Jump (double jump)', 'Button A: Punch attack'],
    rules: ['First to 5 KOs wins', 'Double jump available', 'Falling off screen = death + respawn'],
  },
  'maze-runner': {
    title: 'Maze Runner', genre: 'Puzzle', minPlayers: 2, maxPlayers: 4,
    desc: 'Race through procedurally generated mazes. Collect gold coins for bonus points and reach the exit first.',
    coverClass: 'cover-maze-runner',
    controls: ['Joystick: Move through maze (4 directions)'],
    rules: ['First to the exit scores 5 points', 'Coins give 1 point each', '3 rounds total', 'Highest total score wins'],
  },
  'trivia-clash': {
    title: 'Trivia Clash', genre: 'Quiz', minPlayers: 2, maxPlayers: 4,
    desc: '10 rounds of rapid-fire general knowledge trivia. Use your joystick direction to pick answers.',
    coverClass: 'cover-trivia-clash',
    controls: ['Joystick Up: Answer A', 'Joystick Right: Answer B', 'Joystick Down: Answer C', 'Joystick Left: Answer D'],
    rules: ['10 questions per game', '10 seconds per question', 'Faster answers = more points', 'Highest total score wins'],
  },
  'tosios': {
    title: 'TOSIOS', genre: 'Shooter', minPlayers: 2, maxPlayers: 4,
    desc: 'Official embedded multiplayer shooter loaded from its live open-source deployment.',
    coverClass: 'cover-tosios',
    controls: ['D-Pad / WASD: Move', 'A / Space: Main action', 'B / Shift: Secondary action'],
    rules: ['Loaded from the live TOSIOS site inside a sandboxed iframe', 'Use Eternity Console to launch the session on the host screen', 'Phones can join the room as controllers while the game is displayed on the shared screen'],
    sourceUrl: 'https://tosios.online',
    githubUrl: 'https://github.com/halftheopposite/TOSIOS',
  },
  'kaetram': {
    title: 'Kaetram', genre: 'RPG', minPlayers: 1, maxPlayers: 4,
    desc: 'Official embedded 2D MMORPG loaded from its live open-source deployment.',
    coverClass: 'cover-kaetram',
    controls: ['D-Pad / WASD: Move', 'A / Space: Main action', 'B / Shift: Secondary action'],
    rules: ['Loaded from the live Kaetram site inside a sandboxed iframe', 'Use Eternity Console to launch the session on the host screen', 'Phones can join the room as controllers while the game is displayed on the shared screen'],
    sourceUrl: 'https://kaetram.com',
    githubUrl: 'https://github.com/Kaetram/Kaetram-Open',
  },
};

export default function GameDetail() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const game = gameId ? GAMES_DATA[gameId] : null;
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loadingLb, setLoadingLb] = useState(true);
  const [approvedRecord, setApprovedRecord] = useState<ApprovedGameRecord | null>(null);
  const [adminBusy, setAdminBusy] = useState(false);

  useEffect(() => {
    if (!gameId) return;

    setLoadingLb(true);
    supabase
      .from('leaderboards')
      .select('player_name, score, is_winner, played_at')
      .eq('game_id', gameId)
      .eq('is_winner', true)
      .order('score', { ascending: false })
      .limit(10)
      .then(({ data }) => {
        setLeaderboard((data as LeaderboardEntry[]) || []);
        setLoadingLb(false);
      });
  }, [gameId]);

  useEffect(() => {
    if (!game?.title) return;

    supabase
      .from('approved_games')
      .select('id, is_private')
      .eq('title', game.title)
      .maybeSingle()
      .then(({ data }) => setApprovedRecord((data as ApprovedGameRecord) || null));
  }, [game?.title]);

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

  const handleTogglePrivate = async () => {
    if (!approvedRecord) return;
    setAdminBusy(true);
    const nextValue = !approvedRecord.is_private;
    await supabase.from('approved_games').update({ is_private: nextValue } as any).eq('id', approvedRecord.id);
    setApprovedRecord({ ...approvedRecord, is_private: nextValue });
    setAdminBusy(false);
  };

  const handleDelete = async () => {
    if (!approvedRecord) return;
    const confirmed = window.confirm(`Delete ${game.title} from the game library?`);
    if (!confirmed) return;

    setAdminBusy(true);
    await supabase.from('approved_games').delete().eq('id', approvedRecord.id);
    setAdminBusy(false);
    navigate('/games');
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-20 px-6 max-w-4xl mx-auto">
        <Link to="/games" className="inline-flex items-center gap-2 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors mb-8">
          ← Back to library
        </Link>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div className={`aspect-video rounded-[10px] overflow-hidden border border-border ${game.coverClass}`} />
          <div className="space-y-4 flex flex-col justify-center">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/20 text-primary">Official</span>
              <span className="text-[10px] font-mono text-muted-foreground">{game.genre}</span>
              {approvedRecord?.is_private && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground">Private</span>
              )}
            </div>
            <h1 className="font-heading text-3xl font-bold text-foreground">{game.title}</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">{game.desc}</p>
            <div className="flex items-center gap-4 pt-2 flex-wrap">
              <span className="font-mono text-xs text-muted-foreground">{game.minPlayers}–{game.maxPlayers} players</span>
              {game.sourceUrl && (
                <a href={game.sourceUrl} target="_blank" rel="noreferrer" className="font-mono text-xs text-primary hover:opacity-80">
                  Live site →
                </a>
              )}
              {game.githubUrl && (
                <a href={game.githubUrl} target="_blank" rel="noreferrer" className="font-mono text-xs text-primary hover:opacity-80">
                  GitHub →
                </a>
              )}
            </div>
            <div className="flex items-center gap-3 flex-wrap pt-2">
              <button
                onClick={handleStartGame}
                className="bg-primary text-primary-foreground font-heading font-semibold px-6 py-3 rounded-lg hover:opacity-90 transition-opacity text-sm w-fit"
              >
                Start this game →
              </button>
              {isAdmin && approvedRecord && (
                <>
                  <button
                    type="button"
                    disabled={adminBusy}
                    onClick={handleTogglePrivate}
                    className="bg-secondary text-secondary-foreground border border-border font-heading font-semibold px-4 py-3 rounded-lg hover:bg-muted transition-colors text-sm disabled:opacity-50"
                  >
                    {approvedRecord.is_private ? 'Make Public' : 'Make Private'}
                  </button>
                  <button
                    type="button"
                    disabled={adminBusy}
                    onClick={handleDelete}
                    className="bg-destructive/10 text-destructive border border-destructive/30 font-heading font-semibold px-4 py-3 rounded-lg hover:bg-destructive/20 transition-colors text-sm disabled:opacity-50"
                  >
                    Delete Game
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
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

        <div className="p-6 rounded-[10px] border border-border bg-card space-y-4">
          <h2 className="font-heading text-lg font-semibold text-foreground">🏆 Top Scores</h2>
          {loadingLb ? (
            <p className="text-xs text-muted-foreground font-mono">Loading...</p>
          ) : leaderboard.length === 0 ? (
            <p className="text-xs text-muted-foreground font-mono">No scores yet. Be the first to play!</p>
          ) : (
            <div className="space-y-1">
              {leaderboard.map((entry, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-primary font-bold w-6 text-right">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                    </span>
                    <span className="font-heading text-sm text-foreground">{entry.player_name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-sm font-bold text-foreground">{entry.score}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {new Date(entry.played_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
