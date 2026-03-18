interface GameCardProps {
  title: string;
  genre: string;
  minPlayers: number;
  maxPlayers: number;
  coverUrl?: string;
  gameType: 'official' | 'community';
  onClick?: () => void;
}

export default function GameCard({ title, genre, minPlayers, maxPlayers, coverUrl, gameType, onClick }: GameCardProps) {
  return (
    <button
      onClick={onClick}
      className="group text-left bg-card border border-border rounded-lg overflow-hidden hover:border-primary/30 transition-colors w-full"
    >
      <div className="aspect-video bg-secondary flex items-center justify-center overflow-hidden">
        {coverUrl ? (
          <img src={coverUrl} alt={title} className="w-full h-full object-cover" />
        ) : (
          <span className="text-muted-foreground text-sm">No Cover</span>
        )}
      </div>
      <div className="p-4 space-y-2">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-mono px-2 py-0.5 rounded ${
            gameType === 'official' ? 'bg-primary/20 text-primary' : 'bg-success/20 text-success'
          }`}>
            {gameType === 'official' ? 'Official' : 'Community'}
          </span>
          <span className="text-xs font-mono text-muted-foreground">{genre}</span>
        </div>
        <h3 className="font-heading font-semibold text-foreground group-hover:text-primary transition-colors">
          {title}
        </h3>
        <p className="text-xs text-muted-foreground">{minPlayers}–{maxPlayers} players</p>
      </div>
    </button>
  );
}
