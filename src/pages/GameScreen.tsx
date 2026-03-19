import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRealtime } from '@/contexts/RealtimeContext';
import { startGame, destroyGame, updateInput, inputMap } from '@/games/GameManager';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface LocationState {
  gameId: string;
  players: { id: string; name: string; index: number; color: string }[];
  roomCode: string;
  demo?: boolean;
}

export default function GameScreen() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const { hostRoom, leaveRoom } = useRealtime();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState('');
  const [scores, setScores] = useState<Record<string, number>>({});
  const keysRef = useRef<Set<string>>(new Set());

  const stateStr = sessionStorage.getItem(`game-${roomCode}`);
  const state: LocationState | null = stateStr ? JSON.parse(stateStr) : null;

  useEffect(() => {
    if (!roomCode || !state) {
      navigate('/play/host');
      return;
    }

    // Demo mode: keyboard controls for player 1 + CPU AI for player 2
    if (state.demo) {
      const onKeyDown = (e: KeyboardEvent) => keysRef.current.add(e.key.toLowerCase());
      const onKeyUp = (e: KeyboardEvent) => keysRef.current.delete(e.key.toLowerCase());
      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);

      // Input polling loop
      const inputLoop = setInterval(() => {
        const keys = keysRef.current;
        const p1Id = state.players[0]?.id;
        const p2Id = state.players[1]?.id;

        if (p1Id) {
          let x = 0, y = 0;
          if (keys.has('a') || keys.has('arrowleft')) x = -1;
          if (keys.has('d') || keys.has('arrowright')) x = 1;
          if (keys.has('w') || keys.has('arrowup')) y = -1;
          if (keys.has('s') || keys.has('arrowdown')) y = 1;
          const len = Math.sqrt(x * x + y * y);
          if (len > 1) { x /= len; y /= len; }

          updateInput({
            playerId: p1Id,
            playerIndex: 0,
            x, y,
            buttonA: keys.has(' ') || keys.has('j'),
            buttonB: keys.has('shift') || keys.has('k'),
          });
        }

        // Game-specific CPU AI for player 2
        if (p2Id) {
          const t = Date.now() / 1000;
          let cx = 0, cy = 0, ba = false, bb = false;

          if (state.gameId === 'snake-battle') {
            // Snake CPU: change direction periodically, avoid edges
            const phase = Math.floor(t * 0.8) % 4;
            if (phase === 0) { cx = 1; cy = 0; }
            else if (phase === 1) { cx = 0; cy = 1; }
            else if (phase === 2) { cx = -1; cy = 0; }
            else { cx = 0; cy = -1; }
          } else if (state.gameId === 'pong') {
            // Pong has built-in CPU, just provide minimal input
            cy = Math.sin(t * 2) * 0.5;
          } else if (state.gameId === 'nitro-race') {
            // Race: accelerate forward + slight steering
            cy = -0.8; // forward
            cx = Math.sin(t * 0.6) * 0.7;
            bb = Math.sin(t * 2) > 0.95; // nitro
          } else if (state.gameId === 'tank-battle') {
            // Tanks: move + shoot periodically
            cx = Math.sin(t * 0.5) * 0.6;
            cy = Math.cos(t * 0.4) * -0.5;
            ba = Math.sin(t * 2.5) > 0.5;
          } else {
            // Default: wander + occasional actions
            cx = Math.sin(t * 0.7) * 0.6;
            cy = Math.cos(t * 0.5) * 0.6;
            ba = Math.sin(t * 3) > 0.7;
            bb = Math.sin(t * 1.5) > 0.9;
          }

          updateInput({
            playerId: p2Id,
            playerIndex: 1,
            x: cx, y: cy,
            buttonA: ba,
            buttonB: bb,
          });
        }
      }, 16);

      const timer = setTimeout(() => {
        startGame({
          gameId: state.gameId,
          containerId: 'game-container',
          players: state.players,
          onGameOver: (w, s) => {
            setGameOver(true);
            setWinner(w);
            setScores(s);
          },
        }).catch(console.error);
      }, 300);

      return () => {
        clearTimeout(timer);
        clearInterval(inputLoop);
        destroyGame();
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
      };
    }

    // Normal multiplayer mode
    const channel = hostRoom(roomCode, {
      onPlayerJoined: () => {},
      onPlayerLeft: () => {},
      onInputUpdate: (input) => updateInput(input),
    });
    channelRef.current = channel;

    const timer = setTimeout(() => {
      startGame({
        gameId: state.gameId,
        containerId: 'game-container',
        players: state.players,
        onGameOver: (w, s) => {
          setGameOver(true);
          setWinner(w);
          setScores(s);
          channel?.send({
            type: 'broadcast',
            event: 'game-over',
            payload: { winner: w, scores: s },
          });
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
          {state.demo ? 'Demo Mode' : `Room ${roomCode}`} · {state.players.length} players
        </span>
        <span className="font-heading text-sm font-semibold text-foreground">
          {state.gameId.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}
        </span>
        <button
          onClick={handleBackToLobby}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors font-mono"
        >
          ← Back
        </button>
      </div>

      {/* Demo controls hint */}
      {state.demo && !gameOver && (
        <div className="flex items-center justify-center gap-4 py-1.5 border-b border-border bg-card">
          <span className="text-[10px] font-mono text-muted-foreground">WASD/Arrows: Move</span>
          <span className="text-[10px] font-mono text-muted-foreground">Space/J: Action</span>
          <span className="text-[10px] font-mono text-muted-foreground">Shift/K: Special</span>
        </div>
      )}

      {/* Game canvas */}
      <div className="flex-1 relative">
        <div id="game-container" className="w-full h-full" />

        {gameOver && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-50">
            <div className="text-center space-y-4 p-8">
              <h2 className="font-heading text-3xl font-bold text-foreground">
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
