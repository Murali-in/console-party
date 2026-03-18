import { QRCodeSVG } from 'qrcode.react';

interface QRDisplayProps {
  roomCode: string;
}

export default function QRDisplay({ roomCode }: QRDisplayProps) {
  const url = `${window.location.origin}/play/controller/${roomCode}`;

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="bg-foreground p-4 rounded-lg">
        <QRCodeSVG value={url} size={180} bgColor="#FFFFFF" fgColor="#0A0A0F" />
      </div>
      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">Scan to join or enter code</p>
        <p className="font-mono text-4xl font-bold tracking-[0.3em] text-foreground">{roomCode}</p>
      </div>
    </div>
  );
}
