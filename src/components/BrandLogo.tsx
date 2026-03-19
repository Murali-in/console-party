import { cn } from '@/lib/utils';
import controllerLogo from '@/assets/controller-logo.jpg';

interface BrandLogoProps {
  className?: string;
  compact?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function BrandLogo({ className, compact = false, size = 'sm' }: BrandLogoProps) {
  const sizes = {
    sm: { imgH: 'h-9', title: 'text-sm', sub: 'text-[10px]' },
    md: { imgH: 'h-12', title: 'text-lg', sub: 'text-[11px]' },
    lg: { imgH: 'h-16', title: 'text-2xl', sub: 'text-xs' },
  };
  const s = sizes[size];

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <img
        src={controllerLogo}
        alt="Eternity Console logo"
        className={cn(s.imgH, 'w-auto object-contain')}
      />
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
