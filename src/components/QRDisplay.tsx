import { QRCodeSVG } from 'qrcode.react';

interface QRDisplayProps {
  roomCode: string;
}

export default function QRDisplay({ roomCode }: QRDisplayProps) {
  const url = `${window.location.origin}/play?code=${roomCode}`;

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="rounded-lg bg-foreground p-4">
        <QRCodeSVG value={url} size={180} bgColor="#FAFAFA" fgColor="#090909" />
      </div>
      <div className="space-y-2 text-center">
        <p className="text-sm text-muted-foreground">Scan to join, choose a name, and enter the room</p>
        <p className="font-mono text-4xl font-bold tracking-[0.3em] text-foreground">{roomCode}</p>
      </div>
    </div>
  );
}
