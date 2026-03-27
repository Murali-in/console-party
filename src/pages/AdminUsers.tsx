import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  username: string | null;
  role: string;
  created_at: string;
  is_banned?: boolean;
  display_name?: string;
}

export default function AdminUsers() {
  const { isAdmin, loading, user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !isAdmin) navigate('/', { replace: true });
  }, [isAdmin, loading, navigate]);

  const fetchUsers = async () => {
    if (!isAdmin) return;
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (data) setUsers(data as UserProfile[]);
  };

  useEffect(() => { fetchUsers(); }, [isAdmin]);

  const logAction = async (action: string, targetId: string, details?: any) => {
    if (!user) return;
    await supabase.from('admin_log').insert({
      admin_id: user.id, action, target_type: 'user', target_id: targetId, details: details || {},
    } as any);
  };

  const handleBan = async (profile: UserProfile) => {
    setActionLoading(profile.id);
    const newBanned = !profile.is_banned;
    await supabase.from('profiles').update({ is_banned: newBanned } as any).eq('id', profile.id);
    await logAction(newBanned ? 'ban_user' : 'unban_user', profile.user_id, { email: profile.email });
    setActionLoading(null);
    fetchUsers();
  };

  const handleRoleChange = async (profile: UserProfile, newRole: string) => {
    setActionLoading(profile.id);
    await supabase.from('profiles').update({ role: newRole } as any).eq('id', profile.id);
    await logAction('change_role', profile.user_id, { email: profile.email, from: profile.role, to: newRole });
    setActionLoading(null);
    fetchUsers();
  };

  if (loading || !isAdmin) return null;

  const filtered = users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.username?.toLowerCase().includes(search.toLowerCase()) || false
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-20 px-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-heading text-3xl font-bold text-foreground">User Management</h1>
          <span className="text-xs font-mono text-muted-foreground">{users.length} users</span>
        </div>

        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by email or username..."
          className="w-full bg-card border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary mb-6"
        />

        <div className="space-y-2">
          {filtered.map(u => (
            <div key={u.id} className={`bg-card border rounded-lg p-4 flex items-center justify-between ${
              u.is_banned ? 'border-destructive/30 opacity-60' : 'border-border'
            }`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-sm text-foreground truncate">{u.email}</span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                    u.role === 'admin' ? 'bg-primary/20 text-primary' :
                    u.role === 'developer' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-secondary text-muted-foreground'
                  }`}>{u.role}</span>
                  {u.is_banned && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-destructive/20 text-destructive">BANNED</span>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground font-mono mt-1">
                  @{u.username || 'no-username'} · Joined {new Date(u.created_at).toLocaleDateString()}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0 ml-4">
                {/* Role dropdown */}
                <select
                  value={u.role}
                  onChange={e => handleRoleChange(u, e.target.value)}
                  disabled={actionLoading === u.id || u.email === 'gokusonatwork@gmail.com'}
                  className="bg-secondary border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none disabled:opacity-30"
                >
                  <option value="user">User</option>
                  <option value="developer">Developer</option>
                  <option value="admin">Admin</option>
                </select>

                {/* Ban/Unban */}
                {u.email !== 'gokusonatwork@gmail.com' && (
                  <button
                    onClick={() => handleBan(u)}
                    disabled={actionLoading === u.id}
                    className={`px-3 py-1 text-xs rounded font-mono transition-colors disabled:opacity-30 ${
                      u.is_banned
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30'
                        : 'bg-destructive/20 text-destructive border border-destructive/30 hover:bg-destructive/30'
                    }`}
                  >
                    {u.is_banned ? 'Unban' : 'Ban'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center mt-8">No users found.</p>
        )}
      </div>
    </div>
  );
}
