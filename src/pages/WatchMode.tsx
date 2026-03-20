import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { startGame, destroyGame, updateInput } from '@/games/GameManager';
import BrandLogo from '@/components/BrandLogo';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface WatchState {
  gameId: string;
  players: { id: string; name: string; index: number; color: string }[];
  started: boolean;
}

export default function WatchMode() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [state, setState] = useState<WatchState | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState('');
  const [scores, setScores] = useState<Record<string, number>>({});
  const gameStartedRef = useRef(false);

  useEffect(() => {
    if (!roomCode) return;

    const channel = supabase.channel(`room:${roomCode}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on('broadcast', { event: 'player-accepted' }, ({ payload }) => {
        setState(prev => ({
          gameId: prev?.gameId || '',
          players: payload.players,
          started: prev?.started || false,
        }));
      })
      .on('broadcast', { event: 'game-started' }, ({ payload }) => {
        setState({
          gameId: payload.gameId,
          players: payload.players,
          started: true,
        });
      })
      .on('broadcast', { event: 'player-input' }, ({ payload }) => {
        updateInput(payload);
      })
      .on('broadcast', { event: 'game-over' }, ({ payload }) => {
        setGameOver(true);
        setWinner(payload.winner);
        setScores(payload.scores);
      })
      .on('broadcast', { event: 'countdown' }, () => {})
      .subscribe();

    channelRef.current = channel;

    return () => {
      destroyGame();
      supabase.removeChannel(channel);
    };
  }, [roomCode]);

  // Start the Phaser game when state.started becomes true
  useEffect(() => {
    if (!state?.started || !state.gameId || gameStartedRef.current) return;
    gameStartedRef.current = true;
    setGameOver(false);
    setWinner('');
    setScores({});

    const timer = setTimeout(() => {
      startGame({
        gameId: state.gameId,
        containerId: 'watch-game-container',
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
      destroyGame();
      gameStartedRef.current = false;
    };
  }, [state?.started, state?.gameId]);

  return (
    <div className="h-screen w-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <BrandLogo compact size="sm" />
        <span className="font-mono text-xs text-muted-foreground">
          👁 Spectator · Room {roomCode}
        </span>
        <div className="flex items-center gap-2">
          {state?.players.map(p => (
            <div key={p.id} className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
              <span className="text-[10px] font-mono text-muted-foreground">{p.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Game area */}
      <div className="flex-1 relative">
        {!state?.started ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4 px-8">
              <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <h2 className="font-heading text-lg font-semibold text-foreground">Waiting for game to start</h2>
              <p className="text-xs text-muted-foreground font-mono max-w-xs">
                You're spectating room {roomCode}. The game will appear here once the host starts it.
              </p>
              {state?.players && state.players.length > 0 && (
                <div className="space-y-1 pt-2">
                  <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Players in room</p>
                  {state.players.map(p => (
                    <p key={p.id} className="text-xs text-foreground font-mono flex items-center justify-center gap-2">
                      <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: p.color }} />
                      {p.name}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            <div id="watch-game-container" className="w-full h-full" />
            {gameOver && (
              <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-50">
                <div className="text-center space-y-3 p-8">
                  <h2 className="font-heading text-3xl font-bold text-foreground">{winner} wins!</h2>
                  <div className="space-y-1">
                    {Object.entries(scores).map(([name, score]) => (
                      <p key={name} className="font-mono text-sm text-muted-foreground">{name}: {score}</p>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground font-mono">Spectator mode — waiting for next game</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
