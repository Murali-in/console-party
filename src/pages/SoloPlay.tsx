import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import GameCard from '@/components/GameCard';
import { Input } from '@/components/ui/input';

const BUILT_IN_GAMES = [
  { id: 'apex-arena', title: 'Apex Arena', genre: 'Shooter', desc: 'Top-down arena shooter. First to 10 kills wins.', coverClass: 'cover-apex-arena', minPlayers: 1, maxPlayers: 4 },
  { id: 'pong', title: 'Pong', genre: 'Classic', desc: 'Classic 2-player pong. First to 7 points wins.', coverClass: 'cover-pong', minPlayers: 1, maxPlayers: 2 },
  { id: 'maze-runner', title: 'Maze Runner', genre: 'Puzzle', desc: 'Race through procedural mazes and collect coins.', coverClass: 'cover-maze-runner', minPlayers: 1, maxPlayers: 4 },
];

const GENRES = ['All', 'Shooter', 'Classic', 'Puzzle'];

export default function SoloPlay() {
  const navigate = useNavigate();
  const { gameSlug } = useParams();
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [recentGames, setRecentGames] = useState<string[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('ec_recent_games');
    if (stored) setRecentGames(JSON.parse(stored));
  }, []);

  // If a specific game slug is provided, launch it directly
  useEffect(() => {
    if (gameSlug) {
      launchSoloGame(gameSlug);
    }
  }, [gameSlug]);

  const launchSoloGame = (gameId: string) => {
    // Save to recent
    const recent = [gameId, ...recentGames.filter(g => g !== gameId)].slice(0, 5);
    localStorage.setItem('ec_recent_games', JSON.stringify(recent));

    const roomCode = String(Math.floor(100000 + Math.random() * 900000));
    const players = [
      { id: 'solo-p1', name: 'You', index: 0, color: '#bfbfbf', ready: true },
      { id: 'demo-cpu', name: 'CPU', index: 1, color: '#f87171', ready: true },
    ];
    sessionStorage.setItem(`game-${roomCode}`, JSON.stringify({
      gameId, gameType: 'phaser', players, roomCode, demo: true,
    }));

    // Log play event
    supabase.from('play_events').insert({
      game_id: gameId,
      session_id: roomCode,
      device_type: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
    } as any).then(() => {});

    navigate(`/game/${roomCode}`);
  };

  const filtered = BUILT_IN_GAMES
    .filter(g => filter === 'All' || g.genre === filter)
    .filter(g => !search || g.title.toLowerCase().includes(search.toLowerCase()));

  const recentGameData = recentGames
    .map(id => BUILT_IN_GAMES.find(g => g.id === id))
    .filter(Boolean) as typeof BUILT_IN_GAMES;

  if (gameSlug) return null; // Will redirect

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-20 px-6 max-w-4xl mx-auto">
        <div className="space-y-2 mb-8">
          <h1 className="font-heading text-3xl font-bold text-foreground">Play Solo</h1>
          <p className="text-sm text-muted-foreground">Pick a game and play instantly vs CPU. No account needed.</p>
        </div>

        {/* Search */}
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search games..."
          className="mb-6 h-11 bg-secondary border-border"
        />

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {GENRES.map(g => (
            <button
              key={g}
              onClick={() => setFilter(g)}
              className={`px-4 py-1.5 text-sm rounded-lg font-heading font-medium transition-colors ${
                filter === g ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-muted'
              }`}
            >
              {g}
            </button>
          ))}
        </div>

        {/* Recently Played */}
        {recentGameData.length > 0 && (
          <div className="mb-8">
            <h2 className="font-heading text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Recently Played</h2>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {recentGameData.map(game => (
                <button
                  key={game.id}
                  onClick={() => launchSoloGame(game.id)}
                  className="flex-shrink-0 w-40 rounded-lg border border-border bg-card hover:border-primary/30 transition-colors text-left"
                >
                  <div className={`aspect-video rounded-t-lg ${game.coverClass}`} />
                  <div className="p-2">
                    <span className="font-heading text-xs font-semibold text-foreground">{game.title}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Game Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {filtered.map(game => (
            <button
              key={game.id}
              onClick={() => launchSoloGame(game.id)}
              className="rounded-[10px] border border-border overflow-hidden hover:border-primary/30 transition-colors bg-card text-left"
            >
              <div className={`aspect-video ${game.coverClass}`} />
              <div className="p-3 space-y-1">
                <h3 className="font-heading font-semibold text-sm text-foreground">{game.title}</h3>
                <p className="text-[10px] text-muted-foreground">{game.desc}</p>
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[10px] font-mono text-muted-foreground">{game.genre}</span>
                  <span className="bg-primary text-primary-foreground text-[10px] font-mono px-2 py-0.5 rounded">Play Now →</span>
                </div>
              </div>
            </button>
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground mt-12 text-sm">No games match your search.</p>
        )}
      </div>
      <Footer />
    </div>
  );
}
