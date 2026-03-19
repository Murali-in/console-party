import { cn } from '@/lib/utils';

interface BrandLogoProps {
  className?: string;
  compact?: boolean;
}

export default function BrandLogo({ className, compact = false }: BrandLogoProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-border bg-foreground text-background font-heading text-lg font-extrabold leading-none">
        ∞
      </div>
      <div className="min-w-0">
        <div className="font-heading text-sm font-bold tracking-tight text-foreground">
          Eternity Console
        </div>
        {!compact && (
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Browser multiplayer
          </div>
        )}
      </div>
    </div>
  );
}
