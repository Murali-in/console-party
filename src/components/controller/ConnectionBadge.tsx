interface ConnectionBadgeProps {
  status: 'connecting' | 'connected' | 'reconnecting';
}

export default function ConnectionBadge({ status }: ConnectionBadgeProps) {
  if (status === 'reconnecting') {
    return (
      <span className="text-[10px] font-mono text-warning flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
        Reconnecting...
      </span>
    );
  }

  if (status === 'connecting') {
    return (
      <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-pulse" />
        Connecting
      </span>
    );
  }

  return (
    <span className="text-[10px] font-mono text-success flex items-center gap-1">
      <span className="w-1.5 h-1.5 rounded-full bg-success" />
      Connected
    </span>
  );
}
