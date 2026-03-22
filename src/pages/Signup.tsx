import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';

export default function Signup() {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await signUp(email, password);
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-32 px-6 max-w-sm mx-auto text-center space-y-4">
          <h1 className="font-heading text-2xl font-bold text-foreground">Check your email</h1>
          <p className="text-sm text-muted-foreground">
            We've sent a confirmation link to <strong className="text-foreground">{email}</strong>.
            Click the link to activate your contributor account.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-32 px-6 max-w-sm mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="font-heading text-2xl font-bold text-foreground">Become a Contributor</h1>
          <p className="text-sm text-muted-foreground">
            Create a contributor account to submit games to Eternity Console.
            <br />
            <span className="text-xs">Players don't need an account — just enter a room code to play.</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full bg-secondary border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="Password (min 6 characters)"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full bg-secondary border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground font-medium py-3 rounded-lg hover:opacity-90 transition-opacity text-sm disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Sign Up as Contributor'}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/auth/login" className="text-primary hover:opacity-80 transition-opacity">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
