import { Link } from 'react-router-dom';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const isLanding = location.pathname === '/';

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 h-[60px] ${
      scrolled || !isLanding ? 'bg-surface border-b border-border' : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
        <Link to="/" className="flex items-center gap-1.5">
          <span className="text-primary font-heading font-bold text-lg">∞</span>
          <span className="font-heading font-bold text-[15px] tracking-tight text-foreground">Eternity</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <Link to="/games" className="text-xs text-muted-foreground hover:text-foreground transition-colors font-heading font-medium">
            Games
          </Link>
          <Link to="/contribute" className="text-xs text-muted-foreground hover:text-foreground transition-colors font-heading font-medium">
            Developers
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/auth/login" className="text-xs text-muted-foreground hover:text-foreground transition-colors font-heading font-medium border border-border rounded-lg px-4 py-2 h-9 inline-flex items-center">
            Log in
          </Link>
          <Link
            to="/play"
            className="bg-primary text-primary-foreground text-xs font-heading font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity h-9 inline-flex items-center"
          >
            Play now →
          </Link>
        </div>
      </div>
    </nav>
  );
}

import { useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
