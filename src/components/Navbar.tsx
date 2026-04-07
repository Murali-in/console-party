import { Link, useLocation } from 'react-router-dom';
import { forwardRef, useEffect, useState } from 'react';
import BrandLogo from '@/components/BrandLogo';
import { useAuth } from '@/contexts/AuthContext';

const Navbar = forwardRef<HTMLElement>(function Navbar(_props, ref) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { user, isAdmin, signOut, profile } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const isLanding = location.pathname === '/';

  return (
    <nav
      ref={ref}
      className={`fixed top-0 left-0 right-0 z-50 h-[60px] transition-all duration-200 ${
        scrolled || !isLanding ? 'border-b border-border bg-surface' : 'bg-transparent'
      }`}
    >
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-6">
        <Link to="/" aria-label="Eternity Console home">
          <BrandLogo compact className="shrink-0" />
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <Link to="/games" className="font-heading text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
            Games
          </Link>
          <Link to="/play/solo" className="font-heading text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
            Solo Play
          </Link>
          <Link to="/community" className="font-heading text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
            Community
          </Link>
          <Link to="/developers" className="font-heading text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
            Developers
          </Link>
          <Link to="/studio" className="font-heading text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
            Studio
          </Link>
          {user && (
            <Link to="/contribute" className="font-heading text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
              Contribute
            </Link>
          )}
          {isAdmin && (
            <Link to="/admin" className="font-heading text-xs font-medium text-primary transition-colors hover:text-primary/80">
              Admin
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {mobileOpen ? <path d="M18 6L6 18M6 6l12 12" /> : <path d="M3 12h18M3 6h18M3 18h18" />}
            </svg>
          </button>

          {user ? (
            <>
              <Link to="/profile/settings" className="text-[10px] font-mono text-muted-foreground hidden md:block hover:text-foreground transition-colors">
                {profile?.username || user.email?.split('@')[0]}
              </Link>
              {profile?.username && (
                <Link to={`/dev/${profile.username}`} className="text-[10px] font-mono text-primary hidden md:block hover:text-primary/80 transition-colors">
                  Portfolio
                </Link>
              )}
              <button
                onClick={() => signOut()}
                className="hidden md:inline-flex h-9 items-center rounded-lg border border-border px-4 py-2 font-heading text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Log out
              </button>
            </>
          ) : (
            <Link to="/auth/login" className="hidden md:inline-flex h-9 items-center rounded-lg border border-border px-4 py-2 font-heading text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
              Contributor Login
            </Link>
          )}
          <Link
            to="/play"
            className="inline-flex h-9 items-center rounded-lg bg-primary px-4 py-2 font-heading text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Play now →
          </Link>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-surface px-6 py-4 space-y-3">
          <Link to="/games" onClick={() => setMobileOpen(false)} className="block font-heading text-sm text-foreground">Games</Link>
          <Link to="/play/solo" onClick={() => setMobileOpen(false)} className="block font-heading text-sm text-foreground">Solo Play</Link>
          <Link to="/community" onClick={() => setMobileOpen(false)} className="block font-heading text-sm text-foreground">Community</Link>
          <Link to="/developers" onClick={() => setMobileOpen(false)} className="block font-heading text-sm text-foreground">Developers</Link>
          <Link to="/studio" onClick={() => setMobileOpen(false)} className="block font-heading text-sm text-foreground">Studio</Link>
          {user && <Link to="/contribute" onClick={() => setMobileOpen(false)} className="block font-heading text-sm text-foreground">Contribute</Link>}
          {isAdmin && <Link to="/admin" onClick={() => setMobileOpen(false)} className="block font-heading text-sm text-primary">Admin</Link>}
          {user ? (
            <>
              <Link to="/profile/settings" onClick={() => setMobileOpen(false)} className="block font-heading text-sm text-muted-foreground">Settings</Link>
              <button onClick={() => { signOut(); setMobileOpen(false); }} className="block font-heading text-sm text-muted-foreground">Log out</button>
            </>
          ) : (
            <Link to="/auth/login" onClick={() => setMobileOpen(false)} className="block font-heading text-sm text-muted-foreground">Contributor Login</Link>
          )}
        </div>
      )}
    </nav>
  );
});

export default Navbar;
