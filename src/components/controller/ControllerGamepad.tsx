import type { MutableRefObject } from 'react';
import type { RoomPlayer, PlayerInput } from '@/contexts/RealtimeContext';
import DPad from '@/components/DPad';
import FaceButtons from '@/components/FaceButtons';
import ConnectionBadge from './ConnectionBadge';

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
  const handleDPad = (state: { up: boolean; down: boolean; left: boolean; right: boolean }) => {
    let x = 0, y = 0;
    if (state.left) x = -1;
    if (state.right) x = 1;
    if (state.up) y = -1;
    if (state.down) y = 1;
    // Normalize diagonal
    if (x !== 0 && y !== 0) {
      x *= 0.707;
      y *= 0.707;
    }
    onJoystickMove({ x, y });
  };

  const handleBtn = (btn: string, pressed: boolean) => {
    if (btn === 'A') inputRef.current.buttonA = pressed;
    if (btn === 'B') inputRef.current.buttonB = pressed;
    // X and Y can map to buttonA/B combos or be extended later
    emitInput();
  };

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
            {gameId.replace(/-/g, ' ')}
          </span>
        </div>
      )}

      {/* Controller area */}
      <div className="flex-1 flex items-center justify-between px-6">
        <DPad onInput={handleDPad} size={140} />
        <FaceButtons onPress={handleBtn} gameId={gameId} />
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
