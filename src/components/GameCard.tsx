import { forwardRef } from 'react';
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

const GameCard = forwardRef<HTMLButtonElement, GameCardProps>(function GameCard(
  { id, title, genre, minPlayers, maxPlayers, coverUrl, coverClass, gameType, contributorName, onClick },
  ref,
) {
  const navigate = useNavigate();
  const handleClick = onClick || (() => navigate(`/games/${id}`));

  return (
    <button
      ref={ref}
      type="button"
      onClick={handleClick}
      className="group w-full overflow-hidden rounded-[10px] border border-border bg-card text-left transition-colors duration-150 hover:border-primary/30"
    >
      <div className={`relative aspect-video overflow-hidden ${coverClass || 'bg-secondary'}`}>
        {coverUrl ? (
          <img src={coverUrl} alt={title} className="h-full w-full object-cover" />
        ) : !coverClass ? (
          <span className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">No Cover</span>
        ) : null}
        <span className={`absolute right-2 top-2 rounded px-1.5 py-0.5 font-mono text-[10px] ${
          gameType === 'official' ? 'bg-primary/20 text-primary' : 'bg-secondary text-secondary-foreground'
        }`}>
          {gameType === 'official' ? 'Official' : 'Community'}
        </span>
      </div>
      <div className="space-y-1 p-3">
        <h3 className="font-heading text-sm font-semibold text-foreground transition-colors duration-150 group-hover:text-primary">
          {title}
        </h3>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-muted-foreground">{genre}</span>
          <span className="font-mono text-[10px] text-muted-foreground">· {minPlayers}–{maxPlayers} players</span>
        </div>
        {contributorName && gameType === 'community' && (
          <p className="text-[10px] text-muted-foreground">by {contributorName}</p>
        )}
      </div>
    </button>
  );
});

export default GameCard;
