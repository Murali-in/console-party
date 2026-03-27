import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useRealtime, type PlayerInput, type RoomPlayer } from '@/contexts/RealtimeContext';
import { playCountdownBeep, playReady } from '@/games/SoundFX';
import { requestWakeLock, releaseWakeLock } from '@/lib/wakeLock';
import type { RealtimeChannel } from '@supabase/supabase-js';
import ControllerLobby from '@/components/controller/ControllerLobby';
import ControllerGamepad from '@/components/controller/ControllerGamepad';

type GamePhase = 'playing' | 'paused' | 'gameover' | 'waiting';

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
  const [connectionTimedOut, setConnectionTimedOut] = useState(false);
  const [gamePhase, setGamePhase] = useState<GamePhase>('playing');
  const [winner, setWinner] = useState('');
  const [scores, setScores] = useState<Record<string, number>>({});
  const inputRef = useRef<PlayerInput>({
    playerId: '',
    playerIndex: 0,
    x: 0,
    y: 0,
    buttonA: false,
    buttonB: false,
  });

  // Connection timeout
  useEffect(() => {
    if (connected) return;
    const timer = setTimeout(() => setConnectionTimedOut(true), 15000);
    return () => clearTimeout(timer);
  }, [connected]);

  useEffect(() => {
    if (!roomCode) return;

    requestWakeLock();

    const params = new URLSearchParams(window.location.search);
    const requestedName = params.get('name')?.trim();
    const nameKey = `player-name-${roomCode}`;
    const idKey = `player-id-${roomCode}`;
    const savedName = sessionStorage.getItem(nameKey);
    const playerName = (requestedName || savedName || 'Player').slice(0, 20);
    const playerId = sessionStorage.getItem(idKey) || crypto.randomUUID();

    sessionStorage.setItem(nameKey, playerName);
    sessionStorage.setItem(idKey, playerId);

    const channel = joinRoom(
      roomCode,
      playerName,
      {
        onPlayerJoined: (players) => {
          const me = players.find((player) => player.id === playerId);
          if (me) {
            setPlayerInfo(me);
            inputRef.current.playerId = me.id;
            inputRef.current.playerIndex = me.index;
            setConnected(true);
            setConnectionStatus('connected');
            return;
          }

          setPlayerInfo((current) => {
            if (!current) return current;
            return players.find((player) => player.id === current.id) ?? current;
          });
        },
        onGameStarted: (gid) => {
          setGameStarted(true);
          setGameId(gid);
          setCountdown(null);
          setGamePhase('playing');
        },
        onGameEvent: () => {},
        onGameOver: (w, s) => {
          setGamePhase('gameover');
          setWinner(w ? `${w} wins!` : 'Game Over');
          setScores(s || {});
          // After 3 seconds, switch to waiting phase
          setTimeout(() => {
            setGamePhase('waiting');
            // After another 3 seconds, go back to lobby
            setTimeout(() => {
              setGameStarted(false);
              setGameId(null);
              setIsReady(false);
              setGamePhase('playing');
            }, 3000);
          }, 3000);
        },
        onCountdown: (count) => {
          setCountdown(count);
          playCountdownBeep(count === 0);
        },
      },
      playerId,
    );

    channelRef.current = channel;

    const handleOffline = () => setConnectionStatus('reconnecting');
    const handleOnline = () => setConnectionStatus('connected');
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      if (channelRef.current) {
        leaveRoom(channelRef.current, inputRef.current.playerId || playerId);
      }
      releaseWakeLock();
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [joinRoom, leaveRoom, roomCode]);

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
      <div className="flex h-screen items-center justify-center bg-background px-6">
        <div className="space-y-4 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="font-mono text-xs text-muted-foreground">Connecting to room {roomCode}...</p>
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
        onCharacterUpdate={(character) => {
          if (playerInfo) {
            setPlayerInfo({ ...playerInfo, name: character.displayName, color: character.color });
          }
        }}
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
      gamePhase={gamePhase}
      winner={winner}
      scores={scores}
    />
  );
}
