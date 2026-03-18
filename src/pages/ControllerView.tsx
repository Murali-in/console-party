import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useRealtime, type RoomPlayer, type PlayerInput } from '@/contexts/RealtimeContext';
import VirtualJoystick from '@/components/VirtualJoystick';
import ActionButton from '@/components/ActionButton';
import type { RealtimeChannel } from '@supabase/supabase-js';

export default function ControllerView() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const { joinRoom, sendInput, leaveRoom } = useRealtime();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [connected, setConnected] = useState(false);
  const [playerInfo, setPlayerInfo] = useState<RoomPlayer | null>(null);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameId, setGameId] = useState<string | null>(null);
  const inputRef = useRef<PlayerInput>({
    playerId: '',
    playerIndex: 0,
    x: 0,
    y: 0,
    buttonA: false,
    buttonB: false,
  });

  useEffect(() => {
    if (!roomCode) return;

    const playerName = `Player ${Math.floor(Math.random() * 1000)}`;

    const channel = joinRoom(roomCode, playerName, {
      onPlayerJoined: (p) => {
        setPlayers(p);
        const me = p.find(pl => pl.name === playerName);
        if (me) {
          setPlayerInfo(me);
          inputRef.current.playerId = me.id;
          inputRef.current.playerIndex = me.index;
          setConnected(true);
        }
      },
      onGameStarted: (gid) => {
        setGameStarted(true);
        setGameId(gid);
      },
      onGameEvent: () => {},
      onGameOver: () => {
        setGameStarted(false);
        setGameId(null);
      },
    });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) leaveRoom(channelRef.current);
    };
  }, [roomCode]);

  const emitInput = useCallback(() => {
    if (channelRef.current) {
      sendInput(channelRef.current, { ...inputRef.current });
    }
  }, [sendInput]);

  const handleJoystick = useCallback(({ x, y }: { x: number; y: number }) => {
    inputRef.current.x = x;
    inputRef.current.y = y;
    emitInput();
  }, [emitInput]);

  if (!connected) {
    return (
      <div className="h-screen bg-background flex items-center justify-center px-6">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Connecting to room {roomCode}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden touch-none select-none">
      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-success" />
          <span className="text-xs text-muted-foreground font-mono">Room {roomCode}</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: playerInfo?.color }}
          />
          <span className="text-xs text-foreground font-medium">{playerInfo?.name}</span>
        </div>
        {gameStarted && (
          <span className="text-xs text-primary font-mono">{gameId}</span>
        )}
      </div>

      {/* Controller area */}
      <div className="flex-1 flex items-center justify-between px-8 py-6">
        {/* Joystick left */}
        <VirtualJoystick onMove={handleJoystick} size={140} />

        {/* Buttons right */}
        <div className="flex flex-col items-center gap-4">
          <ActionButton
            label="A"
            size={72}
            variant="primary"
            onPress={() => { inputRef.current.buttonA = true; emitInput(); }}
            onRelease={() => { inputRef.current.buttonA = false; emitInput(); }}
          />
          <ActionButton
            label="B"
            size={56}
            variant="secondary"
            onPress={() => { inputRef.current.buttonB = true; emitInput(); }}
            onRelease={() => { inputRef.current.buttonB = false; emitInput(); }}
          />
        </div>
      </div>

      {/* Bottom buttons */}
      <div className="flex items-center justify-center gap-6 pb-6">
        <button className="px-4 py-1.5 text-xs text-muted-foreground border border-border rounded font-mono">
          SELECT
        </button>
        <button className="px-4 py-1.5 text-xs text-muted-foreground border border-border rounded font-mono">
          START
        </button>
      </div>
    </div>
  );
}
