import { useState, type MutableRefObject } from 'react';
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
  gamePhase?: 'playing' | 'paused' | 'gameover' | 'waiting';
  winner?: string;
  scores?: Record<string, number>;
}

export default function ControllerGamepad({
  roomCode,
  playerInfo,
  gameId,
  connectionStatus,
  inputRef,
  emitInput,
  onJoystickMove,
  gamePhase = 'playing',
  winner,
  scores,
}: ControllerGamepadProps) {
  const [selectPressed, setSelectPressed] = useState(false);
  const [startPressed, setStartPressed] = useState(false);

  const handleDPad = (state: { up: boolean; down: boolean; left: boolean; right: boolean }) => {
    let x = 0, y = 0;
    if (state.left) x = -1;
    if (state.right) x = 1;
    if (state.up) y = -1;
    if (state.down) y = 1;
    if (x !== 0 && y !== 0) { x *= 0.707; y *= 0.707; }
    onJoystickMove({ x, y });
  };

  const handleBtn = (btn: string, pressed: boolean) => {
    if (btn === 'A') inputRef.current.buttonA = pressed;
    if (btn === 'B') inputRef.current.buttonB = pressed;
    emitInput();
  };

  // Paused overlay
  if (gamePhase === 'paused') {
    return (
      <div className="h-[100dvh] bg-background flex flex-col items-center justify-center touch-none select-none">
        <div className="text-center space-y-4">
          <div className="font-heading text-4xl font-bold text-primary">⏸</div>
          <h2 className="font-heading text-xl font-bold text-foreground">PAUSED</h2>
          <p className="text-xs text-muted-foreground font-mono">Press SELECT to resume</p>
        </div>
      </div>
    );
  }

  // Game over overlay
  if (gamePhase === 'gameover') {
    return (
      <div className="h-[100dvh] bg-background flex flex-col items-center justify-center touch-none select-none">
        <div className="text-center space-y-4 px-8">
          <h2 className="font-heading text-2xl font-bold text-foreground">{winner || 'Game Over'}</h2>
          {scores && Object.keys(scores).length > 0 && (
            <div className="space-y-1">
              {Object.entries(scores).map(([name, score]) => (
                <p key={name} className="font-mono text-sm text-muted-foreground">{name}: {score}</p>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground font-mono mt-4">Waiting for next game...</p>
        </div>
      </div>
    );
  }

  // Waiting for host overlay
  if (gamePhase === 'waiting') {
    return (
      <div className="h-[100dvh] bg-background flex flex-col items-center justify-center touch-none select-none">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <h2 className="font-heading text-lg font-semibold text-foreground">Host is selecting next game...</h2>
          <p className="text-xs text-muted-foreground font-mono">Stay connected. Players remain in room.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] bg-background flex flex-col overflow-hidden touch-none select-none">
      {/* Status bar - 48px */}
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

      {/* Game name strip - 28px */}
      {gameId && (
        <div className="text-center py-1 shrink-0 border-b border-border">
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

      {/* Bottom bar - SELECT + START - 40px */}
      <div className="flex items-center justify-center gap-6 pb-4 pt-2 shrink-0">
        <button
          onTouchStart={(e) => { e.preventDefault(); setSelectPressed(true); }}
          onTouchEnd={(e) => { e.preventDefault(); setSelectPressed(false); }}
          className={`px-5 py-1.5 text-[10px] border rounded-lg font-mono h-8 transition-all ${
            selectPressed
              ? 'bg-primary/20 border-primary text-primary'
              : 'text-muted-foreground border-border'
          }`}
          style={{ width: 80 }}
        >
          SELECT
        </button>
        <button
          onTouchStart={(e) => { e.preventDefault(); setStartPressed(true); }}
          onTouchEnd={(e) => { e.preventDefault(); setStartPressed(false); }}
          className={`px-5 py-1.5 text-[10px] border rounded-lg font-mono h-8 transition-all ${
            startPressed
              ? 'bg-primary/20 border-primary text-primary'
              : 'text-muted-foreground border-border'
          }`}
          style={{ width: 80 }}
        >
          START
        </button>
      </div>
    </div>
  );
}
