import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';

interface LogEntry {
  id: string;
  admin_id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: any;
  created_at: string;
}

export default function AdminLogs() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  useEffect(() => {
    if (!loading && !isAdmin) navigate('/', { replace: true });
  }, [isAdmin, loading, navigate]);

  const fetchLogs = async () => {
    if (!isAdmin) return;
    const { data } = await supabase
      .from('admin_log')
      .select('*')
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (data) setLogs(data as LogEntry[]);
  };

  useEffect(() => { fetchLogs(); }, [isAdmin, page]);

  if (loading || !isAdmin) return null;

  const actionColor = (action: string) => {
    if (action.includes('ban')) return 'text-destructive';
    if (action.includes('approve')) return 'text-green-400';
    if (action.includes('reject') || action.includes('delete') || action.includes('suspend')) return 'text-destructive';
    if (action.includes('role')) return 'text-primary';
    return 'text-muted-foreground';
  };

  const actionLabel = (action: string) => {
    const labels: Record<string, string> = {
      ban_user: '🚫 Banned User',
      unban_user: '✅ Unbanned User',
      change_role: '🔄 Changed Role',
      approve_game: '✅ Approved Game',
      reject_game: '❌ Rejected Game',
      delete_game: '🗑️ Deleted Game',
      suspend_game: '⏸ Suspended Game',
      make_private: '🔒 Made Private',
      make_public: '🔓 Made Public',
      make_official: '⭐ Made Official',
      edit_game: '✏️ Edited Game',
      maintenance_on: '⚠️ Maintenance ON',
      maintenance_off: '✅ Maintenance OFF',
    };
    return labels[action] || action;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-20 px-6 max-w-5xl mx-auto">
        <h1 className="font-heading text-3xl font-bold mb-6 text-foreground">Audit Logs</h1>

        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No audit logs yet.</p>
        ) : (
          <div className="space-y-2">
            {logs.map(log => (
              <div key={log.id} className="bg-card border border-border rounded-lg p-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-mono font-medium ${actionColor(log.action)}`}>
                      {actionLabel(log.action)}
                    </span>
                    {log.target_type && (
                      <span className="text-[10px] font-mono text-muted-foreground px-1.5 py-0.5 rounded bg-secondary">
                        {log.target_type}
                      </span>
                    )}
                  </div>
                  {log.details && Object.keys(log.details).length > 0 && (
                    <p className="text-[10px] font-mono text-muted-foreground mt-1 truncate">
                      {JSON.stringify(log.details)}
                    </p>
                  )}
                </div>
                <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                  {new Date(log.created_at).toLocaleDateString()} {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-center gap-4 mt-8">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-4 py-2 text-xs font-mono bg-secondary border border-border rounded-lg disabled:opacity-30 hover:border-primary/30 transition-colors"
          >
            ← Prev
          </button>
          <span className="text-xs font-mono text-muted-foreground">Page {page + 1}</span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={logs.length < PAGE_SIZE}
            className="px-4 py-2 text-xs font-mono bg-secondary border border-border rounded-lg disabled:opacity-30 hover:border-primary/30 transition-colors"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}
