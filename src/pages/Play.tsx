import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDevice } from '@/contexts/DeviceContext';
import Navbar from '@/components/Navbar';

export default function Play() {
  const { isHost } = useDevice();
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState('');

  if (isHost) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-32 px-6 max-w-lg mx-auto text-center space-y-8">
          <h1 className="font-heading text-3xl font-bold text-foreground">Ready to play?</h1>
          <p className="text-sm text-muted-foreground">Start a new game room or join an existing one.</p>

          <button
            onClick={() => navigate('/play/host')}
            className="w-full bg-primary text-primary-foreground font-medium py-3 rounded-lg hover:opacity-90 transition-opacity text-sm"
          >
            Start a Game
          </button>

          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">or join</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="flex gap-3">
            <input
              type="text"
              maxLength={6}
              placeholder="Enter 6-digit code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="flex-1 bg-secondary border border-border rounded-lg px-4 py-3 font-mono text-center text-lg tracking-[0.2em] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              onClick={() => joinCode.length === 6 && navigate(`/play/controller/${joinCode}`)}
              disabled={joinCode.length !== 6}
              className="bg-primary text-primary-foreground font-medium px-6 py-3 rounded-lg hover:opacity-90 transition-opacity text-sm disabled:opacity-40"
            >
              Join
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Controller device — show join screen
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-8 text-center">
        <h1 className="font-heading text-2xl font-bold text-foreground">Join Game</h1>
        <p className="text-sm text-muted-foreground">Enter the room code shown on the game screen.</p>
        <input
          type="text"
          maxLength={6}
          placeholder="000000"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          className="w-full bg-secondary border border-border rounded-lg px-4 py-4 font-mono text-center text-3xl tracking-[0.3em] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button
          onClick={() => joinCode.length === 6 && navigate(`/play/controller/${joinCode}`)}
          disabled={joinCode.length !== 6}
          className="w-full bg-primary text-primary-foreground font-medium py-3 rounded-lg hover:opacity-90 transition-opacity text-sm disabled:opacity-40"
        >
          Connect
        </button>
      </div>
    </div>
  );
}
