import { Link, useLocation } from 'react-router-dom';

const STUDIO_LINKS = [
  { path: '/studio', label: '⚡ Generator', exact: true },
  { path: '/studio/scene', label: '🗺️ Scene Editor' },
  { path: '/studio/assets', label: '🎨 Assets' },
  { path: '/studio/design', label: '💬 Design' },
  { path: '/studio/particles', label: '✨ Particles' },
  { path: '/studio/export', label: '📦 Export & Dev' },
  { path: '/npc-lab', label: '🤖 NPC Lab' },
];

const StudioNav = () => {
  const location = useLocation();

  return (
    <div className="flex gap-1 overflow-x-auto border-b border-border bg-card/50 px-4 py-1.5">
      {STUDIO_LINKS.map(link => {
        const active = link.exact
          ? location.pathname === link.path
          : location.pathname.startsWith(link.path);
        return (
          <Link
            key={link.path}
            to={link.path}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-[11px] font-heading font-medium transition-colors ${
              active
                ? 'bg-primary/10 border border-primary/30 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </div>
  );
};

export default StudioNav;
