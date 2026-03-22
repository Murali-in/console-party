import { Link, useLocation } from 'react-router-dom';
import { forwardRef, useEffect, useState } from 'react';
import BrandLogo from '@/components/BrandLogo';
import { useAuth } from '@/contexts/AuthContext';

const Navbar = forwardRef<HTMLElement>(function Navbar(_props, ref) {
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const { user, isAdmin, signOut } = useAuth();

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
          <Link to="/contribute" className="font-heading text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
            {user ? 'Contribute' : 'Become a Contributor'}
          </Link>
          <Link to="/developers" className="font-heading text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
            Developers
          </Link>
          {isAdmin && (
            <Link to="/admin" className="font-heading text-xs font-medium text-primary transition-colors hover:text-primary/80">
              Admin
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link to="/contribute" className="text-[10px] font-mono text-muted-foreground hidden md:block hover:text-foreground transition-colors">
                {user.email}
              </Link>
              <button
                onClick={() => signOut()}
                className="inline-flex h-9 items-center rounded-lg border border-border px-4 py-2 font-heading text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Log out
              </button>
            </>
          ) : (
            <Link to="/auth/login" className="inline-flex h-9 items-center rounded-lg border border-border px-4 py-2 font-heading text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
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
    </nav>
  );
});

export default Navbar;
