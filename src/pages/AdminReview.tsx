import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
  submitter_id: string;
}

export default function AdminReview() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleteTitle, setDeleteTitle] = useState('');

  useEffect(() => {
    if (!loading && !isAdmin) navigate('/');
  }, [isAdmin, loading, navigate]);

  const fetchSubmissions = async () => {
    let q = supabase.from('submitted_games').select('*').order('submitted_at', { ascending: false });
    if (filter !== 'all') q = q.eq('status', filter);
    const { data } = await q;
    if (data) setSubmissions(data as Submission[]);
  };

  useEffect(() => {
    if (isAdmin) fetchSubmissions();
  }, [isAdmin, filter]);

  const handleAction = async (id: string, status: string) => {
    setActionLoading(true);
    const sub = submissions.find(s => s.id === id);

    await supabase
      .from('submitted_games')
      .update({ status, admin_notes: notes || null, reviewed_at: new Date().toISOString() } as any)
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
        submitter_id: sub.submitter_id,
      } as any);
    }

    setNotes('');
    setExpanded(null);
    setActionLoading(false);
    fetchSubmissions();
  };

  const handleDelete = async (id: string) => {
    const sub = submissions.find(s => s.id === id);
    if (!sub || deleteTitle !== sub.title) return;
    setActionLoading(true);
    // Delete from approved_games if it was approved
    await supabase.from('approved_games').delete().eq('title', sub.title);
    // Delete submission
    await supabase.from('submitted_games').delete().eq('id', id);
    setConfirmDelete(null);
    setDeleteTitle('');
    setActionLoading(false);
    fetchSubmissions();
  };

  if (loading || !isAdmin) return null;

  const statusColor = (s: string) => {
    if (s === 'approved') return 'text-green-400';
    if (s === 'rejected') return 'text-destructive';
    if (s === 'pending') return 'text-primary';
    return 'text-muted-foreground';
  };

  const filters: { key: typeof filter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-20 px-6 max-w-4xl mx-auto">
        <h1 className="font-heading text-3xl font-bold mb-6 text-foreground">Review Queue</h1>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-1.5 text-xs rounded-lg font-heading font-medium transition-colors ${
                filter === f.key ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-muted'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {submissions.length === 0 ? (
          <p className="text-muted-foreground text-sm">No submissions found.</p>
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

                    {/* Admin notes input */}
                    <textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="Admin notes (optional)"
                      rows={2}
                      className="w-full bg-secondary border border-border rounded-lg px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                    />

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2">
                      <Link
                        to={`/admin/sandbox/${sub.id}`}
                        className="bg-primary/20 text-primary border border-primary/30 font-medium px-4 py-2 rounded-lg text-xs hover:bg-primary/30 transition-colors"
                      >
                        🎮 Open Sandbox
                      </Link>
                        <button
                          onClick={() => handleAction(sub.id, 'approved')}
                          disabled={actionLoading}
                          className="bg-green-500/20 text-green-400 border border-green-500/30 font-medium px-4 py-2 rounded-lg text-xs hover:bg-green-500/30 transition-colors disabled:opacity-50"
                        >
                          ✓ Approve & Publish
                        </button>
                      )}
                      {sub.status !== 'rejected' && (
                        <button
                          onClick={() => handleAction(sub.id, 'rejected')}
                          disabled={actionLoading}
                          className="bg-destructive/20 text-destructive border border-destructive/30 font-medium px-4 py-2 rounded-lg text-xs hover:bg-destructive/30 transition-colors disabled:opacity-50"
                        >
                          ✗ Reject
                        </button>
                      )}
                      {sub.status === 'approved' && (
                        <button
                          onClick={() => handleAction(sub.id, 'pending')}
                          disabled={actionLoading}
                          className="bg-secondary text-foreground border border-border font-medium px-4 py-2 rounded-lg text-xs hover:bg-muted transition-colors disabled:opacity-50"
                        >
                          Make Private
                        </button>
                      )}
                      <button
                        onClick={() => handleAction(sub.id, 'needs_revision')}
                        disabled={actionLoading}
                        className="bg-secondary text-secondary-foreground border border-border font-medium px-4 py-2 rounded-lg text-xs hover:bg-muted transition-colors disabled:opacity-50"
                      >
                        Request Changes
                      </button>

                      {/* Delete with confirmation */}
                      {confirmDelete === sub.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            value={deleteTitle}
                            onChange={e => setDeleteTitle(e.target.value)}
                            placeholder={`Type "${sub.title}" to confirm`}
                            className="bg-secondary border border-destructive/50 rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none w-48"
                          />
                          <button
                            onClick={() => handleDelete(sub.id)}
                            disabled={actionLoading || deleteTitle !== sub.title}
                            className="bg-destructive text-destructive-foreground font-medium px-3 py-2 rounded-lg text-xs disabled:opacity-30"
                          >
                            Confirm Delete
                          </button>
                          <button
                            onClick={() => { setConfirmDelete(null); setDeleteTitle(''); }}
                            className="text-xs text-muted-foreground hover:text-foreground"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDelete(sub.id)}
                          className="bg-destructive/10 text-destructive border border-destructive/20 font-medium px-4 py-2 rounded-lg text-xs hover:bg-destructive/20 transition-colors"
                        >
                          Delete Game
                        </button>
                      )}
                    </div>
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
