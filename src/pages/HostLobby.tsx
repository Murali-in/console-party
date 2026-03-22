import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRealtime, type RoomPlayer } from '@/contexts/RealtimeContext';
import QRDisplay from '@/components/QRDisplay';
import PlayerSlot from '@/components/PlayerSlot';
import Navbar from '@/components/Navbar';
import { playCountdownBeep, playReady } from '@/games/SoundFX';
import type { RealtimeChannel } from '@supabase/supabase-js';

const BUILT_IN_GAMES = [
  { id: 'bomb-arena', title: 'Bomb Pass', genre: 'Party', minPlayers: 2, maxPlayers: 4, desc: 'Hot potato meets survival. Pass the bomb before it blows.', coverClass: 'cover-bomb-arena' },
  { id: 'nitro-race', title: 'Nitro Race', genre: 'Racing', minPlayers: 2, maxPlayers: 4, desc: 'Top-down arcade racing with nitro boosts. 3 laps to victory.', coverClass: 'cover-nitro-race' },
  { id: 'apex-arena', title: 'Apex Arena', genre: 'Shooter', minPlayers: 2, maxPlayers: 4, desc: 'Top-down arena shooter. First to 10 kills wins.', coverClass: 'cover-apex-arena' },
  { id: 'pong', title: 'Pong', genre: 'Classic', minPlayers: 2, maxPlayers: 2, desc: 'Classic 2-player pong. First to 7 points wins.', coverClass: 'cover-pong' },
  { id: 'tank-battle', title: 'Tank Battle', genre: 'Combat', minPlayers: 2, maxPlayers: 4, desc: 'Drive, aim, and shoot. Last tank standing wins.', coverClass: 'cover-tank-battle' },
  { id: 'snake-battle', title: 'Snake Battle', genre: 'Arcade', minPlayers: 2, maxPlayers: 4, desc: 'Multiplayer snake on a shared grid. Last snake alive wins.', coverClass: 'cover-snake-battle' },
  { id: 'platform-fighter', title: 'Brawl Zone', genre: 'Fighter', minPlayers: 2, maxPlayers: 4, desc: 'Platform fighter. Punch, jump, and smash. First to 5 KOs wins.', coverClass: 'cover-platform-fighter' },
  { id: 'maze-runner', title: 'Maze Runner', genre: 'Puzzle', minPlayers: 2, maxPlayers: 4, desc: 'Race through procedural mazes. Collect coins, find the exit first.', coverClass: 'cover-maze-runner' },
  { id: 'trivia-clash', title: 'Trivia Clash', genre: 'Quiz', minPlayers: 2, maxPlayers: 4, desc: '10 rounds of rapid-fire trivia. Use your joystick to pick answers.', coverClass: 'cover-trivia-clash' },
];

export default function HostLobby() {
  const navigate = useNavigate();
  const { createRoom, hostRoom } = useRealtime();
  const [roomCode, setRoomCode] = useState('');
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [selectedGame, setSelectedGame] = useState<string | null>(() => {
    const pre = sessionStorage.getItem('preselected-game');
    if (pre) sessionStorage.removeItem('preselected-game');
    return pre || null;
  });
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
      onPlayerReady: () => playReady(),
    });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) channelRef.current.unsubscribe();
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const hasPlayers = players.length >= 1;
  const allReadyMulti = players.length >= 2 && players.every(p => p.ready);

  // Solo with phone: 1 player connected, plays vs CPU
  const handleSoloStart = useCallback(() => {
    if (!selectedGame || !hasPlayers) return;
    const soloPlayers = [
      ...players.map((p, i) => ({ ...p, index: i, ready: true })),
      { id: 'demo-cpu', name: 'CPU', index: players.length, color: '#888888', ready: true },
    ];
    sessionStorage.setItem(`game-${roomCode}`, JSON.stringify({
      gameId: selectedGame, players: soloPlayers, roomCode, soloPhone: true,
    }));
    channelRef.current?.send({
      type: 'broadcast', event: 'game-started',
      payload: { gameId: selectedGame, players: soloPlayers },
    });
    navigate(`/game/${roomCode}`);
  }, [selectedGame, hasPlayers, players, roomCode, navigate]);

  // Multiplayer: 2+ players all ready
  const handleMultiStart = useCallback(() => {
    if (!selectedGame || !allReadyMulti) return;

    setCountdown(3);
    playCountdownBeep(false);
    channelRef.current?.send({ type: 'broadcast', event: 'countdown', payload: { count: 3 } });

    let count = 3;
    countdownRef.current = setInterval(() => {
      count--;
      if (count > 0) {
        setCountdown(count);
        playCountdownBeep(false);
        channelRef.current?.send({ type: 'broadcast', event: 'countdown', payload: { count } });
      } else {
        setCountdown(0);
        playCountdownBeep(true);
        channelRef.current?.send({ type: 'broadcast', event: 'countdown', payload: { count: 0 } });
        if (countdownRef.current) clearInterval(countdownRef.current);

        sessionStorage.setItem(`game-${roomCode}`, JSON.stringify({
          gameId: selectedGame, players, roomCode,
        }));
        channelRef.current?.send({
          type: 'broadcast', event: 'game-started',
          payload: { gameId: selectedGame, players },
        });
        setTimeout(() => navigate(`/game/${roomCode}`), 600);
      }
    }, 1000);
  }, [selectedGame, allReadyMulti, players, roomCode, navigate]);

  const selectedGameData = BUILT_IN_GAMES.find(g => g.id === selectedGame);

  return (
    <div className="min-h-screen bg-background relative">
      <Navbar />

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

            {/* Spectator link */}
            <div className="p-3 rounded-[10px] border border-border bg-card space-y-1">
              <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">Spectator link</p>
              <p className="font-mono text-xs text-foreground break-all select-all">
                {window.location.origin}/watch/{roomCode}
              </p>
              <p className="text-[10px] text-muted-foreground">Share with remote viewers to watch the game live</p>
            </div>

            <div className="p-4 rounded-[10px] border border-border bg-card space-y-2">
              <h4 className="font-heading text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {hasPlayers ? '✓ Phone connected' : '① Connect your phone first'}
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {hasPlayers
                  ? 'Your phone is now a controller. Select a game and start playing — solo vs CPU or wait for more players.'
                  : 'Scan the QR code on your phone to connect it as a controller. You need at least one phone connected to play.'}
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="font-heading text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Players ({players.length}/4)
                {allReadyMulti && <span className="ml-2 text-success">· All ready!</span>}
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
                  className={`cursor-pointer rounded-[10px] border transition-all duration-150 ${
                    selectedGame === game.id
                      ? 'border-primary bg-accent-dim'
                      : 'border-border hover:border-primary/30'
                  }`}
                  onClick={() => setSelectedGame(game.id)}
                >
                  <div className={`aspect-video relative rounded-t-[10px] overflow-hidden ${game.coverClass}`} />
                  <div className="p-3 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/20 text-primary">Official</span>
                      <span className="text-[10px] font-mono text-muted-foreground">{game.genre}</span>
                    </div>
                    <h3 className="font-heading font-semibold text-sm text-foreground">{game.title}</h3>
                    <p className="text-[10px] text-muted-foreground">{game.minPlayers}–{game.maxPlayers} players</p>
                  </div>
                </div>
              ))}
            </div>

            {selectedGameData && (
              <div className="p-4 rounded-[10px] border border-primary/20 bg-card space-y-2">
                <h3 className="font-heading font-semibold text-foreground">{selectedGameData.title}</h3>
                <p className="text-xs text-muted-foreground">{selectedGameData.desc}</p>
              </div>
            )}

            {/* Demo with keyboard - always available when game selected */}
            {selectedGame && (
              <div className="space-y-2">
                {!hasPlayers && (
                  <button
                    onClick={() => {
                      const demoPlayers = [
                        { id: 'demo-p1', name: 'Player 1', index: 0, color: '#6c63ff', ready: true },
                        { id: 'demo-cpu', name: 'CPU', index: 1, color: '#f87171', ready: true },
                      ];
                      sessionStorage.setItem(`game-${roomCode}`, JSON.stringify({
                        gameId: selectedGame, players: demoPlayers, roomCode, demo: true,
                      }));
                      navigate(`/game/${roomCode}`);
                    }}
                    className="w-full bg-secondary text-foreground border border-border font-heading font-semibold py-3 rounded-lg hover:border-primary/30 transition-colors text-sm h-11"
                  >
                    Demo with Keyboard (WASD + Space) →
                  </button>
                )}
              </div>
            )}

            {/* No players connected yet */}
            {!hasPlayers && (
              <div className="w-full text-center py-4 rounded-lg border border-dashed border-border">
                <p className="text-sm text-muted-foreground font-heading">Connect a phone to start playing</p>
                <p className="text-[10px] text-muted-foreground font-mono mt-1">Scan QR code or enter room code on your phone</p>
              </div>
            )}

            {/* 1 player: solo vs CPU option */}
            {hasPlayers && players.length === 1 && selectedGame && (
              <div className="space-y-2">
                <button
                  onClick={handleSoloStart}
                  disabled={!players[0]?.ready || countdown !== null}
                  className="w-full bg-primary text-primary-foreground font-heading font-semibold py-3 rounded-lg hover:opacity-90 transition-opacity text-sm disabled:opacity-30 disabled:cursor-not-allowed h-11"
                >
                  {!players[0]?.ready
                    ? 'Waiting for you to ready up...'
                    : `Play ${selectedGameData?.title} Solo vs CPU →`}
                </button>
                <p className="text-[10px] text-center text-muted-foreground font-mono">
                  Or wait for more players to join for multiplayer
                </p>
              </div>
            )}

            {/* 2+ players: multiplayer start */}
            {players.length >= 2 && selectedGame && (
              <button
                onClick={handleMultiStart}
                disabled={!allReadyMulti || countdown !== null}
                className="w-full bg-primary text-primary-foreground font-heading font-semibold py-3 rounded-lg hover:opacity-90 transition-opacity text-sm disabled:opacity-30 disabled:cursor-not-allowed h-11"
              >
                {!allReadyMulti
                  ? 'Waiting for all players to ready up'
                  : `Start ${selectedGameData?.title} (${players.length}P) →`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}