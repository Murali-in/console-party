import { Link } from 'react-router-dom';
import { forwardRef } from 'react';
import BrandLogo from '@/components/BrandLogo';

const Footer = forwardRef<HTMLElement>(function Footer(_props, ref) {
  return (
    <footer ref={ref} className="border-t border-border">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 md:flex-row">
        <BrandLogo compact />
        <div className="flex items-center gap-6">
          <Link to="/games" className="font-heading text-[11px] text-muted-foreground transition-colors duration-150 hover:text-foreground">Games</Link>
          <Link to="/contribute" className="font-heading text-[11px] text-muted-foreground transition-colors duration-150 hover:text-foreground">Contribute</Link>
          <span className="font-heading text-[11px] text-muted-foreground">Privacy</span>
          <span className="font-heading text-[11px] text-muted-foreground">Terms</span>
        </div>
        <span className="font-mono text-[10px] text-muted-foreground">© 2025 Eternity Console</span>
      </div>
      <div className="pb-6 text-center">
        <span className="font-mono text-[10px] text-muted-foreground">Made for every screen.</span>
      </div>
    </footer>
  );
});

export default Footer;
