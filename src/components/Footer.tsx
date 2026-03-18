import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="border-t border-border py-12 px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <span className="font-heading font-bold text-sm tracking-tight text-foreground">
          ETERNITY CONSOLE
        </span>
        <div className="flex items-center gap-6">
          <Link to="/games" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Games</Link>
          <Link to="/contribute" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contribute</Link>
          <Link to="/auth/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Login</Link>
        </div>
        <span className="text-xs text-muted-foreground">© 2025 Eternity AI</span>
      </div>
    </footer>
  );
}
