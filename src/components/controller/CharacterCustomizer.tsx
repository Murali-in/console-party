import { useState } from 'react';

const SHAPES = ['circle', 'square', 'triangle', 'diamond'] as const;
const COLORS = ['#6c63ff', '#34d399', '#f87171', '#fbbf24', '#60a5fa', '#f472b6', '#fb923c', '#a78bfa'];
const ICONS = ['⭐', '💀', '🔥', '👑', '⚡', '🎯', '🚀', '💎', '🌙', '🐉', '⚔️', '🛡️'];

interface CharacterCustomizerProps {
  currentColor: string;
  currentName: string;
  onSave: (character: { shape: string; color: string; icon: string; displayName: string }) => void;
  onClose: () => void;
}

function ShapePreview({ shape, color, icon, size = 80 }: { shape: string; color: string; icon: string; size?: number }) {
  const cls = 'flex items-center justify-center';
  const style = { width: size, height: size, backgroundColor: `${color}22`, border: `2px solid ${color}` };

  switch (shape) {
    case 'square':
      return <div className={cls} style={{ ...style, borderRadius: 8 }}><span style={{ fontSize: size * 0.4 }}>{icon}</span></div>;
    case 'triangle':
      return (
        <div className={`${cls} relative`} style={{ width: size, height: size }}>
          <svg viewBox="0 0 100 100" width={size} height={size}>
            <polygon points="50,8 92,88 8,88" fill={`${color}22`} stroke={color} strokeWidth="3" />
          </svg>
          <span className="absolute" style={{ fontSize: size * 0.3, top: '40%', left: '50%', transform: 'translate(-50%, -50%)' }}>{icon}</span>
        </div>
      );
    case 'diamond':
      return (
        <div className={`${cls} relative`} style={{ width: size, height: size }}>
          <svg viewBox="0 0 100 100" width={size} height={size}>
            <polygon points="50,5 95,50 50,95 5,50" fill={`${color}22`} stroke={color} strokeWidth="3" />
          </svg>
          <span className="absolute" style={{ fontSize: size * 0.3, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>{icon}</span>
        </div>
      );
    default:
      return <div className={cls} style={{ ...style, borderRadius: '50%' }}><span style={{ fontSize: size * 0.4 }}>{icon}</span></div>;
  }
}

export default function CharacterCustomizer({ currentColor, currentName, onSave, onClose }: CharacterCustomizerProps) {
  const [shape, setShape] = useState<string>('circle');
  const [color, setColor] = useState(currentColor);
  const [icon, setIcon] = useState('⭐');
  const [displayName, setDisplayName] = useState(currentName.slice(0, 8));

  return (
    <div className="h-screen bg-background flex flex-col overflow-y-auto">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="font-heading text-sm font-bold text-foreground">Customize Character</span>
        <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground font-mono">✕ Close</button>
      </div>

      <div className="flex-1 px-6 py-4 space-y-5">
        {/* Preview */}
        <div className="flex justify-center py-2">
          <div className="text-center space-y-2">
            <ShapePreview shape={shape} color={color} icon={icon} size={72} />
            <p className="font-mono text-xs font-bold" style={{ color }}>{displayName || 'Player'}</p>
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground block mb-1.5">Name (8 chars)</label>
          <input
            value={displayName}
            onChange={e => setDisplayName(e.target.value.slice(0, 8).toUpperCase())}
            maxLength={8}
            className="w-full px-3 py-2.5 bg-card border border-border rounded-lg text-foreground font-mono text-sm tracking-widest focus:outline-none focus:border-primary/50"
            placeholder="PLAYER"
          />
        </div>

        {/* Shape */}
        <div>
          <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground block mb-1.5">Shape</label>
          <div className="flex gap-2">
            {SHAPES.map(s => (
              <button
                key={s}
                onClick={() => setShape(s)}
                className={`flex-1 py-2.5 rounded-lg border text-xs font-heading font-semibold capitalize transition-all ${
                  shape === s ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground hover:border-primary/30'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Color */}
        <div>
          <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground block mb-1.5">Color</label>
          <div className="flex gap-2 flex-wrap">
            {COLORS.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className="w-9 h-9 rounded-full transition-all"
                style={{
                  backgroundColor: c,
                  border: color === c ? '3px solid white' : '3px solid transparent',
                  transform: color === c ? 'scale(1.1)' : 'scale(1)',
                }}
              />
            ))}
          </div>
        </div>

        {/* Icon */}
        <div>
          <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground block mb-1.5">Icon</label>
          <div className="grid grid-cols-6 gap-1.5">
            {ICONS.map(ic => (
              <button
                key={ic}
                onClick={() => setIcon(ic)}
                className={`h-10 rounded-lg flex items-center justify-center text-lg transition-all ${
                  icon === ic ? 'bg-primary/10 border border-primary' : 'bg-card border border-border'
                }`}
              >
                {ic}
              </button>
            ))}
          </div>
        </div>

        {/* Save */}
        <button
          onClick={() => onSave({ shape, color, icon, displayName: displayName || 'Player' })}
          className="w-full py-3.5 bg-primary text-primary-foreground font-heading font-semibold text-sm rounded-lg hover:opacity-90 transition-opacity active:scale-[0.97]"
        >
          Save Character →
        </button>
      </div>
    </div>
  );
}
