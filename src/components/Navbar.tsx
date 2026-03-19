import { Link, useLocation } from 'react-router-dom';
import { forwardRef, useEffect, useState } from 'react';
import BrandLogo from '@/components/BrandLogo';

const Navbar = forwardRef<HTMLElement>(function Navbar(_props, ref) {
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

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
            Developers
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/auth/login" className="inline-flex h-9 items-center rounded-lg border border-border px-4 py-2 font-heading text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
            Log in
          </Link>
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
