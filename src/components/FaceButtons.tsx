import { useState } from 'react';

const BUTTON_LABELS: Record<string, Record<string, string>> = {
  'bomb-arena':       { A: 'DASH',  B: 'THROW', X: 'BLOCK', Y: 'TAUNT' },
  'nitro-race':       { A: 'GAS',   B: 'NITRO', X: 'BRAKE', Y: 'HORN' },
  'apex-arena':       { A: 'FIRE',  B: 'DASH',  X: 'RELOAD',Y: 'MELEE' },
  'pong':             { A: 'LUNGE', B: 'SPIN',  X: '—',     Y: '—' },
  'tank-battle':      { A: 'SHOOT', B: 'AIM',   X: 'REV',   Y: '—' },
  'snake-battle':     { A: 'BOOST', B: 'TURN',  X: '—',     Y: '—' },
  'platform-fighter': { A: 'PUNCH', B: 'JUMP',  X: 'BLOCK', Y: 'SMASH' },
  'maze-runner':      { A: 'DASH',  B: 'USE',   X: '—',     Y: '—' },
  'trivia-clash':     { A: 'PICK',  B: 'LOCK',  X: '—',     Y: '—' },
};

const BTN_COLORS: Record<string, string> = {
  A: '#6b5fff',
  B: '#f87171',
  X: '#60a5fa',
  Y: '#34d399',
};

interface FaceButtonsProps {
  onPress: (btn: string, pressed: boolean) => void;
  gameId: string | null;
}

function Btn({
  id,
  size,
  label,
  onPress,
}: {
  id: string;
  size: number;
  label: string;
  onPress: (btn: string, pressed: boolean) => void;
}) {
  const [isPressed, setIsPressed] = useState(false);
  const color = BTN_COLORS[id];
  const filled = id === 'A';

  return (
    <button
      onTouchStart={(e) => { e.preventDefault(); setIsPressed(true); onPress(id, true); }}
      onTouchEnd={(e) => { e.preventDefault(); setIsPressed(false); onPress(id, false); }}
      onMouseDown={() => { setIsPressed(true); onPress(id, true); }}
      onMouseUp={() => { setIsPressed(false); onPress(id, false); }}
      className="rounded-full flex flex-col items-center justify-center touch-none select-none"
      style={{
        width: size,
        height: size,
        background: filled
          ? (isPressed ? `${color}cc` : color)
          : (isPressed ? `${color}22` : 'transparent'),
        border: `2px solid ${color}`,
        transform: isPressed ? 'scale(0.88)' : 'scale(1)',
        transition: 'all 80ms ease',
        gap: 1,
      }}
    >
      <span className="font-mono text-xs font-bold" style={{ color: filled ? '#07070f' : color }}>
        {id}
      </span>
      {label !== '—' && (
        <span className="font-mono text-muted-foreground" style={{ fontSize: 7 }}>
          {label}
        </span>
      )}
    </button>
  );
}

export default function FaceButtons({ onPress, gameId }: FaceButtonsProps) {
  const labels = (gameId && BUTTON_LABELS[gameId]) || { A: 'A', B: 'B', X: 'X', Y: 'Y' };

  return (
    <div className="relative" style={{ width: 140, height: 140 }}>
      {/* Y - top */}
      <div className="absolute left-1/2 -translate-x-1/2 top-0">
        <Btn id="Y" size={46} label={labels.Y} onPress={onPress} />
      </div>
      {/* X - left */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2">
        <Btn id="X" size={46} label={labels.X} onPress={onPress} />
      </div>
      {/* B - right */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2">
        <Btn id="B" size={46} label={labels.B} onPress={onPress} />
      </div>
      {/* A - bottom (primary, bigger) */}
      <div className="absolute left-1/2 -translate-x-1/2 bottom-0">
        <Btn id="A" size={52} label={labels.A} onPress={onPress} />
      </div>
    </div>
  );
}
