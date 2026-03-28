import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import GameCard from '@/components/GameCard';
import { Input } from '@/components/ui/input';

const BUILT_IN_GAMES = [
  { id: 'apex-arena', title: 'Apex Arena', description: 'Top-down arena shooter with pseudo-3D characters. First to 10 kills wins.', genre: 'Shooter', minPlayers: 1, maxPlayers: 4, gameType: 'official' as const, coverClass: 'cover-apex-arena' },
  { id: 'pong', title: 'Pong', description: 'Classic pong with ball trails and impact particles. First to 7 points wins.', genre: 'Classic', minPlayers: 1, maxPlayers: 2, gameType: 'official' as const, coverClass: 'cover-pong' },
  { id: 'maze-runner', title: 'Maze Runner', description: 'Race through procedural mazes with 3D-effect walls. Collect coins and find the exit.', genre: 'Puzzle', minPlayers: 1, maxPlayers: 4, gameType: 'official' as const, coverClass: 'cover-maze-runner' },
];

const GENRES = ['All', 'Shooter', 'Classic', 'Puzzle', 'Community'];
const PLAYER_FILTERS = ['Any', '1', '2', '3-4'];

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
  is_private?: boolean;
  contributor_name?: string;
}

export default function GameLibrary() {
  const [filter, setFilter] = useState('All');
  const [playerFilter, setPlayerFilter] = useState('Any');
  const [search, setSearch] = useState('');
  const [communityGames, setCommunityGames] = useState<CommunityGame[]>([]);

  useEffect(() => {
    const fetchGames = async () => {
      const { data: games } = await supabase.from('approved_games').select('*');
      if (!games) return;
      const submitterIds = games.filter(g => g.submitter_id).map(g => g.submitter_id);
      let profileMap: Record<string, string> = {};
      if (submitterIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('user_id, username, email').in('user_id', submitterIds);
        if (profiles) profiles.forEach((p: any) => { profileMap[p.user_id] = p.username || p.email?.split('@')[0] || 'Unknown'; });
      }
      setCommunityGames(games.map((g: any) => ({ ...g, contributor_name: g.submitter_id ? profileMap[g.submitter_id] || 'Community' : undefined })));
    };
    fetchGames();
  }, []);

  const builtInTitles = new Set(BUILT_IN_GAMES.map(g => g.title.toLowerCase()));
  const privateOfficialTitles = new Set(communityGames.filter(g => g.game_type === 'official' && g.is_private).map(g => g.title.toLowerCase()));
  const uniqueCommunityGames = communityGames.filter(g => !builtInTitles.has(g.title.toLowerCase()));

  const allGames = [
    ...BUILT_IN_GAMES.filter(g => !privateOfficialTitles.has(g.title.toLowerCase())).map(g => ({
      id: g.id, title: g.title, description: g.description, genre: g.genre,
      min_players: g.minPlayers, max_players: g.maxPlayers, cover_image_url: null,
      game_type: g.gameType, coverClass: g.coverClass, contributor_name: 'Murali',
    })),
    ...uniqueCommunityGames.map(g => ({ ...g, coverClass: undefined, contributor_name: g.contributor_name })),
  ];

  let filtered = filter === 'All' ? allGames
    : filter === 'Community' ? allGames.filter(g => g.game_type === 'community')
    : allGames.filter(g => g.genre === filter);

  if (playerFilter !== 'Any') {
    const n = playerFilter === '3-4' ? 3 : Number(playerFilter);
    filtered = filtered.filter(g => {
      if (playerFilter === '3-4') return g.max_players >= 3;
      return g.min_players <= n && g.max_players >= n;
    });
  }

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(g => g.title.toLowerCase().includes(q) || g.genre.toLowerCase().includes(q) || g.description.toLowerCase().includes(q));
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-20 px-6 max-w-6xl mx-auto">
        <h1 className="font-heading text-3xl font-bold mb-2 text-foreground">Game Library</h1>
        <p className="text-sm text-muted-foreground mb-6">All games on Eternity Console. Play solo on phone or multiplayer on any screen.</p>

        {/* Search */}
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search games..." className="mb-4 h-11 bg-secondary border-border" />

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          {GENRES.map(genre => (
            <button key={genre} onClick={() => setFilter(genre)}
              className={`px-4 py-1.5 text-sm rounded-lg font-heading font-medium transition-colors ${filter === genre ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-muted'}`}>
              {genre}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 mb-8">
          {PLAYER_FILTERS.map(pf => (
            <button key={pf} onClick={() => setPlayerFilter(pf)}
              className={`px-3 py-1 text-xs rounded-lg font-mono transition-colors ${playerFilter === pf ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-muted'}`}>
              {pf === 'Any' ? 'Any players' : `${pf}P`}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {filtered.map(game => (
            <GameCard id={game.id} key={game.id} title={game.title} genre={game.genre}
              minPlayers={game.min_players} maxPlayers={game.max_players}
              coverUrl={game.cover_image_url ?? undefined} coverClass={(game as any).coverClass}
              gameType={game.game_type as 'official' | 'community'} contributorName={(game as any).contributor_name} />
          ))}
        </div>

        {filtered.length === 0 && <p className="text-center text-muted-foreground mt-12">No games found.</p>}
      </div>
      <Footer />
    </div>
  );
}
