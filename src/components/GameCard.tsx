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
  contributorName?: string;
  onClick?: () => void;
}

export default function GameCard({ id, title, genre, minPlayers, maxPlayers, coverUrl, coverClass, gameType, contributorName, onClick }: GameCardProps) {
  const navigate = useNavigate();
  const handleClick = onClick || (() => navigate(`/games/${id}`));
  return (
    <button
      onClick={handleClick}
      className="group text-left bg-card border border-border rounded-[10px] overflow-hidden hover:border-primary/30 transition-colors duration-150 w-full"
    >
      <div className={`aspect-video relative overflow-hidden ${coverClass || 'bg-secondary'}`}>
        {coverUrl ? (
          <img src={coverUrl} alt={title} className="w-full h-full object-cover" />
        ) : !coverClass ? (
          <span className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">No Cover</span>
        ) : null}
        <span className={`absolute top-2 right-2 text-[10px] font-mono px-1.5 py-0.5 rounded ${
          gameType === 'official' ? 'bg-primary/20 text-primary' : 'bg-green-500/20 text-green-400'
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
        {contributorName && gameType === 'community' && (
          <p className="text-[10px] text-muted-foreground">by {contributorName}</p>
        )}
      </div>
    </button>
  );
}
