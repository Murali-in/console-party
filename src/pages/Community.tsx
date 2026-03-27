import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

interface ForumPost {
  id: string;
  game_id: string | null;
  author_id: string;
  category: string;
  title: string;
  body: string;
  reply_count: number;
  pinned: boolean;
  created_at: string;
  author_name?: string;
}

export default function Community() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [tab, setTab] = useState<'general' | 'bugs' | 'suggestions'>('general');
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [trendingGames, setTrendingGames] = useState<{ game_id: string; count: number }[]>([]);

  useEffect(() => {
    fetchPosts();
    fetchTrending();
  }, [tab]);

  const fetchPosts = async () => {
    const { data } = await supabase
      .from('forum_posts')
      .select('*')
      .eq('category', tab)
      .is('parent_id', null)
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) {
      // Fetch author names
      const authorIds = [...new Set((data as any[]).map(p => p.author_id))];
      const { data: profiles } = await supabase.from('profiles').select('user_id, username, email').in('user_id', authorIds);
      const nameMap: Record<string, string> = {};
      (profiles || []).forEach((p: any) => { nameMap[p.user_id] = p.username || p.email?.split('@')[0] || 'Unknown'; });
      setPosts((data as any[]).map(p => ({ ...p, author_name: nameMap[p.author_id] || 'Unknown' })));
    }
  };

  const fetchTrending = async () => {
    const { data } = await supabase
      .from('play_events')
      .select('game_id')
      .gte('played_at', new Date(Date.now() - 86400000).toISOString())
      .limit(100);
    if (data) {
      const counts: Record<string, number> = {};
      (data as any[]).forEach(e => { counts[e.game_id] = (counts[e.game_id] || 0) + 1; });
      setTrendingGames(
        Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([game_id, count]) => ({ game_id, count }))
      );
    }
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newTitle.trim() || !newBody.trim()) return;
    setSubmitting(true);
    await supabase.from('forum_posts').insert({
      author_id: user.id,
      category: tab,
      title: newTitle.trim(),
      body: newBody.trim(),
    } as any);
    setSubmitting(false);
    setShowForm(false);
    setNewTitle('');
    setNewBody('');
    fetchPosts();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-20 px-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-heading text-3xl font-bold text-foreground">Community</h1>
            <p className="text-sm text-muted-foreground mt-1">Discuss games, report bugs, and suggest features.</p>
          </div>
          {user && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-primary text-primary-foreground font-medium px-4 py-2 rounded-lg text-sm hover:opacity-90 transition-opacity"
            >
              + New Post
            </button>
          )}
        </div>

        {/* Trending */}
        {trendingGames.length > 0 && (
          <div className="mb-8 p-4 rounded-[10px] border border-border bg-card">
            <h3 className="font-heading text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">🔥 Trending Today</h3>
            <div className="flex flex-wrap gap-2">
              {trendingGames.map(t => (
                <Link key={t.game_id} to={`/games/${t.game_id}`} className="text-xs font-mono px-3 py-1.5 rounded-lg bg-secondary text-foreground hover:bg-muted transition-colors">
                  {t.game_id.replace(/-/g, ' ')} · {t.count} plays
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-border">
          {(['general', 'bugs', 'suggestions'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-heading font-medium border-b-2 transition-colors capitalize ${
                tab === t ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* New post form */}
        {showForm && (
          <form onSubmit={handlePost} className="mb-8 p-4 rounded-[10px] border border-border bg-card space-y-3">
            <input
              value={newTitle} onChange={e => setNewTitle(e.target.value)}
              placeholder="Post title" required maxLength={100}
              className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <textarea
              value={newBody} onChange={e => setNewBody(e.target.value)}
              placeholder="Write your post..." required maxLength={2000} rows={4}
              className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            />
            <div className="flex gap-2">
              <button type="submit" disabled={submitting} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-30">
                {submitting ? 'Posting...' : 'Post'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="text-muted-foreground text-sm px-4 py-2">Cancel</button>
            </div>
          </form>
        )}

        {/* Posts list */}
        <div className="space-y-2">
          {posts.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-12">No posts yet. Be the first!</p>
          ) : (
            posts.map(post => (
              <div key={post.id} className="p-4 rounded-[10px] border border-border bg-card hover:border-primary/20 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {post.pinned && <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/20 text-primary">Pinned</span>}
                      <h3 className="font-heading text-sm font-semibold text-foreground">{post.title}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{post.body}</p>
                    <div className="flex items-center gap-3 pt-1">
                      <span className="font-mono text-[10px] text-muted-foreground">by {post.author_name}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">{new Date(post.created_at).toLocaleDateString()}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">{post.reply_count} replies</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
