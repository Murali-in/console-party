import { cn } from '@/lib/utils';

interface BrandLogoProps {
  className?: string;
  compact?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function BrandLogo({ className, compact = false, size = 'sm' }: BrandLogoProps) {
  const sizes = {
    sm: { w: 36, title: 'text-sm', sub: 'text-[10px]' },
    md: { w: 48, title: 'text-lg', sub: 'text-[11px]' },
    lg: { w: 64, title: 'text-2xl', sub: 'text-xs' },
  };
  const s = sizes[size];

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {/* Controller silhouette with ∞ in center */}
      <svg
        width={s.w}
        height={s.w * 0.7}
        viewBox="0 0 80 56"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        {/* Controller body */}
        <path
          d="M16 12C16 6 22 2 30 2H50C58 2 64 6 64 12V16C70 16 78 22 78 32C78 42 72 52 64 52H56C50 52 46 48 42 44H38C34 48 30 52 24 52H16C8 52 2 42 2 32C2 22 10 16 16 16V12Z"
          fill="currentColor"
          className="text-foreground"
        />

        {/* D-pad (left side) */}
        <rect x="18" y="26" width="14" height="4" rx="1" fill="currentColor" className="text-background" opacity="0.5" />
        <rect x="23" y="21" width="4" height="14" rx="1" fill="currentColor" className="text-background" opacity="0.5" />

        {/* Action buttons (right side) */}
        <circle cx="55" cy="24" r="3" fill="currentColor" className="text-background" opacity="0.4" />
        <circle cx="63" cy="28" r="3" fill="currentColor" className="text-background" opacity="0.4" />
        <circle cx="55" cy="32" r="3" fill="currentColor" className="text-background" opacity="0.4" />
        <circle cx="47" cy="28" r="3" fill="currentColor" className="text-background" opacity="0.4" />

        {/* Infinity symbol in center */}
        <text
          x="40"
          y="30"
          textAnchor="middle"
          dominantBaseline="central"
          fill="currentColor"
          className="text-background"
          fontWeight="900"
          fontSize="14"
          fontFamily="Syne, sans-serif"
        >
          ∞
        </text>

        {/* Bumpers */}
        <rect x="20" y="4" width="16" height="3" rx="1.5" fill="currentColor" className="text-background" opacity="0.2" />
        <rect x="44" y="4" width="16" height="3" rx="1.5" fill="currentColor" className="text-background" opacity="0.2" />

        {/* Analog sticks */}
        <circle cx="30" cy="40" r="4" fill="currentColor" className="text-background" opacity="0.25" />
        <circle cx="50" cy="40" r="4" fill="currentColor" className="text-background" opacity="0.25" />
      </svg>

      {!compact && (
        <div className="min-w-0">
          <div className={cn(s.title, 'font-heading font-bold tracking-tight text-foreground leading-tight')}>
            Eternity Console
          </div>
          <div className={cn(s.sub, 'font-mono uppercase tracking-[0.22em] text-muted-foreground')}>
            Browser multiplayer
          </div>
        </div>
      )}
    </div>
  );
}
