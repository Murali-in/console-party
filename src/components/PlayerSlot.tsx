import type { RoomPlayer } from '@/contexts/RealtimeContext';

interface PlayerSlotProps {
  player?: RoomPlayer;
  index: number;
}

export default function PlayerSlot({ player, index }: PlayerSlotProps) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all duration-200 ${
      player ? 'border-border bg-card' : 'border-dashed border-border/50 bg-transparent'
    }`}>
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono font-bold text-background"
        style={{ backgroundColor: player?.color ?? 'hsl(0 0% 100% / 0.05)' }}
      >
        {player ? `P${index + 1}` : '—'}
      </div>
      <div className="flex-1">
        <span className={`text-sm ${player ? 'text-foreground' : 'text-muted-foreground'}`}>
          {player?.name ?? `Slot ${index + 1}`}
        </span>
      </div>
      {player && (
        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
          player.ready
            ? 'bg-success/20 text-success'
            : 'bg-warning/20 text-warning'
        }`}>
          {player.ready ? '✓ Ready' : 'Waiting…'}
        </span>
      )}
    </div>
  );
}
