import type { RoomPlayer } from '@/contexts/RealtimeContext';

interface PlayerSlotProps {
  player?: RoomPlayer;
  index: number;
}

export default function PlayerSlot({ player, index }: PlayerSlotProps) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${
      player ? 'border-border bg-card' : 'border-dashed border-border/50 bg-transparent'
    }`}>
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono font-bold"
        style={{ backgroundColor: player?.color ?? 'hsl(0 0% 100% / 0.05)' }}
      >
        {player ? `P${index + 1}` : '—'}
      </div>
      <span className={`text-sm ${player ? 'text-foreground' : 'text-muted-foreground'}`}>
        {player?.name ?? `Slot ${index + 1}`}
      </span>
    </div>
  );
}
