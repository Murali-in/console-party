interface ActionButtonProps {
  label: string;
  onPress: () => void;
  onRelease: () => void;
  variant?: 'primary' | 'secondary';
  size?: number;
}

export default function ActionButton({ label, onPress, onRelease, variant = 'primary', size = 72 }: ActionButtonProps) {
  return (
    <button
      onTouchStart={(e) => { e.preventDefault(); onPress(); }}
      onTouchEnd={(e) => { e.preventDefault(); onRelease(); }}
      onMouseDown={onPress}
      onMouseUp={onRelease}
      className={`rounded-full font-heading font-bold text-lg select-none touch-none active:scale-95 transition-transform ${
        variant === 'primary'
          ? 'bg-primary text-primary-foreground'
          : 'bg-secondary text-secondary-foreground border border-border'
      }`}
      style={{ width: size, height: size }}
    >
      {label}
    </button>
  );
}
