import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Input } from '@/components/ui/input';

export default function ProfileSettings() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    display_name: '',
    username: '',
    bio: '',
    github_username: '',
    twitter_handle: '',
    website_url: '',
    portfolio_accent: '#bfbfbf',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/auth/login'); return; }
    supabase.from('profiles').select('*').eq('user_id', user.id).single().then(({ data }) => {
      if (data) {
        setForm({
          display_name: (data as any).display_name || '',
          username: (data as any).username || '',
          bio: (data as any).bio || '',
          github_username: (data as any).github_username || '',
          twitter_handle: (data as any).twitter_handle || '',
          website_url: (data as any).website_url || '',
          portfolio_accent: (data as any).portfolio_accent || '#bfbfbf',
        });
      }
    });
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    await supabase.from('profiles').update({
      display_name: form.display_name || null,
      username: form.username || null,
      bio: form.bio || null,
      github_username: form.github_username || null,
      twitter_handle: form.twitter_handle || null,
      website_url: form.website_url || null,
      portfolio_accent: form.portfolio_accent,
    } as any).eq('user_id', user.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-20 px-6 max-w-2xl mx-auto">
        <h1 className="font-heading text-2xl font-bold text-foreground mb-8">Profile Settings</h1>
        <form onSubmit={handleSave} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Display Name</label>
            <Input value={form.display_name} onChange={e => setForm({ ...form, display_name: e.target.value })} className="bg-secondary border-border" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Username</label>
            <Input value={form.username} onChange={e => setForm({ ...form, username: e.target.value.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 20) })} className="bg-secondary border-border font-mono" />
            <p className="text-[10px] text-muted-foreground">Your public portfolio: /dev/{form.username || '...'}</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Bio</label>
            <textarea
              value={form.bio} maxLength={300}
              onChange={e => setForm({ ...form, bio: e.target.value })}
              className="w-full bg-secondary border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
              rows={3}
            />
            <span className="text-[10px] text-muted-foreground">{form.bio.length}/300</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">GitHub Username</label>
              <Input value={form.github_username} onChange={e => setForm({ ...form, github_username: e.target.value })} className="bg-secondary border-border font-mono" placeholder="username" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Twitter/X Handle</label>
              <Input value={form.twitter_handle} onChange={e => setForm({ ...form, twitter_handle: e.target.value })} className="bg-secondary border-border font-mono" placeholder="handle" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Website URL</label>
            <Input value={form.website_url} onChange={e => setForm({ ...form, website_url: e.target.value })} className="bg-secondary border-border font-mono" placeholder="https://..." />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Portfolio Accent Color</label>
            <div className="flex items-center gap-3">
              <input type="color" value={form.portfolio_accent} onChange={e => setForm({ ...form, portfolio_accent: e.target.value })} className="w-10 h-10 rounded cursor-pointer" />
              <span className="font-mono text-xs text-muted-foreground">{form.portfolio_accent}</span>
            </div>
          </div>
          <button
            type="submit" disabled={saving}
            className="w-full bg-primary text-primary-foreground font-medium py-3 rounded-lg hover:opacity-90 transition-opacity text-sm disabled:opacity-30"
          >
            {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Settings'}
          </button>
        </form>
      </div>
      <Footer />
    </div>
  );
}
