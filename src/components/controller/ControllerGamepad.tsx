import type { MutableRefObject } from 'react';
import type { RoomPlayer, PlayerInput } from '@/contexts/RealtimeContext';
import VirtualJoystick from '@/components/VirtualJoystick';
import ActionButton from '@/components/ActionButton';
import ConnectionBadge from './ConnectionBadge';

const BUTTON_B_LABELS: Record<string, string> = {
  'bomb-arena': 'DASH',
  'nitro-race': 'NITRO',
  'apex-arena': 'FIRE',
  'pong': 'LUNGE',
  'tank-battle': 'AIM',
  'snake-battle': 'SPEED',
};

interface ControllerGamepadProps {
  roomCode: string;
  playerInfo: RoomPlayer | null;
  gameId: string | null;
  connectionStatus: 'connecting' | 'connected' | 'reconnecting';
  inputRef: MutableRefObject<PlayerInput>;
  emitInput: () => void;
  onJoystickMove: (pos: { x: number; y: number }) => void;
}

export default function ControllerGamepad({
  roomCode,
  playerInfo,
  gameId,
  connectionStatus,
  inputRef,
  emitInput,
  onJoystickMove,
}: ControllerGamepadProps) {
  const buttonBLabel = gameId ? (BUTTON_B_LABELS[gameId] || 'B') : 'B';

  return (
    <div className="h-[100dvh] bg-background flex flex-col overflow-hidden touch-none select-none">
      {/* Status bar */}
      <div className="flex items-center justify-between px-4 border-b border-border h-12 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-primary font-heading font-bold text-xs">∞</span>
          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: playerInfo?.color }} />
          <span className="text-xs text-foreground font-heading font-medium truncate max-w-[80px]">{playerInfo?.name}</span>
        </div>
        <div className="flex items-center gap-3">
          <ConnectionBadge status={connectionStatus} />
          <span className="text-[10px] text-muted-foreground font-mono">ROOM {roomCode}</span>
        </div>
      </div>

      {/* Game name */}
      {gameId && (
        <div className="text-center py-1 shrink-0">
          <span className="text-[10px] text-primary font-mono uppercase tracking-wider">
            {gameId.replace('-', ' ')}
          </span>
        </div>
      )}

      {/* Controller area */}
      <div className="flex-1 flex items-center justify-between px-6">
        <VirtualJoystick onMove={onJoystickMove} size={130} />

        <div className="flex flex-col items-center gap-4">
          <ActionButton
            label="A"
            size={70}
            variant="primary"
            onPress={() => { inputRef.current.buttonA = true; emitInput(); }}
            onRelease={() => { inputRef.current.buttonA = false; emitInput(); }}
          />
          <ActionButton
            label={buttonBLabel}
            size={56}
            variant="secondary"
            onPress={() => { inputRef.current.buttonB = true; emitInput(); }}
            onRelease={() => { inputRef.current.buttonB = false; emitInput(); }}
          />
        </div>
      </div>

      {/* Bottom bar */}
      <div className="flex items-center justify-center gap-6 pb-4 shrink-0">
        <button className="px-5 py-1.5 text-[10px] text-muted-foreground border border-border rounded-lg font-mono h-8">
          SELECT
        </button>
        <button className="px-5 py-1.5 text-[10px] text-muted-foreground border border-border rounded-lg font-mono h-8">
          START
        </button>
      </div>
    </div>
  );
}
