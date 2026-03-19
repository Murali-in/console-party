import { cn } from '@/lib/utils';

interface BrandLogoProps {
  className?: string;
  compact?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function BrandLogo({ className, compact = false, size = 'sm' }: BrandLogoProps) {
  const sizes = {
    sm: { box: 'h-9 w-9', symbol: 'text-sm', title: 'text-sm', sub: 'text-[10px]' },
    md: { box: 'h-12 w-12', symbol: 'text-lg', title: 'text-lg', sub: 'text-[11px]' },
    lg: { box: 'h-16 w-16', symbol: 'text-2xl', title: 'text-2xl', sub: 'text-xs' },
  };
  const s = sizes[size];

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {/* Console shape with infinity inside */}
      <div className={cn(
        s.box,
        'relative flex items-center justify-center rounded-[6px] border-2 border-foreground bg-foreground text-background overflow-hidden'
      )}>
        {/* Screen bezel effect */}
        <div className="absolute inset-[3px] rounded-[3px] border border-background/20 flex items-center justify-center">
          <span className={cn(s.symbol, 'font-heading font-extrabold leading-none')}>
            ∞
          </span>
        </div>
        {/* Bottom dots like a console */}
        <div className="absolute bottom-[2px] left-1/2 -translate-x-1/2 flex gap-[2px]">
          <div className="w-[2px] h-[2px] rounded-full bg-background/40" />
          <div className="w-[2px] h-[2px] rounded-full bg-background/40" />
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
