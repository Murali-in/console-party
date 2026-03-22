import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDevice } from '@/contexts/DeviceContext';
import Navbar from '@/components/Navbar';
import { Input } from '@/components/ui/input';

const params = new URLSearchParams(window.location.search);
const initialCode = (params.get('code') ?? '').replace(/\D/g, '').slice(0, 6);
const initialName = (params.get('name') ?? sessionStorage.getItem('ec_name') ?? '').slice(0, 20);

export default function Play() {
  const { isHost } = useDevice();
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState(initialCode);
  const [playerName, setPlayerName] = useState(initialName);

  const handleJoin = () => {
    const trimmedName = playerName.trim().slice(0, 20);
    if (joinCode.length !== 6 || !trimmedName) return;
    sessionStorage.setItem('ec_name', trimmedName);
    navigate(`/join/${joinCode}?name=${encodeURIComponent(trimmedName)}`);
  };

  if (isHost) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="mx-auto flex max-w-lg flex-col gap-8 px-6 pt-32 text-center">
          <div className="space-y-3">
            <h1 className="font-heading text-3xl font-bold text-foreground">Ready to play?</h1>
            <p className="text-sm text-muted-foreground">Start a room on this screen or join an existing room with a player name.</p>
          </div>

          <button
            onClick={() => navigate('/host')}
            className="h-11 w-full rounded-lg bg-primary py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Start a Game
          </button>

          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">or join</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="space-y-3 rounded-[10px] border border-border bg-card p-4 text-left">
            <label className="font-heading text-xs uppercase tracking-[0.16em] text-muted-foreground">Player name</label>
            <Input
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value.slice(0, 20))}
              placeholder="Choose your name"
              className="h-11 border-border bg-secondary text-sm text-foreground"
            />
            <Input
              maxLength={6}
              inputMode="numeric"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Enter 6-digit code"
              className="h-11 border-border bg-secondary text-center font-mono text-lg tracking-[0.2em] text-foreground"
            />
            <button
              onClick={handleJoin}
              disabled={joinCode.length !== 6 || playerName.trim().length === 0}
              className="h-11 w-full rounded-lg border border-border bg-background px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-40"
            >
              Join Room
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm space-y-6 rounded-[10px] border border-border bg-card p-6 text-center">
        <div className="space-y-2">
          <h1 className="font-heading text-2xl font-bold text-foreground">Join Eternity Console</h1>
          <p className="text-sm text-muted-foreground">Enter your name, then join the room shown on the host screen.</p>
        </div>
        <Input
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value.slice(0, 20))}
          placeholder="Your name"
          className="h-11 border-border bg-secondary text-center text-sm text-foreground"
        />
        <Input
          type="text"
          maxLength={6}
          inputMode="numeric"
          placeholder="000000"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          className="h-14 border-border bg-secondary px-4 text-center font-mono text-3xl tracking-[0.3em] text-foreground"
        />
        <button
          onClick={handleJoin}
          disabled={joinCode.length !== 6 || playerName.trim().length === 0}
          className="h-11 w-full rounded-lg bg-primary py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          Connect
        </button>
      </div>
    </div>
  );
}
