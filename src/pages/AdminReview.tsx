import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';

interface Submission {
  id: string;
  title: string;
  description: string;
  genre: string;
  min_players: number;
  max_players: number;
  github_url: string;
  demo_url: string | null;
  cover_image_url: string | null;
  status: string;
  admin_notes: string | null;
  submitted_at: string;
}

export default function AdminReview() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!loading && !isAdmin) navigate('/');
  }, [isAdmin, loading, navigate]);

  const fetchSubmissions = async () => {
    const { data } = await supabase
      .from('submitted_games')
      .select('*')
      .order('submitted_at', { ascending: false });
    if (data) setSubmissions(data as Submission[]);
  };

  useEffect(() => {
    if (isAdmin) fetchSubmissions();
  }, [isAdmin]);

  const handleAction = async (id: string, status: string) => {
    setActionLoading(true);
    const sub = submissions.find(s => s.id === id);

    await supabase
      .from('submitted_games')
      .update({
        status,
        admin_notes: notes || null,
        reviewed_at: new Date().toISOString(),
      } as any)
      .eq('id', id);

    if (status === 'approved' && sub) {
      await supabase.from('approved_games').insert({
        title: sub.title,
        description: sub.description,
        genre: sub.genre,
        min_players: sub.min_players,
        max_players: sub.max_players,
        cover_image_url: sub.cover_image_url,
        game_type: 'community',
      } as any);
    }

    setNotes('');
    setExpanded(null);
    setActionLoading(false);
    fetchSubmissions();
  };

  if (loading || !isAdmin) return null;

  const statusColor = (s: string) => {
    if (s === 'approved') return 'text-success';
    if (s === 'rejected') return 'text-destructive';
    if (s === 'pending') return 'text-primary';
    return 'text-muted-foreground';
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-20 px-6 max-w-4xl mx-auto">
        <h1 className="font-heading text-3xl font-bold mb-8 text-foreground">Review Queue</h1>

        {submissions.length === 0 ? (
          <p className="text-muted-foreground text-sm">No submissions yet.</p>
        ) : (
          <div className="space-y-3">
            {submissions.map(sub => (
              <div key={sub.id} className="bg-card border border-border rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpanded(expanded === sub.id ? null : sub.id)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left"
                >
                  <div className="flex items-center gap-4">
                    <span className="font-heading font-semibold text-sm text-foreground">{sub.title}</span>
                    <span className="text-xs font-mono text-muted-foreground">{sub.genre}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-xs font-mono uppercase ${statusColor(sub.status)}`}>
                      {sub.status}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(sub.submitted_at).toLocaleDateString()}
                    </span>
                  </div>
                </button>

                {expanded === sub.id && (
                  <div className="px-5 pb-5 space-y-4 border-t border-border pt-4">
                    <p className="text-sm text-muted-foreground">{sub.description}</p>
                    <div className="flex gap-4 text-xs">
                      <span className="text-muted-foreground">{sub.min_players}–{sub.max_players} players</span>
                      <a href={sub.github_url} target="_blank" rel="noopener" className="text-primary hover:opacity-80">
                        GitHub →
                      </a>
                      {sub.demo_url && (
                        <a href={sub.demo_url} target="_blank" rel="noopener" className="text-primary hover:opacity-80">
                          Demo →
                        </a>
                      )}
                    </div>

                    {sub.status === 'pending' && (
                      <>
                        <textarea
                          value={notes}
                          onChange={e => setNotes(e.target.value)}
                          placeholder="Admin notes (optional)"
                          rows={2}
                          className="w-full bg-secondary border border-border rounded-lg px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                        />
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleAction(sub.id, 'approved')}
                            disabled={actionLoading}
                            className="bg-success/20 text-success font-medium px-4 py-2 rounded-lg text-sm hover:bg-success/30 transition-colors disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleAction(sub.id, 'rejected')}
                            disabled={actionLoading}
                            className="bg-destructive/20 text-destructive font-medium px-4 py-2 rounded-lg text-sm hover:bg-destructive/30 transition-colors disabled:opacity-50"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleAction(sub.id, 'needs_revision')}
                            disabled={actionLoading}
                            className="bg-secondary text-secondary-foreground font-medium px-4 py-2 rounded-lg text-sm hover:bg-muted transition-colors disabled:opacity-50"
                          >
                            Request Changes
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
