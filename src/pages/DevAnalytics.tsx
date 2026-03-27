import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

interface GameStat {
  id: string;
  title: string;
  play_count: number;
  status: string;
}

interface PlayEvent {
  game_id: string;
  device_type: string;
  played_at: string;
  duration_s: number | null;
}

export default function DevAnalytics() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [games, setGames] = useState<GameStat[]>([]);
  const [events, setEvents] = useState<PlayEvent[]>([]);
  const [selectedGame, setSelectedGame] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate('/auth/login'); return; }
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);

    const { data: myGames } = await supabase
      .from('approved_games')
      .select('id, title, play_count, status')
      .eq('submitter_id', user.id);
    if (myGames) setGames(myGames as GameStat[]);

    // Fetch play events for the dev's games
    const gameIds = (myGames || []).map(g => g.id);
    if (gameIds.length > 0) {
      const { data: evts } = await supabase
        .from('play_events')
        .select('game_id, device_type, played_at, duration_s')
        .in('game_id', gameIds)
        .order('played_at', { ascending: false })
        .limit(500);
      if (evts) setEvents(evts as PlayEvent[]);
    }

    setLoading(false);
  };

  const filteredEvents = selectedGame === 'all' ? events : events.filter(e => e.game_id === selectedGame);

  // Calculate stats
  const totalPlays = filteredEvents.length;
  const deviceBreakdown: Record<string, number> = {};
  filteredEvents.forEach(e => {
    const d = e.device_type || 'unknown';
    deviceBreakdown[d] = (deviceBreakdown[d] || 0) + 1;
  });

  // Daily plays for last 7 days
  const dailyPlays: Record<string, number> = {};
  const now = Date.now();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now - i * 86400000).toLocaleDateString('en', { month: 'short', day: 'numeric' });
    dailyPlays[d] = 0;
  }
  filteredEvents.forEach(e => {
    const d = new Date(e.played_at).toLocaleDateString('en', { month: 'short', day: 'numeric' });
    if (d in dailyPlays) dailyPlays[d]++;
  });

  const maxDaily = Math.max(...Object.values(dailyPlays), 1);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-20 px-6 max-w-4xl mx-auto">
        <h1 className="font-heading text-2xl font-bold text-foreground mb-2">Developer Analytics</h1>
        <p className="text-sm text-muted-foreground mb-8">Track how your games are performing.</p>

        {loading ? (
          <p className="text-muted-foreground text-sm">Loading...</p>
        ) : games.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <p className="text-muted-foreground text-sm">You haven't published any games yet.</p>
            <button onClick={() => navigate('/contribute')} className="bg-primary text-primary-foreground px-6 py-2 rounded-lg text-sm font-medium">
              Submit a Game →
            </button>
          </div>
        ) : (
          <>
            {/* Game selector */}
            <div className="mb-6">
              <select
                value={selectedGame}
                onChange={e => setSelectedGame(e.target.value)}
                className="bg-secondary border border-border rounded-lg px-4 py-2 text-sm text-foreground focus:outline-none"
              >
                <option value="all">All Games</option>
                {games.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
              </select>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-3 gap-3 mb-8">
              <div className="p-4 rounded-[10px] border border-border bg-card">
                <div className="font-heading text-2xl font-bold text-foreground">{totalPlays}</div>
                <div className="text-[10px] text-muted-foreground font-mono uppercase">Total Plays</div>
              </div>
              <div className="p-4 rounded-[10px] border border-border bg-card">
                <div className="font-heading text-2xl font-bold text-foreground">{games.length}</div>
                <div className="text-[10px] text-muted-foreground font-mono uppercase">Games Published</div>
              </div>
              <div className="p-4 rounded-[10px] border border-border bg-card">
                <div className="font-heading text-2xl font-bold text-foreground">{games.reduce((a, g) => a + g.play_count, 0)}</div>
                <div className="text-[10px] text-muted-foreground font-mono uppercase">Lifetime Plays</div>
              </div>
            </div>

            {/* Daily plays bar chart */}
            <div className="p-4 rounded-[10px] border border-border bg-card mb-8">
              <h3 className="font-heading text-sm font-semibold text-foreground mb-4">Plays (Last 7 Days)</h3>
              <div className="flex items-end gap-2 h-32">
                {Object.entries(dailyPlays).map(([day, count]) => (
                  <div key={day} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] font-mono text-muted-foreground">{count}</span>
                    <div
                      className="w-full rounded-t-sm bg-primary/60"
                      style={{ height: `${(count / maxDaily) * 100}%`, minHeight: count > 0 ? '4px' : '0' }}
                    />
                    <span className="text-[9px] font-mono text-muted-foreground">{day.split(' ')[1]}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Device breakdown */}
            <div className="p-4 rounded-[10px] border border-border bg-card">
              <h3 className="font-heading text-sm font-semibold text-foreground mb-4">Device Breakdown</h3>
              {Object.keys(deviceBreakdown).length === 0 ? (
                <p className="text-xs text-muted-foreground">No data yet.</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(deviceBreakdown).map(([device, count]) => (
                    <div key={device} className="flex items-center gap-3">
                      <span className="font-mono text-xs text-foreground w-20 capitalize">{device}</span>
                      <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-primary/60 rounded-full" style={{ width: `${(count / totalPlays) * 100}%` }} />
                      </div>
                      <span className="font-mono text-[10px] text-muted-foreground w-12 text-right">{Math.round((count / totalPlays) * 100)}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
      <Footer />
    </div>
  );
}
