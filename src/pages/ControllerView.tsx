import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useRealtime, type RoomPlayer, type PlayerInput } from '@/contexts/RealtimeContext';
import VirtualJoystick from '@/components/VirtualJoystick';
import ActionButton from '@/components/ActionButton';
import { playCountdownBeep, playReady } from '@/games/SoundFX';
import type { RealtimeChannel } from '@supabase/supabase-js';

const BUTTON_B_LABELS: Record<string, string> = {
  'bomb-pass': 'DASH',
  'nitro-race': 'NITRO ⚡',
  'apex-arena': 'FIRE 🔫',
  'prop-hunt': 'HIDE',
  'siege-battle': 'AIM',
};

export default function ControllerView() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const { joinRoom, sendInput, sendReady, leaveRoom } = useRealtime();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [connected, setConnected] = useState(false);
  const [playerInfo, setPlayerInfo] = useState<RoomPlayer | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameId, setGameId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
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
        setCountdown(null);
      },
      onGameEvent: () => {},
      onGameOver: () => {
        setGameStarted(false);
        setGameId(null);
        setIsReady(false);
      },
      onCountdown: (count) => {
        setCountdown(count);
        playCountdownBeep(count === 0);
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

  const handleReady = () => {
    const newReady = !isReady;
    setIsReady(newReady);
    playReady();
    if (channelRef.current && playerInfo) {
      sendReady(channelRef.current, playerInfo.id, newReady);
    }
  };

  const buttonBLabel = gameId ? (BUTTON_B_LABELS[gameId] || 'B') : 'B';

  if (!connected) {
    return (
      <div className="h-screen bg-background flex items-center justify-center px-6">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-muted-foreground font-mono">Connecting to room {roomCode}...</p>
        </div>
      </div>
    );
  }

  // Pre-game lobby state on controller
  if (!gameStarted) {
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
            <div className="w-1.5 h-1.5 rounded-full bg-success" />
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
            <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center text-3xl font-heading font-bold text-background"
              style={{ backgroundColor: playerInfo?.color }}
            >
              P{(playerInfo?.index ?? 0) + 1}
            </div>
            <div>
              <h2 className="font-heading text-lg font-semibold text-foreground">{playerInfo?.name}</h2>
              <p className="text-xs text-muted-foreground font-mono mt-1">Waiting in lobby</p>
            </div>
            <button
              onClick={handleReady}
              className={`w-full py-4 rounded-lg font-heading font-semibold text-lg transition-all duration-150 ${
                isReady
                  ? 'bg-success text-background'
                  : 'bg-primary text-primary-foreground'
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
          <div className="w-1.5 h-1.5 rounded-full bg-success" />
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
        <VirtualJoystick onMove={handleJoystick} size={130} />

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
