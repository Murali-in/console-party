import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRealtime, type RoomPlayer } from '@/contexts/RealtimeContext';
import QRDisplay from '@/components/QRDisplay';
import PlayerSlot from '@/components/PlayerSlot';
import GameCard from '@/components/GameCard';
import Navbar from '@/components/Navbar';
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
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const code = createRoom();
    setRoomCode(code);

    const channel = hostRoom(code, {
      onPlayerJoined: (p) => setPlayers([...p]),
      onPlayerLeft: () => {},
      onInputUpdate: () => {},
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

    // Store game state for GameScreen
    sessionStorage.setItem(`game-${roomCode}`, JSON.stringify({
      gameId: selectedGame,
      players,
      roomCode,
    }));

    // Notify controllers
    channelRef.current?.send({
      type: 'broadcast',
      event: 'game-started',
      payload: { gameId: selectedGame, players },
    });

    // Navigate to game screen
    navigate(`/play/game/${roomCode}`);
  };

  const selectedGameData = BUILT_IN_GAMES.find(g => g.id === selectedGame);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 px-6 max-w-5xl mx-auto pb-12">
        <div className="grid md:grid-cols-2 gap-12">
          {/* Left: QR + Players */}
          <div className="space-y-8">
            <QRDisplay roomCode={roomCode} />

            {/* Info box */}
            <div className="p-4 rounded-lg border border-border bg-card space-y-2">
              <h4 className="font-heading text-xs font-semibold text-muted-foreground uppercase tracking-wider">How players join</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Players open their phone browser and scan the QR code or visit the URL.
                Works over any internet connection — same Wi-Fi not required.
                No app download needed.
              </p>
            </div>

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
                      ? 'border-primary bg-accent-dim'
                      : 'border-border hover:border-primary/30'
                  }`}
                  onClick={() => setSelectedGame(game.id)}
                >
                  <div className={`aspect-video relative rounded-t-lg ${COVER_CLASSES[game.id] || ''}`} />
                  <div className="p-3 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-primary/20 text-primary">
                        {game.gameType === 'official' ? 'Official' : 'Community'}
                      </span>
                      <span className="text-xs font-mono text-muted-foreground">{game.genre}</span>
                    </div>
                    <h3 className="font-heading font-semibold text-sm text-foreground">{game.title}</h3>
                    <p className="text-xs text-muted-foreground">{game.minPlayers}–{game.maxPlayers} players</p>
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
              disabled={!selectedGame || players.length < 2}
              className="w-full bg-primary text-primary-foreground font-heading font-semibold py-3 rounded-lg hover:opacity-90 transition-opacity text-sm disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {players.length < 2
                ? `Waiting for players (${players.length}/2 minimum)`
                : `Start ${selectedGameData?.title || 'Game'} →`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
