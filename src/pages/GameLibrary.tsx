import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import GameCard from '@/components/GameCard';

const BUILT_IN_GAMES = [
  { id: 'bomb-arena', title: 'Bomb Pass', description: 'Hot potato meets survival. Pass the bomb before it blows.', genre: 'Party', minPlayers: 2, maxPlayers: 4, gameType: 'official' as const, coverClass: 'cover-bomb-arena' },
  { id: 'nitro-race', title: 'Nitro Race', description: 'Top-down arcade racing with nitro boosts. 3 laps to victory.', genre: 'Racing', minPlayers: 2, maxPlayers: 4, gameType: 'official' as const, coverClass: 'cover-nitro-race' },
  { id: 'apex-arena', title: 'Apex Arena', description: 'Top-down competitive shooter. First to 10 kills wins.', genre: 'Shooter', minPlayers: 2, maxPlayers: 4, gameType: 'official' as const, coverClass: 'cover-apex-arena' },
  { id: 'pong', title: 'Pong', description: 'Classic 2-player pong. First to 7 points wins.', genre: 'Classic', minPlayers: 2, maxPlayers: 2, gameType: 'official' as const, coverClass: 'cover-pong' },
  { id: 'tank-battle', title: 'Tank Battle', description: 'Drive, aim, and shoot. Last tank standing wins.', genre: 'Combat', minPlayers: 2, maxPlayers: 4, gameType: 'official' as const, coverClass: 'cover-tank-battle' },
  { id: 'snake-battle', title: 'Snake Battle', description: 'Multiplayer snake on a shared grid. Last snake alive wins.', genre: 'Arcade', minPlayers: 2, maxPlayers: 4, gameType: 'official' as const, coverClass: 'cover-snake-battle' },
  { id: 'platform-fighter', title: 'Brawl Zone', description: 'Platform fighter with double jumps and knockback. First to 5 KOs wins.', genre: 'Fighter', minPlayers: 2, maxPlayers: 4, gameType: 'official' as const, coverClass: 'cover-platform-fighter' },
  { id: 'maze-runner', title: 'Maze Runner', description: 'Race through procedural mazes, collect coins, find the exit first.', genre: 'Puzzle', minPlayers: 2, maxPlayers: 4, gameType: 'official' as const, coverClass: 'cover-maze-runner' },
  { id: 'trivia-clash', title: 'Trivia Clash', description: '10 rounds of rapid-fire trivia. Point your joystick to answer.', genre: 'Quiz', minPlayers: 2, maxPlayers: 4, gameType: 'official' as const, coverClass: 'cover-trivia-clash' },
  { id: 'tosios', title: 'TOSIOS', description: 'Top-down multiplayer shooter. Last player alive wins.', genre: 'Shooter', minPlayers: 2, maxPlayers: 4, gameType: 'official' as const, coverClass: 'cover-tosios' },
  { id: 'kaetram', title: 'Kaetram', description: 'Open-world 2D MMORPG. Explore, fight, quest together.', genre: 'RPG', minPlayers: 1, maxPlayers: 4, gameType: 'official' as const, coverClass: 'cover-kaetram' },
];

const GENRES = ['All', 'Party', 'Racing', 'Shooter', 'Classic', 'Combat', 'Arcade', 'Fighter', 'Puzzle', 'Quiz', 'Community'];

interface CommunityGame {
  id: string;
  title: string;
  description: string;
  genre: string;
  min_players: number;
  max_players: number;
  cover_image_url: string | null;
  game_type: string;
  submitter_id: string | null;
  contributor_name?: string;
}

export default function GameLibrary() {
  const [filter, setFilter] = useState('All');
  const [communityGames, setCommunityGames] = useState<CommunityGame[]>([]);

  useEffect(() => {
    const fetchGames = async () => {
      const { data: games } = await supabase.from('approved_games').select('*');
      if (!games) return;
      // Fetch contributor names for community games
      const submitterIds = games.filter(g => g.submitter_id).map(g => g.submitter_id);
      let profileMap: Record<string, string> = {};
      if (submitterIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username, email')
          .in('user_id', submitterIds);
        if (profiles) {
          profiles.forEach((p: any) => {
            profileMap[p.user_id] = p.username || p.email?.split('@')[0] || 'Unknown';
          });
        }
      }
      setCommunityGames(games.map((g: any) => ({
        ...g,
        contributor_name: g.submitter_id ? profileMap[g.submitter_id] || 'Community' : undefined,
      })));
    };
    fetchGames();
  }, []);

  const allGames = [
    ...BUILT_IN_GAMES.map(g => ({
      id: g.id,
      title: g.title,
      description: g.description,
      genre: g.genre,
      min_players: g.minPlayers,
      max_players: g.maxPlayers,
      cover_image_url: null,
      game_type: g.gameType,
      coverClass: g.coverClass,
    })),
    ...communityGames.map(g => ({ ...g, coverClass: undefined, contributor_name: g.contributor_name })),
  ];

  const filtered = filter === 'All'
    ? allGames
    : filter === 'Community'
      ? allGames.filter(g => g.game_type === 'community')
      : allGames.filter(g => g.genre === filter);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-20 px-6 max-w-6xl mx-auto">
        <h1 className="font-heading text-3xl font-bold mb-8 text-foreground">Game Library</h1>

        {/* Filter bar */}
        <div className="flex flex-wrap gap-2 mb-8">
          {GENRES.map(genre => (
            <button
              key={genre}
              onClick={() => setFilter(genre)}
              className={`px-4 py-1.5 text-sm rounded-lg font-heading font-medium transition-colors ${
                filter === genre
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-muted'
              }`}
            >
              {genre}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {filtered.map(game => (
            <GameCard
              id={game.id}
              key={game.id}
              title={game.title}
              genre={game.genre}
              minPlayers={game.min_players}
              maxPlayers={game.max_players}
              coverUrl={game.cover_image_url ?? undefined}
              coverClass={game.coverClass}
              gameType={game.game_type as 'official' | 'community'}
              contributorName={(game as any).contributor_name}
            />
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground mt-12">No games found for this filter.</p>
        )}
      </div>
      <Footer />
    </div>
  );
}
