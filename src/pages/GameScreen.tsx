import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRealtime } from '@/contexts/RealtimeContext';
import { startGame, destroyGame, updateInput, inputMap } from '@/games/GameManager';
import { startMusic, stopMusic, toggleMute, getIsMuted } from '@/games/MusicManager';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface LocationState {
  gameId: string;
  players: { id: string; name: string; index: number; color: string }[];
  roomCode: string;
  demo?: boolean;
  soloPhone?: boolean;
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
  const [soloControllerUrl, setSoloControllerUrl] = useState('');
  const [muted, setMuted] = useState(getIsMuted());
  const scoresSavedRef = useRef(false);

  const stateStr = sessionStorage.getItem(`game-${roomCode}`);
  const state: LocationState | null = stateStr ? JSON.parse(stateStr) : null;

  const saveScores = useCallback(async (gameId: string, rc: string, w: string, s: Record<string, number>) => {
    if (scoresSavedRef.current) return;
    scoresSavedRef.current = true;
    const entries = Object.entries(s).map(([name, score]) => ({
      game_id: gameId,
      player_name: name,
      score,
      is_winner: name === w,
      room_code: rc,
    }));
    await supabase.from('leaderboards').insert(entries);
  }, []);

  const handleToggleMute = () => {
    const nowMuted = toggleMute();
    setMuted(nowMuted);
  };

  useEffect(() => {
    if (!roomCode || !state) {
      navigate('/play/host');
      return;
    }

    // Start background music
    startMusic();

    const onGameOver = (w: string, s: Record<string, number>) => {
      setGameOver(true);
      setWinner(w);
      setScores(s);
      stopMusic();
      saveScores(state.gameId, roomCode, w, s);
    };

    // Solo phone-controller mode
    if (state.soloPhone) {
      const p1Id = state.players[0]?.id;
      const controllerUrl = `${window.location.origin}/play/controller/${roomCode}?name=${encodeURIComponent(state.players[0]?.name || 'Player')}&solo=1`;
      setSoloControllerUrl(controllerUrl);

      const channel = hostRoom(roomCode, {
        onPlayerJoined: () => {},
        onPlayerLeft: () => {},
        onInputUpdate: (input) => {
          updateInput({ ...input, playerId: p1Id, playerIndex: 0 });
        },
      });
      channelRef.current = channel;

      // CPU AI loop for player 2
      const cpuLoop = setInterval(() => {
        const p2Id = state.players[1]?.id;
        if (!p2Id) return;
        const t = Date.now() / 1000;
        let cx = 0, cy = 0, ba = false, bb = false;
        switch (state.gameId) {
          case 'snake-battle': { const phase = Math.floor(t * 0.8) % 4; cx = [1, 0, -1, 0][phase]; cy = [0, 1, 0, -1][phase]; break; }
          case 'pong': cy = Math.sin(t * 2) * 0.5; break;
          case 'nitro-race': cy = -0.8; cx = Math.sin(t * 0.6) * 0.7; break;
          case 'tank-battle': cx = Math.sin(t * 0.5) * 0.6; cy = Math.cos(t * 0.4) * -0.5; ba = Math.sin(t * 2.5) > 0.5; break;
          case 'platform-fighter': cx = Math.sin(t * 0.8) * 0.7; ba = Math.sin(t * 2) > 0.3; bb = Math.sin(t * 1.2) > 0.8; break;
          case 'maze-runner': cx = Math.sin(t * 0.5); cy = Math.cos(t * 0.4); break;
          case 'trivia-clash': if (Math.sin(t * 0.3) > 0.7) cy = -1; break;
          default: cx = Math.sin(t * 0.7) * 0.6; cy = Math.cos(t * 0.5) * 0.6; ba = Math.sin(t * 3) > 0.7;
        }
        updateInput({ playerId: p2Id, playerIndex: 1, x: cx, y: cy, buttonA: ba, buttonB: bb });
      }, 16);

      const timer = setTimeout(() => {
        startGame({ gameId: state.gameId, containerId: 'game-container', players: state.players, onGameOver }).catch(console.error);
      }, 300);

      return () => { clearTimeout(timer); clearInterval(cpuLoop); destroyGame(); stopMusic(); if (channelRef.current) leaveRoom(channelRef.current); };
    }

    // Demo mode: keyboard controls
    if (state.demo) {
      const onKeyDown = (e: KeyboardEvent) => keysRef.current.add(e.key.toLowerCase());
      const onKeyUp = (e: KeyboardEvent) => keysRef.current.delete(e.key.toLowerCase());
      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);

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
          updateInput({ playerId: p1Id, playerIndex: 0, x, y, buttonA: keys.has(' ') || keys.has('j'), buttonB: keys.has('shift') || keys.has('k') });
        }
        if (p2Id) {
          const t = Date.now() / 1000;
          let cx = 0, cy = 0, ba = false, bb = false;
          switch (state.gameId) {
            case 'snake-battle': { const p = Math.floor(t * 0.8) % 4; cx = [1, 0, -1, 0][p]; cy = [0, 1, 0, -1][p]; break; }
            case 'pong': cy = Math.sin(t * 2) * 0.5; break;
            case 'nitro-race': cy = -0.8; cx = Math.sin(t * 0.6) * 0.7; bb = Math.sin(t * 2) > 0.95; break;
            case 'tank-battle': cx = Math.sin(t * 0.5) * 0.6; cy = Math.cos(t * 0.4) * -0.5; ba = Math.sin(t * 2.5) > 0.5; break;
            case 'platform-fighter': cx = Math.sin(t * 0.8) * 0.7; ba = Math.sin(t * 2) > 0.3; bb = Math.sin(t * 1.2) > 0.8; break;
            case 'maze-runner': cx = Math.sin(t * 0.5); cy = Math.cos(t * 0.4); break;
            case 'trivia-clash': if (Math.sin(t * 0.3) > 0.7) cy = -1; break;
            default: cx = Math.sin(t * 0.7) * 0.6; cy = Math.cos(t * 0.5) * 0.6; ba = Math.sin(t * 3) > 0.7;
          }
          updateInput({ playerId: p2Id, playerIndex: 1, x: cx, y: cy, buttonA: ba, buttonB: bb });
        }
      }, 16);

      const timer = setTimeout(() => {
        startGame({ gameId: state.gameId, containerId: 'game-container', players: state.players, onGameOver }).catch(console.error);
      }, 300);

      return () => { clearTimeout(timer); clearInterval(inputLoop); destroyGame(); stopMusic(); window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); };
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
        gameId: state.gameId, containerId: 'game-container', players: state.players,
        onGameOver: (w, s) => {
          onGameOver(w, s);
          channel?.send({ type: 'broadcast', event: 'game-over', payload: { winner: w, scores: s } });
        },
      }).catch(console.error);
    }, 300);

    return () => { clearTimeout(timer); destroyGame(); stopMusic(); if (channelRef.current) leaveRoom(channelRef.current); };
  }, [roomCode]);

  const handleBackToLobby = () => {
    sessionStorage.removeItem(`game-${roomCode}`);
    navigate('/play/host');
  };

  if (!state) return null;

  return (
    <div className="h-screen w-screen bg-background flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <span className="font-mono text-xs text-muted-foreground">
          {state.demo ? 'Demo · Keyboard' : state.soloPhone ? 'Solo · Phone' : `Room ${roomCode}`} · {state.players.length}P
        </span>
        <span className="font-heading text-sm font-semibold text-foreground">
          {state.gameId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
        </span>
        <div className="flex items-center gap-3">
          <button
            onClick={handleToggleMute}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors font-mono flex items-center gap-1"
            title={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? '🔇' : '🔊'}
          </button>
          <button onClick={handleBackToLobby} className="text-xs text-muted-foreground hover:text-foreground transition-colors font-mono">
            ← Back
          </button>
        </div>
      </div>

      {state.soloPhone && !gameOver && soloControllerUrl && (
        <div className="flex items-center justify-center gap-4 py-1.5 border-b border-border bg-card">
          <span className="text-[10px] font-mono text-muted-foreground">
            Open on your phone: <span className="text-foreground font-semibold">{window.location.origin}/play?code={roomCode}</span>
          </span>
        </div>
      )}

      {state.demo && !gameOver && (
        <div className="flex items-center justify-center gap-4 py-1.5 border-b border-border bg-card">
          <span className="text-[10px] font-mono text-muted-foreground">WASD: Move</span>
          <span className="text-[10px] font-mono text-muted-foreground">Space/J: Action</span>
          <span className="text-[10px] font-mono text-muted-foreground">Shift/K: Special</span>
        </div>
      )}

      <div className="flex-1 relative">
        <div id="game-container" className="w-full h-full" />
        {gameOver && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-50">
            <div className="text-center space-y-4 p-8">
              <h2 className="font-heading text-3xl font-bold text-foreground">{winner} wins!</h2>
              <div className="space-y-1">
                {Object.entries(scores).map(([name, score]) => (
                  <p key={name} className="font-mono text-sm text-muted-foreground">{name}: {score}</p>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground font-mono">Scores saved to leaderboard</p>
              <button onClick={handleBackToLobby} className="bg-primary text-primary-foreground font-medium px-6 py-2 rounded-lg text-sm hover:opacity-90 transition-opacity">
                Back to Lobby
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
