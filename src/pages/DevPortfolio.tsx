import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

interface DevProfile {
  id: string;
  user_id: string;
  username: string | null;
  display_name: string | null;
  email: string;
  bio: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  github_username: string | null;
  twitter_handle: string | null;
  website_url: string | null;
  portfolio_accent: string | null;
  role: string;
  created_at: string;
  xp: number;
  level: number;
  games_played: number;
  total_wins: number;
}

interface DevGame {
  id: string;
  title: string;
  description: string;
  genre: string;
  play_count: number;
  status: string;
}

export default function DevPortfolio() {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const [profile, setProfile] = useState<DevProfile | null>(null);
  const [games, setGames] = useState<DevGame[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!username) return;
    const load = async () => {
      setLoading(true);
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single();

      if (!prof) { setLoading(false); return; }
      setProfile(prof as any);

      // Fetch their submitted games
      const { data: submitted } = await supabase
        .from('approved_games')
        .select('id, title, description, genre, play_count, status')
        .eq('submitter_id', (prof as any).user_id);
      if (submitted) setGames(submitted as DevGame[]);

      // Follower count
      const { count } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', (prof as any).user_id);
      setFollowerCount(count || 0);

      // Am I following?
      if (user) {
        const { data: fol } = await supabase
          .from('follows')
          .select('follower_id')
          .eq('follower_id', user.id)
          .eq('following_id', (prof as any).user_id)
          .maybeSingle();
        setIsFollowing(!!fol);
      }

      setLoading(false);
    };
    load();
  }, [username, user]);

  const handleFollow = async () => {
    if (!user || !profile) return;
    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', profile.user_id);
      setIsFollowing(false);
      setFollowerCount(c => c - 1);
    } else {
      await supabase.from('follows').insert({ follower_id: user.id, following_id: profile.user_id } as any);
      setIsFollowing(true);
      setFollowerCount(c => c + 1);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-32 text-center text-muted-foreground text-sm">Loading...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-32 text-center space-y-4">
          <h1 className="font-heading text-2xl font-bold text-foreground">Developer not found</h1>
          <Link to="/games" className="text-sm text-muted-foreground hover:text-foreground font-mono">← Back to games</Link>
        </div>
      </div>
    );
  }

  const accent = profile.portfolio_accent || '#bfbfbf';
  const displayName = profile.display_name || profile.username || profile.email.split('@')[0];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Banner */}
      <div className="h-[200px] md:h-[280px] relative" style={{ background: profile.banner_url ? `url(${profile.banner_url}) center/cover` : `linear-gradient(135deg, ${accent}22, ${accent}08)` }}>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />
      </div>

      <div className="max-w-4xl mx-auto px-6 -mt-16 relative z-10 pb-20">
        {/* Profile header */}
        <div className="flex items-end gap-5 mb-8">
          <div className="w-[88px] h-[88px] rounded-full border-4 border-background flex items-center justify-center text-2xl font-bold" style={{ backgroundColor: `${accent}22`, color: accent }}>
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              displayName[0]?.toUpperCase()
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-2xl font-bold text-foreground">{displayName}</h1>
              {profile.role === 'admin' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-heading font-semibold bg-primary/10 text-primary border border-primary/20">
                  Founder & Admin
                </span>
              )}
            </div>
            <p className="font-mono text-xs text-muted-foreground">@{profile.username || profile.email.split('@')[0]}</p>
          </div>
          <div className="flex items-center gap-3">
            {user && user.id !== profile.user_id && (
              <button
                onClick={handleFollow}
                className={`px-4 py-2 rounded-lg text-xs font-heading font-semibold transition-colors ${
                  isFollowing ? 'bg-secondary text-foreground border border-border' : 'bg-primary text-primary-foreground'
                }`}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </button>
            )}
          </div>
        </div>

        {/* Bio */}
        {profile.bio && <p className="text-sm text-muted-foreground mb-6 max-w-xl">{profile.bio}</p>}

        {/* Social links */}
        <div className="flex items-center gap-4 mb-8">
          {profile.github_username && (
            <a href={`https://github.com/${profile.github_username}`} target="_blank" rel="noreferrer" className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors">GitHub</a>
          )}
          {profile.twitter_handle && (
            <a href={`https://twitter.com/${profile.twitter_handle}`} target="_blank" rel="noreferrer" className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors">Twitter/X</a>
          )}
          {profile.website_url && (
            <a href={profile.website_url} target="_blank" rel="noreferrer" className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors">Website</a>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-10">
          {[
            { val: games.length, label: 'Games' },
            { val: games.reduce((a, g) => a + g.play_count, 0), label: 'Total Plays' },
            { val: followerCount, label: 'Followers' },
            { val: new Date(profile.created_at).toLocaleDateString('en', { month: 'short', year: 'numeric' }), label: 'Joined' },
          ].map(s => (
            <div key={s.label} className="p-4 rounded-[10px] border border-border bg-card text-center">
              <div className="font-heading text-lg font-bold text-foreground">{s.val}</div>
              <div className="text-[10px] text-muted-foreground font-mono uppercase">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Games */}
        <h2 className="font-heading text-lg font-semibold text-foreground mb-4">Published Games</h2>
        {games.length === 0 ? (
          <p className="text-sm text-muted-foreground">No games published yet.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {games.map(g => (
              <Link key={g.id} to={`/games/${g.id}`} className="rounded-[10px] border border-border bg-card p-4 hover:border-primary/30 transition-colors">
                <h3 className="font-heading text-sm font-semibold text-foreground">{g.title}</h3>
                <p className="text-[10px] text-muted-foreground mt-1">{g.genre}</p>
                <p className="text-[10px] text-muted-foreground">{g.play_count} plays</p>
              </Link>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
