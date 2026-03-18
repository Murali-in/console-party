import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRealtime, type RoomPlayer } from '@/contexts/RealtimeContext';
import QRDisplay from '@/components/QRDisplay';
import PlayerSlot from '@/components/PlayerSlot';
import Navbar from '@/components/Navbar';
import { playCountdownBeep, playReady } from '@/games/SoundFX';
import type { RealtimeChannel } from '@supabase/supabase-js';

const BUILT_IN_GAMES = [
  { id: 'bomb-pass', title: 'Bomb Pass', genre: 'Party', minPlayers: 2, maxPlayers: 4, gameType: 'official' as const, desc: 'Hot potato meets battle royale. Pass the bomb before it explodes!' },
  { id: 'nitro-race', title: 'Nitro Race', genre: 'Racing', minPlayers: 2, maxPlayers: 4, gameType: 'official' as const, desc: 'Top-down arcade racing with nitro boosts. 3 laps to victory.' },
  { id: 'apex-arena', title: 'Apex Arena', genre: 'Shooter', minPlayers: 2, maxPlayers: 4, gameType: 'official' as const, desc: 'Top-down arena shooter. First to 10 kills wins.' },
  { id: 'prop-hunt', title: 'Prop Hunt', genre: 'Party', minPlayers: 2, maxPlayers: 4, gameType: 'official' as const, desc: 'Hide as objects, seek and destroy. Classic hide & seek.' },
  { id: 'siege-battle', title: 'Siege Battle', genre: 'Strategy', minPlayers: 2, maxPlayers: 2, gameType: 'official' as const, desc: 'Physics-based siege warfare. Destroy the enemy tower.' },
];

const COVER_CLASSES: Record<string, string> = {
  'bomb-pass': 'cover-bomb-pass',
  'nitro-race': 'cover-nitro-race',
  'apex-arena': 'cover-apex-arena',
  'prop-hunt': 'cover-prop-hunt',
  'siege-battle': 'cover-siege-battle',
};

export default function HostLobby() {
  const navigate = useNavigate();
  const { createRoom, hostRoom } = useRealtime();
  const [roomCode, setRoomCode] = useState('');
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const code = createRoom();
    setRoomCode(code);

    const channel = hostRoom(code, {
      onPlayerJoined: (p) => setPlayers([...p]),
      onPlayerLeft: () => {},
      onInputUpdate: () => {},
      onPlayerReady: (_pid, _ready) => {
        playReady();
      },
    });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) channelRef.current.unsubscribe();
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const allReady = players.length >= 2 && players.every(p => p.ready);

  const handleStartGame = useCallback(() => {
    if (!selectedGame || !allReady) return;

    // Start 3-2-1 countdown
    setCountdown(3);
    playCountdownBeep(false);

    // Broadcast countdown to controllers
    channelRef.current?.send({
      type: 'broadcast',
      event: 'countdown',
      payload: { count: 3 },
    });

    let count = 3;
    countdownRef.current = setInterval(() => {
      count--;
      if (count > 0) {
        setCountdown(count);
        playCountdownBeep(false);
        channelRef.current?.send({
          type: 'broadcast',
          event: 'countdown',
          payload: { count },
        });
      } else {
        // GO!
        setCountdown(0);
        playCountdownBeep(true);
        channelRef.current?.send({
          type: 'broadcast',
          event: 'countdown',
          payload: { count: 0 },
        });

        if (countdownRef.current) clearInterval(countdownRef.current);

        // Store game state and navigate
        sessionStorage.setItem(`game-${roomCode}`, JSON.stringify({
          gameId: selectedGame,
          players,
          roomCode,
        }));

        channelRef.current?.send({
          type: 'broadcast',
          event: 'game-started',
          payload: { gameId: selectedGame, players },
        });

        setTimeout(() => {
          navigate(`/play/game/${roomCode}`);
        }, 600);
      }
    }, 1000);
  }, [selectedGame, allReady, players, roomCode, navigate]);

  const selectedGameData = BUILT_IN_GAMES.find(g => g.id === selectedGame);

  return (
    <div className="min-h-screen bg-background relative">
      <Navbar />

      {/* Countdown overlay */}
      {countdown !== null && (
        <div className="fixed inset-0 z-[100] bg-background/90 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="font-heading text-[120px] font-extrabold text-primary leading-none animate-pulse">
              {countdown === 0 ? 'GO!' : countdown}
            </div>
            <p className="font-mono text-sm text-muted-foreground">
              {selectedGameData?.title} starting...
            </p>
          </div>
        </div>
      )}

      <div className="pt-24 px-6 max-w-5xl mx-auto pb-12">
        <div className="grid md:grid-cols-2 gap-12">
          {/* Left: QR + Players */}
          <div className="space-y-8">
            <QRDisplay roomCode={roomCode} />

            <div className="p-4 rounded-lg border border-border bg-card space-y-2">
              <h4 className="font-heading text-xs font-semibold text-muted-foreground uppercase tracking-wider">How players join</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Players open their phone browser and scan the QR code or visit the URL.
                Works over any internet connection — same Wi-Fi not required.
                No app download needed. Players must tap "Ready" before the game starts.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="font-heading text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Players ({players.length}/4)
                {allReady && (
                  <span className="ml-2 text-success">· All ready!</span>
                )}
              </h3>
              {[0, 1, 2, 3].map(i => (
                <PlayerSlot key={i} index={i} player={players[i]} />
              ))}
            </div>
          </div>

          {/* Right: Game Selection */}
          <div className="space-y-6">
            <h2 className="font-heading text-xl font-semibold text-foreground">Select a game</h2>
            <div className="grid grid-cols-2 gap-3">
              {BUILT_IN_GAMES.map(game => (
                <div
                  key={game.id}
                  className={`cursor-pointer rounded-lg border transition-all duration-150 ${
                    selectedGame === game.id
                      ? 'border-primary bg-accent-dim'
                      : 'border-border hover:border-primary/30'
                  }`}
                  onClick={() => setSelectedGame(game.id)}
                >
                  <div className={`aspect-video relative rounded-t-lg ${COVER_CLASSES[game.id] || ''}`} />
                  <div className="p-3 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/20 text-primary">
                        Official
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground">{game.genre}</span>
                    </div>
                    <h3 className="font-heading font-semibold text-sm text-foreground">{game.title}</h3>
                    <p className="text-[10px] text-muted-foreground">{game.minPlayers}–{game.maxPlayers} players</p>
                  </div>
                </div>
              ))}
            </div>

            {selectedGameData && (
              <div className="p-4 rounded-lg border border-primary/20 bg-card space-y-2">
                <h3 className="font-heading font-semibold text-foreground">{selectedGameData.title}</h3>
                <p className="text-xs text-muted-foreground">{selectedGameData.desc}</p>
              </div>
            )}

            <button
              onClick={handleStartGame}
              disabled={!selectedGame || !allReady || countdown !== null}
              className="w-full bg-primary text-primary-foreground font-heading font-semibold py-3 rounded-lg hover:opacity-90 transition-opacity text-sm disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {players.length < 2
                ? `Waiting for players (${players.length}/2 minimum)`
                : !allReady
                  ? `Waiting for all players to ready up`
                  : `Start ${selectedGameData?.title || 'Game'} →`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
