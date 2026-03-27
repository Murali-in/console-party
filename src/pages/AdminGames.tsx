import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';

interface GameEntry {
  id: string;
  title: string;
  description: string;
  genre: string;
  min_players: number;
  max_players: number;
  game_type: string;
  is_private: boolean;
  status: string;
  admin_notes: string | null;
  source_url: string | null;
  github_url: string | null;
  engine: string;
  play_count: number;
  approved_at: string;
  submitter_id: string | null;
}

const BUILT_IN_GAMES = [
  { id: 'apex-arena', title: 'Apex Arena', genre: 'Shooter', engine: 'phaser', game_type: 'official' },
  { id: 'pong', title: 'Pong', genre: 'Classic', engine: 'phaser', game_type: 'official' },
  { id: 'maze-runner', title: 'Maze Runner', genre: 'Puzzle', engine: 'phaser', game_type: 'official' },
];

export default function AdminGames() {
  const { isAdmin, loading, user } = useAuth();
  const navigate = useNavigate();
  const [dbGames, setDbGames] = useState<GameEntry[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleteTitle, setDeleteTitle] = useState('');

  useEffect(() => {
    if (!loading && !isAdmin) navigate('/', { replace: true });
  }, [isAdmin, loading, navigate]);

  const fetchGames = async () => {
    if (!isAdmin) return;
    const { data } = await supabase.from('approved_games').select('*').order('approved_at', { ascending: false });
    if (data) setDbGames(data as GameEntry[]);
  };

  useEffect(() => { fetchGames(); }, [isAdmin]);

  const logAction = async (action: string, gameTitle: string, details?: any) => {
    if (!user) return;
    await supabase.from('admin_log').insert({
      admin_id: user.id, action, target_type: 'game', target_id: gameTitle, details: details || {},
    } as any);
  };

  const handleTogglePrivate = async (game: GameEntry) => {
    setActionLoading(game.id);
    const newPrivate = !game.is_private;
    await supabase.from('approved_games').update({ is_private: newPrivate } as any).eq('id', game.id);
    await logAction(newPrivate ? 'make_private' : 'make_public', game.title);
    setActionLoading(null);
    fetchGames();
  };

  const handleToggleOfficial = async (game: GameEntry) => {
    setActionLoading(game.id);
    const newType = game.game_type === 'official' ? 'community' : 'official';
    await supabase.from('approved_games').update({ game_type: newType } as any).eq('id', game.id);
    await logAction(newType === 'official' ? 'make_official' : 'unmake_official', game.title);
    setActionLoading(null);
    fetchGames();
  };

  const handleSaveEdit = async (game: GameEntry) => {
    setActionLoading(game.id);
    await supabase.from('approved_games').update({
      description: editDesc || game.description,
      admin_notes: editNotes || null,
    } as any).eq('id', game.id);
    await logAction('edit_game', game.title, { notes: editNotes });
    setEditingId(null);
    setActionLoading(null);
    fetchGames();
  };

  const handleDelete = async (game: GameEntry) => {
    if (deleteTitle !== game.title) return;
    setActionLoading(game.id);
    await supabase.from('approved_games').delete().eq('id', game.id);
    await logAction('delete_game', game.title);
    setConfirmDelete(null);
    setDeleteTitle('');
    setActionLoading(null);
    fetchGames();
  };

  const handleSuspend = async (game: GameEntry) => {
    setActionLoading(game.id);
    await supabase.from('approved_games').update({ status: 'suspended' } as any).eq('id', game.id);
    await logAction('suspend_game', game.title);
    setActionLoading(null);
    fetchGames();
  };

  if (loading || !isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-20 px-6 max-w-5xl mx-auto">
        <h1 className="font-heading text-3xl font-bold mb-2 text-foreground">Game Management</h1>
        <p className="text-xs text-muted-foreground font-mono mb-8">
          Built-in: {BUILT_IN_GAMES.length} · Database: {dbGames.length}
        </p>

        {/* Built-in games (read-only info) */}
        <h2 className="font-heading text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Built-in Games (code-level)</h2>
        <div className="grid grid-cols-3 gap-3 mb-8">
          {BUILT_IN_GAMES.map(g => (
            <div key={g.id} className="bg-card border border-border rounded-lg p-4">
              <h3 className="font-heading text-sm font-semibold text-foreground">{g.title}</h3>
              <p className="text-[10px] font-mono text-muted-foreground">{g.genre} · {g.engine}</p>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/20 text-primary mt-1 inline-block">Official</span>
            </div>
          ))}
        </div>

        {/* Database games (editable) */}
        <h2 className="font-heading text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Database Games</h2>
        {dbGames.length === 0 ? (
          <p className="text-sm text-muted-foreground">No games in database.</p>
        ) : (
          <div className="space-y-3">
            {dbGames.map(game => (
              <div key={game.id} className={`bg-card border rounded-lg overflow-hidden ${
                game.is_private ? 'border-yellow-500/30' : game.status === 'suspended' ? 'border-destructive/30' : 'border-border'
              }`}>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-heading text-sm font-semibold text-foreground">{game.title}</h3>
                      <span className="text-[10px] font-mono text-muted-foreground">{game.genre}</span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                        game.game_type === 'official' ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground'
                      }`}>{game.game_type}</span>
                      {game.is_private && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400">PRIVATE</span>
                      )}
                      {game.status === 'suspended' && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-destructive/20 text-destructive">SUSPENDED</span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground">{game.play_count} plays</span>
                  </div>

                  <p className="text-xs text-muted-foreground mb-3">{game.description}</p>

                  {/* Edit mode */}
                  {editingId === game.id && (
                    <div className="space-y-2 mb-3 p-3 bg-secondary rounded-lg">
                      <textarea
                        value={editDesc}
                        onChange={e => setEditDesc(e.target.value)}
                        placeholder="Edit description..."
                        rows={2}
                        className="w-full bg-background border border-border rounded px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none resize-none"
                      />
                      <textarea
                        value={editNotes}
                        onChange={e => setEditNotes(e.target.value)}
                        placeholder="Admin notes (private)..."
                        rows={1}
                        className="w-full bg-background border border-border rounded px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none resize-none"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => handleSaveEdit(game)} disabled={actionLoading === game.id}
                          className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded disabled:opacity-30">Save</button>
                        <button onClick={() => setEditingId(null)}
                          className="px-3 py-1 text-xs text-muted-foreground hover:text-foreground">Cancel</button>
                      </div>
                    </div>
                  )}

                  {/* Delete confirmation */}
                  {confirmDelete === game.id && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg mb-3 space-y-2">
                      <p className="text-xs text-destructive">Type "<strong>{game.title}</strong>" to confirm permanent deletion:</p>
                      <div className="flex items-center gap-2">
                        <input
                          value={deleteTitle}
                          onChange={e => setDeleteTitle(e.target.value)}
                          className="bg-background border border-destructive/30 rounded px-3 py-1.5 text-xs text-foreground w-48 focus:outline-none"
                        />
                        <button onClick={() => handleDelete(game)} disabled={actionLoading === game.id || deleteTitle !== game.title}
                          className="px-3 py-1.5 text-xs bg-destructive text-destructive-foreground rounded disabled:opacity-30">Delete</button>
                        <button onClick={() => { setConfirmDelete(null); setDeleteTitle(''); }}
                          className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => { setEditingId(game.id); setEditDesc(game.description); setEditNotes(game.admin_notes || ''); }}
                      className="px-3 py-1 text-[10px] font-mono bg-secondary border border-border rounded hover:border-primary/30 transition-colors">
                      ✏️ Edit
                    </button>
                    <button onClick={() => handleTogglePrivate(game)} disabled={actionLoading === game.id}
                      className="px-3 py-1 text-[10px] font-mono bg-secondary border border-border rounded hover:border-primary/30 transition-colors disabled:opacity-30">
                      {game.is_private ? '🔓 Make Public' : '🔒 Make Private'}
                    </button>
                    <button onClick={() => handleToggleOfficial(game)} disabled={actionLoading === game.id}
                      className="px-3 py-1 text-[10px] font-mono bg-secondary border border-border rounded hover:border-primary/30 transition-colors disabled:opacity-30">
                      {game.game_type === 'official' ? '↓ Community' : '⭐ Official'}
                    </button>
                    {game.status !== 'suspended' && (
                      <button onClick={() => handleSuspend(game)} disabled={actionLoading === game.id}
                        className="px-3 py-1 text-[10px] font-mono bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded hover:bg-yellow-500/20 transition-colors disabled:opacity-30">
                        ⏸ Suspend
                      </button>
                    )}
                    <button onClick={() => setConfirmDelete(game.id)}
                      className="px-3 py-1 text-[10px] font-mono bg-destructive/10 text-destructive border border-destructive/20 rounded hover:bg-destructive/20 transition-colors">
                      🗑️ Delete
                    </button>
                    {game.source_url && (
                      <a href={game.source_url} target="_blank" rel="noopener"
                        className="px-3 py-1 text-[10px] font-mono bg-secondary border border-border rounded hover:border-primary/30 transition-colors text-primary">
                        🔗 Live URL
                      </a>
                    )}
                    {game.github_url && (
                      <a href={game.github_url} target="_blank" rel="noopener"
                        className="px-3 py-1 text-[10px] font-mono bg-secondary border border-border rounded hover:border-primary/30 transition-colors text-primary">
                        GitHub
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
