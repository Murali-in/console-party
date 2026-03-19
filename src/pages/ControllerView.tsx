import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useRealtime, type RoomPlayer, type PlayerInput } from '@/contexts/RealtimeContext';
import VirtualJoystick from '@/components/VirtualJoystick';
import ActionButton from '@/components/ActionButton';
import { playCountdownBeep, playReady } from '@/games/SoundFX';
import { requestWakeLock, releaseWakeLock } from '@/lib/wakeLock';
import type { RealtimeChannel } from '@supabase/supabase-js';

import ControllerLobby from '@/components/controller/ControllerLobby';
import ControllerGamepad from '@/components/controller/ControllerGamepad';

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
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'reconnecting'>('connecting');
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

    // Request wake lock to prevent screen sleep
    requestWakeLock();

    // Restore from sessionStorage for reconnection
    const savedName = sessionStorage.getItem(`player-name-${roomCode}`);
    const playerName = savedName || `Player ${Math.floor(Math.random() * 1000)}`;
    if (!savedName) sessionStorage.setItem(`player-name-${roomCode}`, playerName);

    const channel = joinRoom(roomCode, playerName, {
      onPlayerJoined: (p) => {
        const me = p.find(pl => pl.name === playerName);
        if (me) {
          setPlayerInfo(me);
          inputRef.current.playerId = me.id;
          inputRef.current.playerIndex = me.index;
          setConnected(true);
          setConnectionStatus('connected');
          sessionStorage.setItem(`player-id-${roomCode}`, me.id);
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

    // Online/offline handlers for reconnection awareness
    const handleOffline = () => setConnectionStatus('reconnecting');
    const handleOnline = () => setConnectionStatus('connected');
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      if (channelRef.current) leaveRoom(channelRef.current);
      releaseWakeLock();
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
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

  if (!gameStarted) {
    return (
      <ControllerLobby
        roomCode={roomCode!}
        playerInfo={playerInfo}
        isReady={isReady}
        countdown={countdown}
        connectionStatus={connectionStatus}
        onReady={handleReady}
      />
    );
  }

  return (
    <ControllerGamepad
      roomCode={roomCode!}
      playerInfo={playerInfo}
      gameId={gameId}
      connectionStatus={connectionStatus}
      inputRef={inputRef}
      emitInput={emitInput}
      onJoystickMove={handleJoystick}
    />
  );
}
