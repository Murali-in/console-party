import type { MutableRefObject } from 'react';
import type { RoomPlayer, PlayerInput } from '@/contexts/RealtimeContext';
import VirtualJoystick from '@/components/VirtualJoystick';
import ActionButton from '@/components/ActionButton';
import ConnectionBadge from './ConnectionBadge';

const BUTTON_B_LABELS: Record<string, string> = {
  'bomb-pass': 'DASH',
  'nitro-race': 'NITRO',
  'apex-arena': 'FIRE',
  'prop-hunt': 'HIDE',
  'siege-battle': 'AIM',
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
    <div className="h-screen bg-background flex flex-col overflow-hidden touch-none select-none">
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
        {gameId && (
          <span className="text-[10px] text-primary font-mono uppercase">
            {gameId.replace('-', ' ')}
          </span>
        )}
      </div>

      {/* Controller area */}
      <div className="flex-1 flex items-center justify-between px-8 py-6">
        <VirtualJoystick onMove={onJoystickMove} size={130} />

        <div className="flex flex-col items-center gap-4">
          <ActionButton
            label="A"
            size={72}
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

      <div className="flex items-center justify-center gap-6 pb-6">
        <button className="px-4 py-1.5 text-[10px] text-muted-foreground border border-border rounded-lg font-mono">
          SELECT
        </button>
        <button className="px-4 py-1.5 text-[10px] text-muted-foreground border border-border rounded-lg font-mono">
          START
        </button>
      </div>
    </div>
  );
}
