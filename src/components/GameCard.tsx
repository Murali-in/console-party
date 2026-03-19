import { useNavigate } from 'react-router-dom';

interface GameCardProps {
  id: string;
  title: string;
  genre: string;
  minPlayers: number;
  maxPlayers: number;
  coverUrl?: string;
  coverClass?: string;
  gameType: 'official' | 'community';
  onClick?: () => void;
}

export default function GameCard({ title, genre, minPlayers, maxPlayers, coverUrl, coverClass, gameType, onClick }: GameCardProps) {
  return (
    <button
      onClick={onClick}
      className="group text-left bg-card border border-border rounded-[10px] overflow-hidden hover:border-primary/30 transition-colors duration-150 w-full"
    >
      <div className={`aspect-video relative overflow-hidden ${coverClass || 'bg-secondary'}`}>
        {coverUrl ? (
          <img src={coverUrl} alt={title} className="w-full h-full object-cover" />
        ) : !coverClass ? (
          <span className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">No Cover</span>
        ) : null}
        <span className={`absolute top-2 right-2 text-[10px] font-mono px-1.5 py-0.5 rounded ${
          gameType === 'official' ? 'bg-primary/20 text-primary' : 'bg-success/20 text-success'
        }`}>
          {gameType === 'official' ? 'Official' : 'Community'}
        </span>
      </div>
      <div className="p-3 space-y-1">
        <h3 className="font-heading font-semibold text-sm text-foreground group-hover:text-primary transition-colors duration-150">
          {title}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-muted-foreground">{genre}</span>
          <span className="text-[10px] font-mono text-muted-foreground">· {minPlayers}–{maxPlayers} players</span>
        </div>
      </div>
    </button>
  );
}
