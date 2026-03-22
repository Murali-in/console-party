import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';

interface Stats {
  totalGames: number;
  pending: number;
  contributors: number;
}

export default function Admin() {
  const { isAdmin, loading, user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({ totalGames: 0, pending: 0, contributors: 0 });

  useEffect(() => {
    if (!loading && !isAdmin) navigate('/', { replace: true });
  }, [isAdmin, loading, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    const fetchStats = async () => {
      const [approved, pending, profiles] = await Promise.all([
        supabase.from('approved_games').select('id', { count: 'exact', head: true }),
        supabase.from('submitted_games').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
      ]);
      setStats({
        totalGames: (approved.count ?? 0) + 9,
        pending: pending.count ?? 0,
        contributors: profiles.count ?? 0,
      });
    };
    fetchStats();
  }, [isAdmin]);

  if (loading || !isAdmin) return null;

  const statCards = [
    { label: 'Total Games', value: stats.totalGames },
    { label: 'Pending Review', value: stats.pending },
    { label: 'Contributors', value: stats.contributors },
  ];

  const adminLinks = [
    { to: '/admin/review', label: 'Review Submissions', desc: 'Approve, reject, delete, or sandbox-test submitted games' },
    { to: '/contribute', label: 'Submit a Game', desc: 'Submit a new game as admin (goes directly to library)' },
    { to: '/games', label: 'Game Library', desc: 'View all live games — admin can manage each game' },
    { to: '/developers', label: 'Developer Docs', desc: 'Unity, Godot, Unreal, HTML5 integration guides' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-20 px-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-heading text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <span className="text-[10px] font-mono text-muted-foreground">{user?.email}</span>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-12">
          {statCards.map(s => (
            <div key={s.label} className="bg-card border border-border rounded-lg p-6 space-y-1">
              <p className="text-2xl font-heading font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          {adminLinks.map(link => (
            <Link
              key={link.to} to={link.to}
              className="flex items-center justify-between p-5 bg-card border border-border rounded-lg hover:border-primary/30 transition-colors group"
            >
              <div>
                <h3 className="font-heading text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{link.label}</h3>
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
