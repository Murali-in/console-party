import type { RoomPlayer } from '@/contexts/RealtimeContext';
import ConnectionBadge from './ConnectionBadge';

interface ControllerLobbyProps {
  roomCode: string;
  playerInfo: RoomPlayer | null;
  isReady: boolean;
  countdown: number | null;
  connectionStatus: 'connecting' | 'connected' | 'reconnecting';
  onReady: () => void;
}

export default function ControllerLobby({
  roomCode,
  playerInfo,
  isReady,
  countdown,
  connectionStatus,
  onReady,
}: ControllerLobbyProps) {
  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border h-12">
        <div className="flex items-center gap-2">
          <span className="text-primary font-heading font-bold text-xs">∞</span>
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: playerInfo?.color }} />
          <span className="text-xs text-foreground font-heading font-medium">{playerInfo?.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <ConnectionBadge status={connectionStatus} />
          <span className="text-[10px] text-muted-foreground font-mono">ROOM {roomCode}</span>
        </div>
      </div>

      {/* Countdown overlay */}
      {countdown !== null && (
        <div className="absolute inset-0 z-50 bg-background/90 flex items-center justify-center">
          <div className="text-center">
            <div className="font-heading text-[100px] font-extrabold text-primary leading-none animate-pulse">
              {countdown === 0 ? 'GO!' : countdown}
            </div>
          </div>
        </div>
      )}

      {/* Ready state */}
      <div className="flex-1 flex items-center justify-center px-8">
        <div className="text-center space-y-6 w-full max-w-xs">
          <div
            className="w-20 h-20 rounded-full mx-auto flex items-center justify-center text-3xl font-heading font-bold text-background"
            style={{ backgroundColor: playerInfo?.color }}
          >
            P{(playerInfo?.index ?? 0) + 1}
          </div>
          <div>
            <h2 className="font-heading text-lg font-semibold text-foreground">{playerInfo?.name}</h2>
            <p className="text-xs text-muted-foreground font-mono mt-1">Waiting in lobby</p>
          </div>
          <button
            onClick={onReady}
            className={`w-full py-4 rounded-lg font-heading font-semibold text-lg transition-all duration-150 ${
              isReady
                ? 'bg-success text-background'
                : 'bg-primary text-background'
            }`}
          >
            {isReady ? '✓ Ready!' : 'Tap to Ready Up'}
          </button>
          {isReady && (
            <p className="text-[10px] text-muted-foreground font-mono">Waiting for host to start...</p>
          )}
        </div>
      </div>
    </div>
  );
}
