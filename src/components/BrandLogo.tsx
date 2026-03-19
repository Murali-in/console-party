import { cn } from '@/lib/utils';

interface BrandLogoProps {
  className?: string;
  compact?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function BrandLogo({ className, compact = false, size = 'sm' }: BrandLogoProps) {
  const sizes = {
    sm: { outer: 'h-9 w-9', stick: 'h-[10px] w-[2px]', knob: 'h-[18px] w-[18px]', symbol: 'text-[8px]', title: 'text-sm', sub: 'text-[10px]' },
    md: { outer: 'h-12 w-12', stick: 'h-[14px] w-[3px]', knob: 'h-[22px] w-[22px]', symbol: 'text-[10px]', title: 'text-lg', sub: 'text-[11px]' },
    lg: { outer: 'h-16 w-16', stick: 'h-[18px] w-[3px]', knob: 'h-[28px] w-[28px]', symbol: 'text-xs', title: 'text-2xl', sub: 'text-xs' },
  };
  const s = sizes[size];

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {/* Joystick icon with infinity in the knob */}
      <div className={cn(s.outer, 'relative flex flex-col items-center justify-end rounded-[8px] border border-foreground/20 bg-foreground')}>
        {/* Joystick stick */}
        <div className="flex flex-col items-center absolute top-[4px]">
          <div className={cn(s.knob, 'rounded-full bg-background border border-foreground/30 flex items-center justify-center')}>
            <span className={cn(s.symbol, 'font-heading font-extrabold text-foreground leading-none')}>∞</span>
          </div>
          <div className={cn(s.stick, 'bg-background/60 rounded-full -mt-[1px]')} />
        </div>
        {/* Base plate dots */}
        <div className="flex gap-[3px] mb-[4px]">
          <div className="w-[3px] h-[3px] rounded-full bg-background/30" />
          <div className="w-[3px] h-[3px] rounded-full bg-background/30" />
          <div className="w-[3px] h-[3px] rounded-full bg-background/30" />
        </div>
      </div>
      {!compact ? (
        <div className="min-w-0">
          <div className={cn(s.title, 'font-heading font-bold tracking-tight text-foreground leading-tight')}>
            Eternity Console
          </div>
          <div className={cn(s.sub, 'font-mono uppercase tracking-[0.22em] text-muted-foreground')}>
            Browser multiplayer
          </div>
        </div>
      ) : null}
    </div>
  );
}
