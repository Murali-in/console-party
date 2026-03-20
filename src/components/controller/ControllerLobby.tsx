import { useState } from 'react';
import type { RoomPlayer } from '@/contexts/RealtimeContext';
import ConnectionBadge from './ConnectionBadge';
import CharacterCustomizer from './CharacterCustomizer';

interface ControllerLobbyProps {
  roomCode: string;
  playerInfo: RoomPlayer | null;
  isReady: boolean;
  countdown: number | null;
  connectionStatus: 'connecting' | 'connected' | 'reconnecting';
  onReady: () => void;
  onCharacterUpdate?: (character: { shape: string; color: string; icon: string; displayName: string }) => void;
}

export default function ControllerLobby({
  roomCode,
  playerInfo,
  isReady,
  countdown,
  connectionStatus,
  onReady,
  onCharacterUpdate,
}: ControllerLobbyProps) {
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [character, setCharacter] = useState<{ shape: string; color: string; icon: string; displayName: string } | null>(null);

  const displayIcon = character?.icon || '⭐';
  const displayColor = character?.color || playerInfo?.color || '#6c63ff';
  const displayName = character?.displayName || playerInfo?.name || 'Player';

  if (showCustomizer) {
    return (
      <CharacterCustomizer
        currentColor={displayColor}
        currentName={displayName}
        onSave={(c) => {
          setCharacter(c);
          setShowCustomizer(false);
          onCharacterUpdate?.(c);
        }}
        onClose={() => setShowCustomizer(false)}
      />
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border h-12">
        <div className="flex items-center gap-2">
          <span className="text-primary font-heading font-bold text-xs">∞</span>
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: displayColor }} />
          <span className="text-xs text-foreground font-heading font-medium">{displayName}</span>
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
        <div className="text-center space-y-5 w-full max-w-xs">
          {/* Character preview */}
          <div
            className="w-20 h-20 rounded-full mx-auto flex items-center justify-center text-3xl"
            style={{ backgroundColor: `${displayColor}22`, border: `2px solid ${displayColor}` }}
          >
            {displayIcon}
          </div>
          <div>
            <h2 className="font-heading text-lg font-semibold text-foreground">{displayName}</h2>
            <p className="text-xs text-muted-foreground font-mono mt-1">Player {(playerInfo?.index ?? 0) + 1} · Waiting in lobby</p>
          </div>

          {/* Customize button */}
          <button
            onClick={() => setShowCustomizer(true)}
            className="w-full py-2.5 rounded-lg border border-border text-xs font-heading font-semibold text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
          >
            ✎ Customize Character
          </button>

          {/* Ready button */}
          <button
            onClick={onReady}
            className={`w-full py-4 rounded-lg font-heading font-semibold text-lg transition-all duration-150 active:scale-[0.97] ${
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
