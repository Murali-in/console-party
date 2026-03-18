import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import GameCard from '@/components/GameCard';

const BUILT_IN_GAMES = [
  { id: 'bomb-pass', title: 'Bomb Pass', description: 'Hot potato meets battle royale. Pass the bomb before it explodes!', genre: 'Party', minPlayers: 2, maxPlayers: 4, gameType: 'official' as const },
  { id: 'nitro-race', title: 'Nitro Race', description: 'Top-down arcade racing with nitro boosts and obstacles.', genre: 'Racing', minPlayers: 2, maxPlayers: 4, gameType: 'official' as const },
  { id: 'apex-arena', title: 'Apex Arena', description: 'Top-down competitive shooter. First to 10 kills wins.', genre: 'Shooter', minPlayers: 2, maxPlayers: 4, gameType: 'official' as const },
  { id: 'prop-hunt', title: 'Prop Hunt', description: 'Hide as objects or seek and destroy. Classic party fun.', genre: 'Party', minPlayers: 2, maxPlayers: 4, gameType: 'official' as const },
  { id: 'siege-battle', title: 'Siege Battle', description: 'Physics-based turn-based siege warfare.', genre: 'Strategy', minPlayers: 2, maxPlayers: 2, gameType: 'official' as const },
];

const GENRES = ['All', 'Party', 'Racing', 'Shooter', 'Strategy', 'Puzzle', 'Community'];

interface CommunityGame {
  id: string;
  title: string;
  description: string;
  genre: string;
  min_players: number;
  max_players: number;
  cover_image_url: string | null;
  game_type: string;
}

export default function GameLibrary() {
  const [filter, setFilter] = useState('All');
  const [communityGames, setCommunityGames] = useState<CommunityGame[]>([]);

  useEffect(() => {
    supabase
      .from('approved_games')
      .select('*')
      .then(({ data }) => {
        if (data) setCommunityGames(data as CommunityGame[]);
      });
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
    })),
    ...communityGames,
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
              className={`px-4 py-1.5 text-sm rounded-lg font-medium transition-colors ${
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map(game => (
            <GameCard
              key={game.id}
              title={game.title}
              genre={game.genre}
              minPlayers={game.min_players}
              maxPlayers={game.max_players}
              coverUrl={game.cover_image_url ?? undefined}
              gameType={game.game_type as 'official' | 'community'}
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
