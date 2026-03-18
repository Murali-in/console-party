import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRealtime, type RoomPlayer } from '@/contexts/RealtimeContext';
import { startGame, destroyGame, updateInput } from '@/games/GameManager';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface LocationState {
  gameId: string;
  players: RoomPlayer[];
  roomCode: string;
}

export default function GameScreen() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const { hostRoom, sendGameEvent, leaveRoom } = useRealtime();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState('');
  const [scores, setScores] = useState<Record<string, number>>({});

  // Get state from sessionStorage (set by HostLobby before navigating)
  const stateStr = sessionStorage.getItem(`game-${roomCode}`);
  const state: LocationState | null = stateStr ? JSON.parse(stateStr) : null;

  useEffect(() => {
    if (!roomCode || !state) {
      navigate('/play/host');
      return;
    }

    const channel = hostRoom(roomCode, {
      onPlayerJoined: () => {},
      onPlayerLeft: () => {},
      onInputUpdate: (input) => {
        updateInput(input);
      },
    });
    channelRef.current = channel;

    // Small delay for DOM mount
    const timer = setTimeout(() => {
      startGame({
        gameId: state.gameId,
        containerId: 'game-container',
        players: state.players,
        onGameOver: (w, s) => {
          setGameOver(true);
          setWinner(w);
          setScores(s);
          if (channelRef.current) {
            channelRef.current.send({
              type: 'broadcast',
              event: 'game-over',
              payload: { winner: w, scores: s },
            });
          }
        },
      }).catch(console.error);
    }, 300);

    return () => {
      clearTimeout(timer);
      destroyGame();
      if (channelRef.current) leaveRoom(channelRef.current);
    };
  }, [roomCode]);

  const handleBackToLobby = () => {
    sessionStorage.removeItem(`game-${roomCode}`);
    navigate('/play/host');
  };

  if (!state) return null;

  return (
    <div className="h-screen w-screen bg-background flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <span className="font-mono text-xs text-muted-foreground">
          Room {roomCode} · {state.players.length} players
        </span>
        <span className="font-heading text-sm font-semibold text-foreground">
          {state.gameId.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}
        </span>
        <button
          onClick={handleBackToLobby}
          className="text-xs text-destructive hover:opacity-80 transition-opacity font-mono"
        >
          End Game
        </button>
      </div>

      {/* Game canvas */}
      <div className="flex-1 relative">
        <div id="game-container" className="w-full h-full" />

        {gameOver && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-50">
            <div className="text-center space-y-4 p-8">
              <h2 className="font-heading text-3xl font-bold text-primary">
                {winner} wins!
              </h2>
              <div className="space-y-1">
                {Object.entries(scores).map(([name, score]) => (
                  <p key={name} className="font-mono text-sm text-muted-foreground">
                    {name}: {score}
                  </p>
                ))}
              </div>
              <button
                onClick={handleBackToLobby}
                className="bg-primary text-primary-foreground font-medium px-6 py-2 rounded-lg text-sm hover:opacity-90 transition-opacity"
              >
                Back to Lobby
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
