import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const GENRES = ['Party', 'Racing', 'Shooter', 'Strategy', 'Puzzle', 'Other'];

export default function Contribute() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    genre: 'Party',
    minPlayers: 2,
    maxPlayers: 4,
    githubUrl: '',
    demoUrl: '',
    agree: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !form.agree) return;

    setLoading(true);
    const { error } = await supabase.from('submitted_games').insert({
      title: form.title.trim(),
      description: form.description.trim(),
      genre: form.genre,
      min_players: form.minPlayers,
      max_players: form.maxPlayers,
      github_url: form.githubUrl.trim(),
      demo_url: form.demoUrl.trim() || null,
      submitter_id: user.id,
      status: 'pending',
    } as any);

    setLoading(false);
    if (!error) setSubmitted(true);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-32 px-6 max-w-lg mx-auto text-center space-y-6">
          <h1 className="font-heading text-2xl font-bold text-foreground">Contribute a Game</h1>
          <p className="text-sm text-muted-foreground">You need to be logged in to submit a game.</p>
          <button
            onClick={() => navigate('/auth/login')}
            className="bg-primary text-primary-foreground font-medium px-6 py-3 rounded-lg hover:opacity-90 transition-opacity text-sm"
          >
            Log In
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-32 px-6 max-w-lg mx-auto text-center space-y-6">
          <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center mx-auto">
            <span className="text-success text-xl">✓</span>
          </div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Game Submitted</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Game submitted. Our admin team will review your submission within 48 hours.
            If approved, your game will appear in the Eternity Console library with a
            'Community' badge and your name as the creator.
          </p>
          <button
            onClick={() => navigate('/games')}
            className="text-primary text-sm font-medium hover:opacity-80 transition-opacity"
          >
            Browse Games →
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-20 px-6 max-w-2xl mx-auto">
        <div className="space-y-2 mb-8">
          <h1 className="font-heading text-3xl font-bold text-foreground">Submit Your Game</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Eternity Console is a growing platform. New games are added regularly —
            by our team and by developers like you. If you've built a small multiplayer
            browser game, you can submit it here. Once it passes our review, it goes
            live to all players. Your game. Real players. Zero distribution hassle.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Game Title</label>
            <input
              required
              maxLength={60}
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              className="w-full bg-secondary border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="My Awesome Game"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Short Description</label>
            <textarea
              required
              maxLength={140}
              rows={2}
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              className="w-full bg-secondary border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              placeholder="A brief description of your game (max 140 chars)"
            />
            <span className="text-xs text-muted-foreground">{form.description.length}/140</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Genre</label>
              <select
                value={form.genre}
                onChange={e => setForm({ ...form, genre: e.target.value })}
                className="w-full bg-secondary border border-border rounded-lg px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Players</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={2}
                  max={4}
                  value={form.minPlayers}
                  onChange={e => setForm({ ...form, minPlayers: Number(e.target.value) })}
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <span className="flex items-center text-muted-foreground">–</span>
                <input
                  type="number"
                  min={2}
                  max={4}
                  value={form.maxPlayers}
                  onChange={e => setForm({ ...form, maxPlayers: Number(e.target.value) })}
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">GitHub Repository URL *</label>
            <input
              required
              type="url"
              value={form.githubUrl}
              onChange={e => setForm({ ...form, githubUrl: e.target.value })}
              className="w-full bg-secondary border border-border rounded-lg px-4 py-3 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="https://github.com/you/your-game"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Playable Demo URL (optional)</label>
            <input
              type="url"
              value={form.demoUrl}
              onChange={e => setForm({ ...form, demoUrl: e.target.value })}
              className="w-full bg-secondary border border-border rounded-lg px-4 py-3 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="https://your-game-demo.com"
            />
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.agree}
              onChange={e => setForm({ ...form, agree: e.target.checked })}
              className="mt-1 accent-primary"
            />
            <span className="text-sm text-muted-foreground">
              I confirm this game contains no harmful, offensive, or copyrighted content.
            </span>
          </label>

          <button
            type="submit"
            disabled={loading || !form.agree}
            className="w-full bg-primary text-primary-foreground font-medium py-3 rounded-lg hover:opacity-90 transition-opacity text-sm disabled:opacity-30"
          >
            {loading ? 'Submitting...' : 'Submit Game for Review'}
          </button>
        </form>
      </div>
      <Footer />
    </div>
  );
}
