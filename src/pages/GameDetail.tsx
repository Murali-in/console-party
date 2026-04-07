import { useParams, Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
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

interface Rating {
  id: string;
  rating: number;
  review: string | null;
  created_at: string;
  user_id: string;
  author_name?: string;
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
  'apex-arena': {
    title: 'Apex Arena', genre: 'Shooter', minPlayers: 1, maxPlayers: 4,
    desc: 'Top-down arena shooter with shields, dashes, and tactical combat. First to 10 kills wins. Features pseudo-3D character rendering.',
    coverClass: 'cover-apex-arena',
    controls: ['D-Pad: Move and aim', 'Button A: Shoot', 'Button B: Dash/Shield'],
    rules: ['First to 10 kills wins', 'Bullets travel in the direction you face', 'Respawn after 2 seconds', 'Dash has a 3-second cooldown'],
  },
  'pong': {
    title: 'Pong', genre: 'Classic', minPlayers: 1, maxPlayers: 2,
    desc: 'The original competitive game with ball trails, paddle depth effects, and impact particles. First to 7 points wins.',
    coverClass: 'cover-pong',
    controls: ['D-Pad Up/Down: Move paddle', 'Button B: Lunge paddle forward'],
    rules: ['Ball speeds up after each hit', 'Score when the ball passes your opponent', 'First to 7 points wins'],
  },
  'maze-runner': {
    title: 'Maze Runner', genre: 'Puzzle', minPlayers: 1, maxPlayers: 4,
    desc: 'Race through procedurally generated mazes with 3D-effect walls, glowing coins, and animated characters.',
    coverClass: 'cover-maze-runner',
    controls: ['D-Pad: Move through maze (4 directions)'],
    rules: ['First to the exit scores 5 points', 'Coins give 1 point each', '3 rounds total', 'Highest total score wins'],
  },
};

const OG_IMAGES: Record<string, string> = {
  'apex-arena': 'https://eternityconsole.vercel.app/og-apex-arena.png',
  'pong': 'https://eternityconsole.vercel.app/og-pong.png',
  'maze-runner': 'https://eternityconsole.vercel.app/og-maze-runner.png',
};

export default function GameDetail() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { isAdmin, user } = useAuth();
  const game = gameId ? GAMES_DATA[gameId] : null;
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [loadingLb, setLoadingLb] = useState(true);
  const [approvedRecord, setApprovedRecord] = useState<ApprovedGameRecord | null>(null);
  const [adminBusy, setAdminBusy] = useState(false);
  const [myRating, setMyRating] = useState(0);
  const [myReview, setMyReview] = useState('');
  const [ratingSubmitting, setRatingSubmitting] = useState(false);

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

    // Fetch ratings
    supabase
      .from('game_ratings')
      .select('*')
      .eq('game_id', gameId)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(async ({ data }) => {
        if (!data || data.length === 0) { setRatings([]); return; }
        const authorIds = [...new Set((data as any[]).map(r => r.user_id))];
        const { data: profiles } = await supabase.from('profiles').select('user_id, username, email').in('user_id', authorIds);
        const nameMap: Record<string, string> = {};
        (profiles || []).forEach((p: any) => { nameMap[p.user_id] = p.username || p.email?.split('@')[0] || 'Player'; });
        const rated = (data as any[]).map(r => ({ ...r, author_name: nameMap[r.user_id] || 'Player' }));
        setRatings(rated);
        const avg = rated.reduce((a: number, r: any) => a + r.rating, 0) / rated.length;
        setAvgRating(Math.round(avg * 10) / 10);
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

  // Load my existing rating
  useEffect(() => {
    if (!user || !gameId) return;
    supabase
      .from('game_ratings')
      .select('rating, review')
      .eq('game_id', gameId)
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setMyRating((data as any).rating);
          setMyReview((data as any).review || '');
        }
      });
  }, [user, gameId]);

  if (!game) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="font-heading text-2xl font-bold text-foreground">Game not found</h1>
          <Link to="/games" className="text-sm text-muted-foreground hover:text-foreground font-mono">← Back to library</Link>
        </div>
      </div>
    );
  }

  const handleStartGame = () => {
    sessionStorage.setItem('preselected-game', gameId!);
    navigate('/play/host');
  };

  const handleSoloPlay = () => navigate(`/play/solo/${gameId}`);

  const handleTogglePrivate = async () => {
    if (!approvedRecord) return;
    setAdminBusy(true);
    await supabase.from('approved_games').update({ is_private: !approvedRecord.is_private }).eq('id', approvedRecord.id);
    setApprovedRecord({ ...approvedRecord, is_private: !approvedRecord.is_private });
    setAdminBusy(false);
  };

  const handleDelete = async () => {
    if (!approvedRecord || !window.confirm(`Delete ${game.title}?`)) return;
    setAdminBusy(true);
    await supabase.from('approved_games').delete().eq('id', approvedRecord.id);
    setAdminBusy(false);
    navigate('/games');
  };

  const handleRatingSubmit = async () => {
    if (!user || !gameId || myRating === 0) return;
    setRatingSubmitting(true);
    await supabase.from('game_ratings').upsert({
      game_id: gameId,
      user_id: user.id,
      rating: myRating,
      review: myReview.trim() || null,
    } as any, { onConflict: 'game_id,user_id' });
    setRatingSubmitting(false);
    // Refresh ratings
    window.location.reload();
  };

  const stars = (n: number) => '★'.repeat(Math.floor(n)) + (n % 1 >= 0.5 ? '½' : '') + '☆'.repeat(5 - Math.ceil(n));

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{game.title} — Play Free on Eternity Console</title>
        <meta name="description" content={game.desc} />
        <meta property="og:title" content={`${game.title} — Eternity Console`} />
        <meta property="og:description" content={game.desc} />
        <meta property="og:image" content={gameId ? OG_IMAGES[gameId] || '' : ''} />
        <meta property="og:url" content={`https://eternityconsole.vercel.app/games/${gameId}`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${game.title} — Eternity Console`} />
        <meta name="twitter:image" content={gameId ? OG_IMAGES[gameId] || '' : ''} />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "VideoGame",
            "name": game.title,
            "description": game.desc,
            "genre": game.genre,
            "numberOfPlayers": {
              "@type": "QuantitativeValue",
              "minValue": game.minPlayers,
              "maxValue": game.maxPlayers,
            },
            "gamePlatform": ["Web Browser", "Mobile Browser"],
            "applicationCategory": "Game",
            "operatingSystem": "Any",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "USD",
              "availability": "https://schema.org/InStock",
            },
            "image": gameId ? OG_IMAGES[gameId] || '' : '',
            "url": `https://eternityconsole.vercel.app/games/${gameId}`,
            "publisher": {
              "@type": "Organization",
              "name": "Eternity Console",
              "url": "https://eternityconsole.vercel.app",
            },
            "author": {
              "@type": "Person",
              "name": "Murali",
            },
            "playMode": game.maxPlayers > 1 ? "MultiPlayer" : "SinglePlayer",
            "inLanguage": "en",
          })}
        </script>
      </Helmet>
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
              {avgRating > 0 && (
                <span className="text-[10px] font-mono text-primary">{stars(avgRating)} {avgRating}</span>
              )}
            </div>
            <h1 className="font-heading text-3xl font-bold text-foreground">{game.title}</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">{game.desc}</p>
            <span className="font-mono text-xs text-muted-foreground">{game.minPlayers}–{game.maxPlayers} players</span>
            <p className="text-xs text-muted-foreground">
              Created by{' '}
              <Link to="/dev/Murali" className="text-foreground hover:text-primary transition-colors font-semibold">Murali</Link>
              <span className="ml-1.5 text-[9px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary">Founder & Admin</span>
            </p>
            <div className="flex items-center gap-3 flex-wrap pt-2">
              <button onClick={handleStartGame} className="bg-primary text-primary-foreground font-heading font-semibold px-6 py-3 rounded-lg hover:opacity-90 transition-opacity text-sm">
                Multiplayer →
              </button>
              <button onClick={handleSoloPlay} className="border border-border text-foreground font-heading font-semibold px-6 py-3 rounded-lg hover:border-primary/30 transition-colors text-sm">
                Solo vs CPU →
              </button>
              {isAdmin && approvedRecord && (
                <>
                  <button type="button" disabled={adminBusy} onClick={handleTogglePrivate} className="bg-secondary text-secondary-foreground border border-border font-heading font-semibold px-4 py-3 rounded-lg text-sm disabled:opacity-50">
                    {approvedRecord.is_private ? 'Make Public' : 'Make Private'}
                  </button>
                  <button type="button" disabled={adminBusy} onClick={handleDelete} className="bg-destructive/10 text-destructive border border-destructive/30 font-heading font-semibold px-4 py-3 rounded-lg text-sm disabled:opacity-50">
                    Delete
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
                  <span className="font-mono text-foreground shrink-0 w-4 text-right">{i + 1}.</span>{c}
                </li>
              ))}
            </ul>
          </div>
          <div className="p-6 rounded-[10px] border border-border bg-card space-y-4">
            <h2 className="font-heading text-lg font-semibold text-foreground">Rules</h2>
            <ul className="space-y-2">
              {game.rules.map((r, i) => (
                <li key={i} className="flex items-start gap-3 text-xs text-muted-foreground">
                  <span className="font-mono text-foreground shrink-0 w-4 text-right">•</span>{r}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Rating form */}
        {user && (
          <div className="p-6 rounded-[10px] border border-border bg-card space-y-4 mb-8">
            <h2 className="font-heading text-lg font-semibold text-foreground">Rate this game</h2>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => setMyRating(n)} className={`text-2xl transition-colors ${n <= myRating ? 'text-primary' : 'text-muted'}`}>
                  ★
                </button>
              ))}
              <span className="text-xs text-muted-foreground ml-2 self-center">{myRating > 0 ? `${myRating}/5` : 'Select'}</span>
            </div>
            <textarea
              value={myReview} onChange={e => setMyReview(e.target.value)}
              placeholder="Write a review (optional)..." maxLength={500} rows={2}
              className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            />
            <button
              onClick={handleRatingSubmit} disabled={myRating === 0 || ratingSubmitting}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-30"
            >
              {ratingSubmitting ? 'Submitting...' : 'Submit Rating'}
            </button>
          </div>
        )}

        {/* Reviews */}
        {ratings.length > 0 && (
          <div className="p-6 rounded-[10px] border border-border bg-card space-y-4 mb-8">
            <h2 className="font-heading text-lg font-semibold text-foreground">Reviews ({ratings.length})</h2>
            <div className="space-y-3">
              {ratings.map(r => (
                <div key={r.id} className="border-b border-border pb-3 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-primary text-sm">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">by {r.author_name}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">· {new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                  {r.review && <p className="text-xs text-muted-foreground mt-1">{r.review}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Leaderboard */}
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
                    <span className="font-mono text-[10px] text-muted-foreground">{new Date(entry.played_at).toLocaleDateString()}</span>
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
