import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const GENRES = ['Party', 'Racing', 'Shooter', 'Strategy', 'Puzzle', 'RPG', 'Classic', 'Other'];

interface MySubmission {
  id: string;
  title: string;
  status: string;
  genre: string;
  submitted_at: string;
  admin_notes: string | null;
}

export default function Contribute() {
  const { user, isAdmin, profile } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'dashboard' | 'submit' | 'analytics'>('dashboard');
  const [mySubmissions, setMySubmissions] = useState<MySubmission[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', genre: 'Party', minPlayers: 2, maxPlayers: 4,
    githubUrl: '', demoUrl: '', agree: false,
  });

  useEffect(() => { if (user) fetchMySubmissions(); }, [user]);

  const fetchMySubmissions = async () => {
    const { data } = await supabase.from('submitted_games')
      .select('id, title, status, genre, submitted_at, admin_notes')
      .eq('submitter_id', user!.id)
      .order('submitted_at', { ascending: false });
    if (data) setMySubmissions(data as MySubmission[]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !form.agree) return;
    setLoading(true);
    const { error } = await supabase.from('submitted_games').insert({
      title: form.title.trim(), description: form.description.trim(), genre: form.genre,
      min_players: form.minPlayers, max_players: form.maxPlayers,
      github_url: form.githubUrl.trim(), demo_url: form.demoUrl.trim() || null,
      submitter_id: user.id, status: 'pending',
    } as any);
    setLoading(false);
    if (!error) {
      setSubmitted(true);
      setForm({ title: '', description: '', genre: 'Party', minPlayers: 2, maxPlayers: 4, githubUrl: '', demoUrl: '', agree: false });
      fetchMySubmissions();
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-32 px-6 max-w-lg mx-auto text-center space-y-6">
          <h1 className="font-heading text-2xl font-bold text-foreground">Become a Contributor</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Contributors can submit games to Eternity Console. Your game gets reviewed by our admin,
            and once approved it goes live for all players. Sign up or log in to get started.
          </p>
          <p className="text-xs text-muted-foreground">Players don't need an account — just enter a room code to play.</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => navigate('/auth/signup')} className="bg-primary text-primary-foreground font-medium px-6 py-3 rounded-lg hover:opacity-90 text-sm">Sign Up as Contributor</button>
            <button onClick={() => navigate('/auth/login')} className="border border-border text-foreground font-medium px-6 py-3 rounded-lg hover:bg-secondary text-sm">Log In</button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const statusBadge = (s: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-muted text-muted-foreground', approved: 'bg-green-500/20 text-green-400',
      rejected: 'bg-destructive/20 text-destructive', needs_revision: 'bg-yellow-500/20 text-yellow-400',
    };
    return <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${colors[s] || colors.pending}`}>{s.toUpperCase()}</span>;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-20 px-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">
              {isAdmin ? 'Admin — Contributor Panel' : 'Contributor Dashboard'}
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Signed in as <span className="font-mono">{user.email}</span>
              {isAdmin && <span className="ml-2 text-primary font-semibold">ADMIN</span>}
            </p>
          </div>
          <div className="flex gap-2">
            {profile?.username && (
              <Link to={`/dev/${profile.username}`} className="border border-border text-foreground font-medium px-4 py-2 rounded-lg hover:bg-secondary text-xs">
                My Portfolio →
              </Link>
            )}
            <Link to="/profile/settings" className="border border-border text-foreground font-medium px-4 py-2 rounded-lg hover:bg-secondary text-xs">
              Settings
            </Link>
            {isAdmin && (
              <button onClick={() => navigate('/admin')} className="border border-border text-foreground font-medium px-4 py-2 rounded-lg hover:bg-secondary text-xs">Admin →</button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 border-b border-border">
          {[
            { key: 'dashboard', label: `My Submissions (${mySubmissions.length})` },
            { key: 'submit', label: 'Submit New Game' },
            { key: 'analytics', label: 'Analytics' },
          ].map(t => (
            <button key={t.key} onClick={() => { setTab(t.key as any); setSubmitted(false); }}
              className={`px-4 py-2 text-sm font-heading font-medium border-b-2 transition-colors ${tab === t.key ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'analytics' && (
          <div className="text-center py-12 space-y-4">
            <p className="text-muted-foreground text-sm">View detailed analytics for your published games.</p>
            <button onClick={() => navigate('/contribute/analytics')} className="bg-primary text-primary-foreground px-6 py-2 rounded-lg text-sm font-medium">
              Open Analytics Dashboard →
            </button>
          </div>
        )}

        {tab === 'dashboard' && (
          <div>
            {mySubmissions.length === 0 ? (
              <div className="text-center py-16 space-y-4">
                <p className="text-muted-foreground text-sm">You haven't submitted any games yet.</p>
                <button onClick={() => setTab('submit')} className="bg-primary text-primary-foreground font-medium px-6 py-2 rounded-lg text-sm">Submit Your First Game</button>
              </div>
            ) : (
              <div className="space-y-3">
                {mySubmissions.map(sub => (
                  <div key={sub.id} className="bg-card border border-border rounded-lg px-5 py-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="font-heading font-semibold text-sm text-foreground">{sub.title}</span>
                        {statusBadge(sub.status)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{sub.genre} · Submitted {new Date(sub.submitted_at).toLocaleDateString()}</p>
                      {sub.admin_notes && <p className="text-xs text-yellow-400 mt-1">Admin: {sub.admin_notes}</p>}
                    </div>
                    {sub.status === 'rejected' && (
                      <button onClick={() => { setTab('submit'); setForm(f => ({ ...f, title: sub.title })); }}
                        className="text-xs text-primary hover:text-primary/80 font-mono">Resubmit →</button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'submit' && (
          <>
            {submitted ? (
              <div className="text-center py-16 space-y-4">
                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto"><span className="text-green-400 text-xl">✓</span></div>
                <h2 className="font-heading text-xl font-bold text-foreground">Game Submitted!</h2>
                <p className="text-sm text-muted-foreground">Our admin will review your submission. You'll see the status update here.</p>
                <button onClick={() => { setSubmitted(false); setTab('dashboard'); }} className="text-primary text-sm font-medium">View My Submissions →</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Game Title</label>
                  <input required maxLength={60} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                    className="w-full bg-secondary border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" placeholder="My Awesome Game" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Short Description</label>
                  <textarea required maxLength={140} rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                    className="w-full bg-secondary border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none" placeholder="A brief description (max 140 chars)" />
                  <span className="text-xs text-muted-foreground">{form.description.length}/140</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Genre</label>
                    <select value={form.genre} onChange={e => setForm({ ...form, genre: e.target.value })}
                      className="w-full bg-secondary border border-border rounded-lg px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                      {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Players</label>
                    <div className="flex gap-2">
                      <input type="number" min={1} max={4} value={form.minPlayers} onChange={e => setForm({ ...form, minPlayers: Number(e.target.value) })}
                        className="w-full bg-secondary border border-border rounded-lg px-3 py-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                      <span className="flex items-center text-muted-foreground">–</span>
                      <input type="number" min={1} max={4} value={form.maxPlayers} onChange={e => setForm({ ...form, maxPlayers: Number(e.target.value) })}
                        className="w-full bg-secondary border border-border rounded-lg px-3 py-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">GitHub Repository URL *</label>
                  <input required type="url" value={form.githubUrl} onChange={e => setForm({ ...form, githubUrl: e.target.value })}
                    className="w-full bg-secondary border border-border rounded-lg px-4 py-3 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" placeholder="https://github.com/you/your-game" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Playable Demo URL (optional)</label>
                  <input type="url" value={form.demoUrl} onChange={e => setForm({ ...form, demoUrl: e.target.value })}
                    className="w-full bg-secondary border border-border rounded-lg px-4 py-3 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" placeholder="https://your-game-demo.com" />
                </div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.agree} onChange={e => setForm({ ...form, agree: e.target.checked })} className="mt-1 accent-primary" />
                  <span className="text-sm text-muted-foreground">I confirm this game contains no harmful, offensive, or copyrighted content.</span>
                </label>
                <button type="submit" disabled={loading || !form.agree}
                  className="w-full bg-primary text-primary-foreground font-medium py-3 rounded-lg hover:opacity-90 text-sm disabled:opacity-30">
                  {loading ? 'Submitting...' : 'Submit Game for Review'}
                </button>
              </form>
            )}
          </>
        )}
      </div>
      <Footer />
    </div>
  );
}
