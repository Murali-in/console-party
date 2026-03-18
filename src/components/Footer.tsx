import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-1.5">
          <span className="text-primary font-heading font-bold text-sm">∞</span>
          <span className="font-heading font-semibold text-xs text-foreground">Eternity Console</span>
        </div>
        <div className="flex items-center gap-6">
          <Link to="/games" className="text-[11px] text-muted-foreground hover:text-foreground transition-colors font-heading">Games</Link>
          <Link to="/contribute" className="text-[11px] text-muted-foreground hover:text-foreground transition-colors font-heading">Contribute</Link>
          <span className="text-[11px] text-muted-foreground font-heading">Privacy</span>
          <span className="text-[11px] text-muted-foreground font-heading">Terms</span>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 pb-6 flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground font-mono">© 2025 Eternity AI</span>
        <span className="text-[10px] text-muted-foreground font-mono">Made for screens of all shapes.</span>
      </div>
    </footer>
  );
}
