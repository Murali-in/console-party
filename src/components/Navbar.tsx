import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';

export default function Navbar() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const isLanding = location.pathname === '/';

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled || !isLanding ? 'bg-background/95 backdrop-blur-sm border-b border-border' : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="font-heading font-bold text-lg tracking-tight text-foreground">
          ETERNITY CONSOLE
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <Link to="/games" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Games
          </Link>
          <Link to="/contribute" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Contribute
          </Link>
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              <button onClick={signOut} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Sign Out
              </button>
              <Link
                to="/play"
                className="bg-primary text-primary-foreground text-sm font-medium px-5 py-2 rounded-lg hover:opacity-90 transition-opacity"
              >
                Play Now
              </Link>
            </>
          ) : (
            <>
              <Link to="/auth/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Log In
              </Link>
              <Link
                to="/play"
                className="bg-primary text-primary-foreground text-sm font-medium px-5 py-2 rounded-lg hover:opacity-90 transition-opacity"
              >
                Play Now
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
