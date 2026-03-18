import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRealtime, type RoomPlayer } from '@/contexts/RealtimeContext';
import QRDisplay from '@/components/QRDisplay';
import PlayerSlot from '@/components/PlayerSlot';
import GameCard from '@/components/GameCard';
import Navbar from '@/components/Navbar';
import type { RealtimeChannel } from '@supabase/supabase-js';

const BUILT_IN_GAMES = [
  { id: 'bomb-pass', title: 'Bomb Pass', genre: 'Party', minPlayers: 2, maxPlayers: 4, gameType: 'official' as const },
  { id: 'nitro-race', title: 'Nitro Race', genre: 'Racing', minPlayers: 2, maxPlayers: 4, gameType: 'official' as const },
  { id: 'apex-arena', title: 'Apex Arena', genre: 'Shooter', minPlayers: 2, maxPlayers: 4, gameType: 'official' as const },
  { id: 'prop-hunt', title: 'Prop Hunt', genre: 'Party', minPlayers: 2, maxPlayers: 4, gameType: 'official' as const },
  { id: 'siege-battle', title: 'Siege Battle', genre: 'Strategy', minPlayers: 2, maxPlayers: 2, gameType: 'official' as const },
];

export default function HostLobby() {
  const navigate = useNavigate();
  const { createRoom, hostRoom, sendGameEvent } = useRealtime();
  const [roomCode, setRoomCode] = useState('');
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const code = createRoom();
    setRoomCode(code);

    const channel = hostRoom(code, {
      onPlayerJoined: (p) => setPlayers([...p]),
      onPlayerLeft: () => {},
      onInputUpdate: (input) => {
        // Forward to game engine when game is running
        window.dispatchEvent(new CustomEvent('game-input', { detail: input }));
      },
    });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
    };
  }, []);

  const handleStartGame = () => {
    if (!selectedGame || players.length < 2) return;
    setGameStarted(true);
    channelRef.current?.send({
      type: 'broadcast',
      event: 'game-started',
      payload: { gameId: selectedGame, players },
    });
  };

  if (gameStarted && selectedGame) {
    return (
      <div className="h-screen w-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="font-heading text-2xl font-bold text-foreground">
            {BUILT_IN_GAMES.find(g => g.id === selectedGame)?.title}
          </h2>
          <p className="text-muted-foreground text-sm">Game canvas will render here</p>
          <p className="font-mono text-xs text-muted-foreground">Room: {roomCode} · {players.length} players</p>
          <div id="game-container" className="w-full max-w-4xl aspect-video bg-card border border-border rounded-lg mx-auto" />
          <button
            onClick={() => setGameStarted(false)}
            className="text-sm text-destructive hover:opacity-80 transition-opacity"
          >
            End Game
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 px-6 max-w-5xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12">
          {/* Left: QR + Players */}
          <div className="space-y-8">
            <QRDisplay roomCode={roomCode} />
            <div className="space-y-3">
              <h3 className="font-heading text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Players ({players.length}/4)
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
                  className={`cursor-pointer rounded-lg border transition-colors ${
                    selectedGame === game.id
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/30'
                  }`}
                  onClick={() => setSelectedGame(game.id)}
                >
                  <GameCard
                    title={game.title}
                    genre={game.genre}
                    minPlayers={game.minPlayers}
                    maxPlayers={game.maxPlayers}
                    gameType={game.gameType}
                  />
                </div>
              ))}
            </div>

            <button
              onClick={handleStartGame}
              disabled={!selectedGame || players.length < 2}
              className="w-full bg-primary text-primary-foreground font-medium py-3 rounded-lg hover:opacity-90 transition-opacity text-sm disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {players.length < 2
                ? `Waiting for players (${players.length}/2 minimum)`
                : 'Start Game'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
