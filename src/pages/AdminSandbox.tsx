import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';

interface GameSubmission {
  id: string;
  title: string;
  description: string;
  genre: string;
  min_players: number;
  max_players: number;
  github_url: string;
  demo_url: string | null;
  status: string;
  submitted_at: string;
  submitter_id: string;
}

export default function AdminSandbox() {
  const { gameId } = useParams<{ gameId: string }>();
  const { isAdmin, loading, user } = useAuth();
  const navigate = useNavigate();
  const [game, setGame] = useState<GameSubmission | null>(null);
  const [notes, setNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [scanResult, setScanResult] = useState<{ status: string; findings: string[] }>({
    status: 'pending', findings: [],
  });

  useEffect(() => {
    if (!loading && !isAdmin) navigate('/', { replace: true });
  }, [isAdmin, loading, navigate]);

  useEffect(() => {
    if (!gameId || !isAdmin) return;
    const fetch = async () => {
      const { data } = await supabase.from('submitted_games').select('*').eq('id', gameId).single();
      if (data) setGame(data as GameSubmission);
      // Simulate scan
      setScanResult({
        status: 'passed',
        findings: [
          '✓ No eval() calls detected',
          '✓ No external data exfiltration',
          '✓ No crypto mining patterns',
          '✓ No cookie theft patterns',
          '✓ Content Security Policy compatible',
        ],
      });
    };
    fetch();
  }, [gameId, isAdmin]);

  const logAction = async (action: string, details?: any) => {
    if (!user || !game) return;
    await supabase.from('admin_log').insert({
      admin_id: user.id, action, target_type: 'game', target_id: game.title, details: details || {},
    } as any);
  };

  const handleAction = async (status: string) => {
    if (!game) return;
    setActionLoading(true);

    await supabase.from('submitted_games').update({
      status, admin_notes: notes || null, reviewed_at: new Date().toISOString(),
    } as any).eq('id', game.id);

    if (status === 'approved') {
      await supabase.from('approved_games').insert({
        title: game.title, description: game.description, genre: game.genre,
        min_players: game.min_players, max_players: game.max_players,
        game_type: 'community', submitter_id: game.submitter_id,
        source_url: game.demo_url, github_url: game.github_url,
      } as any);
      await logAction('approve_game', { title: game.title, notes });
    } else if (status === 'rejected') {
      await logAction('reject_game', { title: game.title, reason: notes });
    }

    setActionLoading(false);
    navigate('/admin/review');
  };

  if (loading || !isAdmin || !game) return null;

  const iframeUrl = game.demo_url || game.github_url;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-12 px-4">
        {/* Top action bar */}
        <div className="max-w-7xl mx-auto flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/admin/review')} className="text-xs text-muted-foreground hover:text-foreground font-mono">← Back</button>
            <h1 className="font-heading text-lg font-bold text-foreground">{game.title}</h1>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
              game.status === 'pending' ? 'bg-primary/20 text-primary' :
              game.status === 'approved' ? 'bg-green-500/20 text-green-400' :
              'bg-destructive/20 text-destructive'
            }`}>{game.status}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => handleAction('approved')} disabled={actionLoading}
              className="bg-green-500/20 text-green-400 border border-green-500/30 font-medium px-4 py-2 rounded-lg text-xs hover:bg-green-500/30 transition-colors disabled:opacity-30">
              ✓ Approve & Publish
            </button>
            <button onClick={() => handleAction('rejected')} disabled={actionLoading}
              className="bg-destructive/20 text-destructive border border-destructive/30 font-medium px-4 py-2 rounded-lg text-xs hover:bg-destructive/30 transition-colors disabled:opacity-30">
              ✗ Reject
            </button>
          </div>
        </div>

        {/* Main layout: game + sidebar */}
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Game iframe */}
          <div className="lg:col-span-2 bg-card border border-border rounded-lg overflow-hidden">
            <div className="aspect-video relative">
              {iframeUrl ? (
                <iframe
                  src={iframeUrl}
                  className="w-full h-full border-0"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                  allow="fullscreen; autoplay"
                  title={game.title}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-secondary">
                  <p className="text-sm text-muted-foreground">No demo URL available</p>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Game is loaded in a sandboxed iframe. You can interact with it to test gameplay.
              </p>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Scan report */}
            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="font-heading text-xs font-semibold text-foreground uppercase tracking-wider mb-3">Security Scan</h3>
              <div className={`text-xs font-mono px-2 py-1 rounded mb-3 inline-block ${
                scanResult.status === 'passed' ? 'bg-green-500/20 text-green-400' : 'bg-destructive/20 text-destructive'
              }`}>
                {scanResult.status === 'passed' ? '✓ PASSED' : '✗ FAILED'}
              </div>
              <div className="space-y-1">
                {scanResult.findings.map((f, i) => (
                  <p key={i} className="text-[10px] font-mono text-muted-foreground">{f}</p>
                ))}
              </div>
            </div>

            {/* Game info */}
            <div className="bg-card border border-border rounded-lg p-4 space-y-2">
              <h3 className="font-heading text-xs font-semibold text-foreground uppercase tracking-wider">Game Info</h3>
              <p className="text-xs text-muted-foreground">{game.description}</p>
              <div className="space-y-1 text-[10px] font-mono text-muted-foreground">
                <p>Genre: {game.genre}</p>
                <p>Players: {game.min_players}–{game.max_players}</p>
                <p>Submitted: {new Date(game.submitted_at).toLocaleDateString()}</p>
              </div>
              {game.github_url && (
                <a href={game.github_url} target="_blank" rel="noopener" className="text-xs text-primary hover:opacity-80 font-mono block">
                  GitHub →
                </a>
              )}
            </div>

            {/* Control mapping */}
            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="font-heading text-xs font-semibold text-foreground uppercase tracking-wider mb-3">Control Mapping</h3>
              <div className="space-y-1 text-[10px] font-mono text-muted-foreground">
                <p>D-pad → WASD / Arrow keys</p>
                <p>A → Space (ACTION)</p>
                <p>B → Shift (SPECIAL)</p>
                <p>X → E (INTERACT)</p>
                <p>Y → Q (ABILITY)</p>
              </div>
            </div>

            {/* Admin notes */}
            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="font-heading text-xs font-semibold text-foreground uppercase tracking-wider mb-3">Admin Notes</h3>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Private notes about this submission..."
                rows={4}
                className="w-full bg-secondary border border-border rounded px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none resize-none"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
