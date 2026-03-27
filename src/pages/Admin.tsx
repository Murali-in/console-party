import { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';

interface Stats {
  totalGames: number;
  pendingReview: number;
  totalUsers: number;
  bannedUsers: number;
  recentSignups: { email: string; created_at: string }[];
}

export default function Admin() {
  const { isAdmin, loading, user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    totalGames: 0, pendingReview: 0, totalUsers: 0, bannedUsers: 0, recentSignups: [],
  });
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  useEffect(() => {
    if (!loading && !isAdmin) navigate('/', { replace: true });
  }, [isAdmin, loading, navigate]);

  const fetchStats = useCallback(async () => {
    if (!isAdmin) return;
    const [approved, pending, profiles] = await Promise.all([
      supabase.from('approved_games').select('id', { count: 'exact', head: true }),
      supabase.from('submitted_games').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('profiles').select('user_id, email, created_at, is_banned').order('created_at', { ascending: false }).limit(10),
    ]);

    const allProfiles = (profiles.data || []) as any[];
    setStats({
      totalGames: (approved.count ?? 0) + 3, // 3 built-in
      pendingReview: pending.count ?? 0,
      totalUsers: allProfiles.length,
      bannedUsers: allProfiles.filter((p: any) => p.is_banned).length,
      recentSignups: allProfiles.slice(0, 5).map((p: any) => ({
        email: p.email,
        created_at: p.created_at,
      })),
    });
  }, [isAdmin]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const logAction = async (action: string, targetType?: string, targetId?: string, details?: any) => {
    if (!user) return;
    await supabase.from('admin_log').insert({
      admin_id: user.id,
      action,
      target_type: targetType || null,
      target_id: targetId || null,
      details: details || {},
    } as any);
  };

  if (loading || !isAdmin) return null;

  const statCards = [
    { label: 'Total Games', value: stats.totalGames, icon: '🎮' },
    { label: 'Pending Review', value: stats.pendingReview, icon: '📋', highlight: stats.pendingReview > 0 },
    { label: 'Total Users', value: stats.totalUsers, icon: '👥' },
    { label: 'Banned Users', value: stats.bannedUsers, icon: '🚫' },
  ];

  const adminLinks = [
    { to: '/admin/review', label: 'Review Queue', desc: 'Approve, reject, sandbox-test, or delete submitted games', badge: stats.pendingReview > 0 ? `${stats.pendingReview} pending` : undefined },
    { to: '/admin/users', label: 'User Management', desc: 'View all users, ban/unban, change roles' },
    { to: '/admin/logs', label: 'Audit Logs', desc: 'View all admin actions with timestamps and details' },
    { to: '/admin/games', label: 'Game Management', desc: 'Edit, make private, delete, or mark games as official' },
    { to: '/games', label: 'Game Library', desc: 'View the public game library as users see it' },
    { to: '/contribute', label: 'Submit a Game', desc: 'Submit a new game as admin' },
    { to: '/developers', label: 'Developer Docs', desc: 'Integration guides for Unity, Godot, Unreal, HTML5' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-20 px-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-heading text-3xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-xs text-muted-foreground font-mono mt-1">{user?.email}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setMaintenanceMode(!maintenanceMode);
                logAction(maintenanceMode ? 'maintenance_off' : 'maintenance_on');
              }}
              className={`px-4 py-2 text-xs font-mono rounded-lg border transition-colors ${
                maintenanceMode
                  ? 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400'
                  : 'bg-secondary border-border text-muted-foreground hover:border-primary/30'
              }`}
            >
              {maintenanceMode ? '⚠ Maintenance ON' : 'Maintenance Mode'}
            </button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {statCards.map(s => (
            <div key={s.label} className={`bg-card border rounded-lg p-5 space-y-1 ${
              s.highlight ? 'border-primary/30' : 'border-border'
            }`}>
              <div className="flex items-center gap-2">
                <span className="text-lg">{s.icon}</span>
                <p className="text-2xl font-heading font-bold text-foreground">{s.value}</p>
              </div>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Recent signups */}
        {stats.recentSignups.length > 0 && (
          <div className="bg-card border border-border rounded-lg p-5 mb-8">
            <h3 className="font-heading text-sm font-semibold text-foreground mb-3">Recent Signups</h3>
            <div className="space-y-2">
              {stats.recentSignups.map((s, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-xs font-mono text-foreground">{s.email}</span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {new Date(s.created_at).toLocaleDateString()} {new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Admin navigation */}
        <div className="space-y-3">
          {adminLinks.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className="flex items-center justify-between p-5 bg-card border border-border rounded-lg hover:border-primary/30 transition-colors group"
            >
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-heading text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                    {link.label}
                  </h3>
                  {link.badge && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/20 text-primary">
                      {link.badge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{link.desc}</p>
              </div>
              <span className="text-muted-foreground group-hover:text-primary transition-colors">→</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
