import { useRef, useEffect, useState, useCallback } from 'react';

interface DPadState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

interface DPadProps {
  onInput: (state: DPadState) => void;
  size?: number;
}

const NEUTRAL: DPadState = { up: false, down: false, left: false, right: false };

export default function DPad({ onInput, size = 140 }: DPadProps) {
  const [pressed, setPressed] = useState<DPadState>(NEUTRAL);
  const baseRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<number | null>(null);

  const getDirection = useCallback((touchX: number, touchY: number): DPadState => {
    if (!baseRef.current) return NEUTRAL;
    const rect = baseRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = touchX - cx;
    const dy = touchY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 12) return NEUTRAL;

    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    const ratio = absX / (absY + 0.001);

    // Cardinal vs diagonal
    if (ratio > 2) return { ...NEUTRAL, left: dx < 0, right: dx > 0 };
    if (ratio < 0.5) return { ...NEUTRAL, up: dy < 0, down: dy > 0 };
    return { up: dy < 0, down: dy > 0, left: dx < 0, right: dx > 0 };
  }, []);

  useEffect(() => {
    const handleMove = (e: TouchEvent) => {
      e.preventDefault();
      const t = Array.from(e.changedTouches).find(t => t.identifier === activeRef.current);
      if (!t) return;
      const dir = getDirection(t.clientX, t.clientY);
      setPressed(dir);
      onInput(dir);
    };

    const handleEnd = (e: TouchEvent) => {
      const t = Array.from(e.changedTouches).find(t => t.identifier === activeRef.current);
      if (!t) return;
      activeRef.current = null;
      setPressed(NEUTRAL);
      onInput(NEUTRAL);
    };

    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('touchend', handleEnd);
    return () => {
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
    };
  }, [getDirection, onInput]);

  const handleStart = (e: React.TouchEvent) => {
    e.preventDefault();
    if (activeRef.current !== null) return;
    activeRef.current = e.changedTouches[0].identifier;
    const t = e.changedTouches[0];
    const dir = getDirection(t.clientX, t.clientY);
    setPressed(dir);
    onInput(dir);
  };

  const armW = size * 0.33;
  const armH = size * 0.33;

  return (
    <div
      ref={baseRef}
      onTouchStart={handleStart}
      className="relative touch-none select-none"
      style={{ width: size, height: size }}
    >
      {/* Cross shape using CSS */}
      {/* Vertical bar */}
      <div
        className="absolute left-1/2 -translate-x-1/2 rounded-md border border-border/30"
        style={{
          width: armW,
          height: size,
          top: 0,
          background: 'rgba(255,255,255,0.04)',
        }}
      />
      {/* Horizontal bar */}
      <div
        className="absolute top-1/2 -translate-y-1/2 rounded-md border border-border/30"
        style={{
          width: size,
          height: armH,
          left: 0,
          background: 'rgba(255,255,255,0.04)',
        }}
      />

      {/* Direction highlights + arrows */}
      {/* UP */}
      <div
        className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center rounded-t-md transition-colors duration-75"
        style={{
          width: armW,
          height: armH,
          top: 0,
          background: pressed.up ? 'rgba(191,191,191,0.4)' : 'transparent',
        }}
      >
        <span className={`text-lg ${pressed.up ? 'text-foreground' : 'text-muted-foreground/40'}`}>▲</span>
      </div>

      {/* DOWN */}
      <div
        className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center rounded-b-md transition-colors duration-75"
        style={{
          width: armW,
          height: armH,
          bottom: 0,
          background: pressed.down ? 'rgba(191,191,191,0.4)' : 'transparent',
        }}
      >
        <span className={`text-lg ${pressed.down ? 'text-foreground' : 'text-muted-foreground/40'}`}>▼</span>
      </div>

      {/* LEFT */}
      <div
        className="absolute top-1/2 -translate-y-1/2 flex items-center justify-center rounded-l-md transition-colors duration-75"
        style={{
          width: armH,
          height: armW,
          left: 0,
          background: pressed.left ? 'rgba(191,191,191,0.4)' : 'transparent',
        }}
      >
        <span className={`text-lg ${pressed.left ? 'text-foreground' : 'text-muted-foreground/40'}`}>◀</span>
      </div>

      {/* RIGHT */}
      <div
        className="absolute top-1/2 -translate-y-1/2 flex items-center justify-center rounded-r-md transition-colors duration-75"
        style={{
          width: armH,
          height: armW,
          right: 0,
          background: pressed.right ? 'rgba(191,191,191,0.4)' : 'transparent',
        }}
      >
        <span className={`text-lg ${pressed.right ? 'text-foreground' : 'text-muted-foreground/40'}`}>▶</span>
      </div>

      {/* Center dot */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-border/50"
        style={{ width: size * 0.14, height: size * 0.14 }}
      />
    </div>
  );
}
