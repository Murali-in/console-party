import { useRef, useCallback, useEffect, useState } from 'react';

interface JoystickOutput {
  x: number;
  y: number;
}

interface VirtualJoystickProps {
  onMove: (output: JoystickOutput) => void;
  size?: number;
}

export default function VirtualJoystick({ onMove, size = 140 }: VirtualJoystickProps) {
  const baseRef = useRef<HTMLDivElement>(null);
  const [thumbPos, setThumbPos] = useState({ x: 0, y: 0 });
  const touchIdRef = useRef<number | null>(null);

  const handleMove = useCallback((clientX: number, clientY: number) => {
    const base = baseRef.current;
    if (!base) return;
    const rect = base.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const radius = size / 2;

    let dx = clientX - centerX;
    let dy = clientY - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > radius) {
      dx = (dx / dist) * radius;
      dy = (dy / dist) * radius;
    }

    setThumbPos({ x: dx, y: dy });
    onMove({ x: dx / radius, y: dy / radius });
  }, [onMove, size]);

  const handleEnd = useCallback(() => {
    touchIdRef.current = null;
    setThumbPos({ x: 0, y: 0 });
    onMove({ x: 0, y: 0 });
  }, [onMove]);

  useEffect(() => {
    const base = baseRef.current;
    if (!base) return;

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.changedTouches[0];
      touchIdRef.current = touch.identifier;
      handleMove(touch.clientX, touch.clientY);
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === touchIdRef.current) {
          handleMove(e.changedTouches[i].clientX, e.changedTouches[i].clientY);
          break;
        }
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === touchIdRef.current) {
          handleEnd();
          break;
        }
      }
    };

    base.addEventListener('touchstart', onTouchStart, { passive: false });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);

    return () => {
      base.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [handleMove, handleEnd]);

  const thumbSize = size * 0.4;

  return (
    <div
      ref={baseRef}
      className="relative rounded-full border border-border bg-secondary/50 touch-none"
      style={{ width: size, height: size }}
    >
      <div
        className="absolute rounded-full bg-primary/80"
        style={{
          width: thumbSize,
          height: thumbSize,
          left: size / 2 - thumbSize / 2 + thumbPos.x,
          top: size / 2 - thumbSize / 2 + thumbPos.y,
          transition: thumbPos.x === 0 && thumbPos.y === 0 ? 'all 0.1s' : 'none',
        }}
      />
    </div>
  );
}
