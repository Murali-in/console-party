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
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({ totalGames: 0, pending: 0, contributors: 0 });

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate('/');
    }
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
        totalGames: (approved.count ?? 0) + 5,
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-20 px-6 max-w-5xl mx-auto">
        <h1 className="font-heading text-3xl font-bold mb-8 text-foreground">Admin Dashboard</h1>

        <div className="grid grid-cols-3 gap-4 mb-12">
          {statCards.map(s => (
            <div key={s.label} className="bg-card border border-border rounded-lg p-6 space-y-1">
              <p className="text-2xl font-heading font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        <Link
          to="/admin/review"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-medium px-6 py-3 rounded-lg hover:opacity-90 transition-opacity text-sm"
        >
          Review Submissions →
        </Link>
      </div>
    </div>
  );
}
