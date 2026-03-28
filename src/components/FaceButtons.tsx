import { useState, useEffect, useRef } from 'react';

const BUTTON_LABELS: Record<string, Record<string, string>> = {
  'apex-arena':  { A: 'FIRE',  B: 'DASH',  X: 'SHIELD', Y: 'MELEE' },
  'pong':        { A: 'LUNGE', B: 'SPIN',  X: 'BOOST',  Y: 'CURVE' },
  'maze-runner': { A: 'DASH',  B: 'USE',   X: 'BREAK',  Y: 'WARP' },
};

const BTN_COLORS: Record<string, string> = {
  A: '#bfbfbf',
  B: '#f87171',
  X: '#60a5fa',
  Y: '#34d399',
};

// Cooldown durations in ms per game
const COOLDOWNS: Record<string, Record<string, number>> = {
  'apex-arena': { B: 2000, X: 4000, Y: 1000 },
  'maze-runner': { A: 1000 },
};

interface FaceButtonsProps {
  onPress: (btn: string, pressed: boolean) => void;
  gameId: string | null;
}

function Btn({
  id, size, label, onPress, cooldownMs,
}: {
  id: string; size: number; label: string;
  onPress: (btn: string, pressed: boolean) => void;
  cooldownMs: number;
}) {
  const [isPressed, setIsPressed] = useState(false);
  const [cooldownProgress, setCooldownProgress] = useState(0); // 0 = ready, 1 = full cooldown
  const cooldownRef = useRef<number>(0);
  const rafRef = useRef<number>(0);

  const color = BTN_COLORS[id];
  const filled = id === 'A';

  const triggerCooldown = () => {
    if (cooldownMs <= 0) return;
    cooldownRef.current = performance.now();
    const animate = () => {
      const elapsed = performance.now() - cooldownRef.current;
      const progress = 1 - Math.min(1, elapsed / cooldownMs);
      setCooldownProgress(progress);
      if (progress > 0) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const handlePress = (pressed: boolean) => {
    setIsPressed(pressed);
    onPress(id, pressed);
    if (pressed && cooldownMs > 0) triggerCooldown();
  };

  // SVG cooldown ring
  const ringR = (size / 2) - 2;
  const circumference = 2 * Math.PI * ringR;
  const dashOffset = circumference * (1 - cooldownProgress);

  return (
    <button
      onTouchStart={(e) => { e.preventDefault(); handlePress(true); }}
      onTouchEnd={(e) => { e.preventDefault(); handlePress(false); }}
      onMouseDown={() => handlePress(true)}
      onMouseUp={() => handlePress(false)}
      className="relative rounded-full flex flex-col items-center justify-center touch-none select-none"
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
      {/* Cooldown ring overlay */}
      {cooldownProgress > 0 && (
        <svg className="absolute inset-0" width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle
            cx={size / 2} cy={size / 2} r={ringR}
            fill="none"
            stroke={color}
            strokeWidth={3}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            opacity={0.6}
          />
        </svg>
      )}
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
  const cooldowns = (gameId && COOLDOWNS[gameId]) || {};

  return (
    <div className="relative" style={{ width: 140, height: 140 }}>
      <div className="absolute left-1/2 -translate-x-1/2 top-0">
        <Btn id="Y" size={46} label={labels.Y} onPress={onPress} cooldownMs={cooldowns['Y'] || 0} />
      </div>
      <div className="absolute left-0 top-1/2 -translate-y-1/2">
        <Btn id="X" size={46} label={labels.X} onPress={onPress} cooldownMs={cooldowns['X'] || 0} />
      </div>
      <div className="absolute right-0 top-1/2 -translate-y-1/2">
        <Btn id="B" size={46} label={labels.B} onPress={onPress} cooldownMs={cooldowns['B'] || 0} />
      </div>
      <div className="absolute left-1/2 -translate-x-1/2 bottom-0">
        <Btn id="A" size={52} label={labels.A} onPress={onPress} cooldownMs={cooldowns['A'] || 0} />
      </div>
    </div>
  );
}
