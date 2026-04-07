import { useState, useEffect, useRef, useCallback } from 'react';

/* ── Types ─────────────────────────────────── */
interface ConsoleEntry {
  level: 'log' | 'warn' | 'error' | 'info';
  message: string;
  timestamp: number;
}

interface PreviewToolbarProps {
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  generatedCode: string;
  onRestart: () => void;
}

/* ── Device Frames ─────────────────────────── */
const DEVICE_FRAMES = [
  { id: 'none', label: 'None', width: '100%', height: '100%', bezel: false },
  { id: 'phone', label: '📱 Phone', width: '375px', height: '667px', bezel: true },
  { id: 'tablet', label: '📋 Tablet', width: '768px', height: '1024px', bezel: true },
  { id: 'desktop', label: '🖥️ Desktop', width: '1280px', height: '720px', bezel: true },
  { id: 'arcade', label: '🕹️ Arcade', width: '600px', height: '800px', bezel: true },
];

const SPEED_OPTIONS = [
  { label: '0.25×', value: 0.25 },
  { label: '0.5×', value: 0.5 },
  { label: '0.75×', value: 0.75 },
  { label: '1×', value: 1 },
  { label: '2×', value: 2 },
];

export default function PreviewToolbar({ iframeRef, generatedCode, onRestart }: PreviewToolbarProps) {
  const [fps, setFps] = useState(0);
  const [showFps, setShowFps] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [deviceFrame, setDeviceFrame] = useState('none');
  const [isRecording, setIsRecording] = useState(false);
  const [showConsole, setShowConsole] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState<ConsoleEntry[]>([]);
  const [errorPause, setErrorPause] = useState(false);
  const [showDeviceMenu, setShowDeviceMenu] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fpsIntervalRef = useRef<number | null>(null);

  // FPS counter via postMessage from injected script
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'eternity-fps') setFps(e.data.fps);
      if (e.data?.type === 'eternity-console') {
        setConsoleLogs(prev => [...prev.slice(-200), {
          level: e.data.level,
          message: e.data.message,
          timestamp: Date.now(),
        }]);
        if (e.data.level === 'error' && errorPause && iframeRef.current?.contentWindow) {
          // Attempt to pause game loop
          try {
            iframeRef.current.contentWindow.postMessage({ type: 'eternity-pause' }, '*');
          } catch {}
        }
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [errorPause, iframeRef]);

  // Inject FPS counter + console interceptor + speed control into game code
  const getInjectedCode = useCallback(() => {
    const injection = `
<script>
// FPS Counter
(function(){
  let frames=0,last=performance.now();
  function tick(){
    frames++;
    const now=performance.now();
    if(now-last>=1000){
      window.parent.postMessage({type:'eternity-fps',fps:frames},'*');
      frames=0;last=now;
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();

// Console Interceptor
(function(){
  const orig={log:console.log,warn:console.warn,error:console.error,info:console.info};
  ['log','warn','error','info'].forEach(function(level){
    console[level]=function(){
      const args=[].slice.call(arguments);
      const msg=args.map(function(a){try{return typeof a==='object'?JSON.stringify(a):String(a)}catch(e){return String(a)}}).join(' ');
      window.parent.postMessage({type:'eternity-console',level:level,message:msg},'*');
      orig[level].apply(console,arguments);
    };
  });

  // Catch unhandled errors
  window.addEventListener('error',function(e){
    window.parent.postMessage({type:'eternity-console',level:'error',message:e.message+' at '+e.filename+':'+e.lineno},'*');
  });
})();

// Speed Control
(function(){
  const origRAF=window.requestAnimationFrame;
  let gameSpeed=${speed};
  window.addEventListener('message',function(e){
    if(e.data&&e.data.type==='eternity-speed') gameSpeed=e.data.speed;
    if(e.data&&e.data.type==='eternity-pause'){
      // Simple pause by overriding RAF
      window.requestAnimationFrame=function(){return 0;};
    }
    if(e.data&&e.data.type==='eternity-resume'){
      window.requestAnimationFrame=origRAF;
    }
  });
  // For Phaser: try to set time scale
  setTimeout(function(){
    if(window.Phaser&&window.game){
      try{window.game.loop.sleep();}catch(e){}
    }
  },2000);
})();
</script>`;

    // Insert injection before </body>
    if (generatedCode.includes('</body>')) {
      return generatedCode.replace('</body>', injection + '</body>');
    }
    return generatedCode + injection;
  }, [generatedCode, speed]);

  // Update iframe when speed changes
  useEffect(() => {
    if (iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage({ type: 'eternity-speed', speed }, '*');
      } catch {}
    }
  }, [speed, iframeRef]);

  // Recording
  const startRecording = useCallback(async () => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    try {
      // Try to capture the iframe content via canvas
      const canvas = iframe.contentDocument?.querySelector('canvas');
      if (!canvas) {
        toast('No canvas found in game preview');
        return;
      }
      const stream = canvas.captureStream(30);
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp9' });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `eternity-recording-${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
      };
      recorder.start();
      recorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      console.error('Recording failed:', err);
    }
  }, [iframeRef]);

  const stopRecording = useCallback(() => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setIsRecording(false);
  }, []);

  const device = DEVICE_FRAMES.find(d => d.id === deviceFrame) || DEVICE_FRAMES[0];
  const errorCount = consoleLogs.filter(l => l.level === 'error').length;

  return {
    getInjectedCode,
    fps,
    toolbar: (
      <div className="flex items-center gap-1 flex-wrap px-2 py-1.5 bg-background/80 backdrop-blur border-b border-border text-[10px] font-mono">
        {/* FPS */}
        {showFps && (
          <span className={`px-1.5 py-0.5 rounded ${fps >= 50 ? 'text-green-400' : fps >= 30 ? 'text-yellow-400' : 'text-red-400'}`}>
            {fps} FPS
          </span>
        )}

        <span className="text-muted-foreground/30">|</span>

        {/* Speed Control */}
        <div className="relative">
          <button onClick={() => setShowSpeedMenu(!showSpeedMenu)} className="px-1.5 py-0.5 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
            {speed}× Speed
          </button>
          {showSpeedMenu && (
            <div className="absolute top-full left-0 mt-1 z-50 rounded-lg border border-border bg-card p-1 shadow-lg">
              {SPEED_OPTIONS.map(s => (
                <button key={s.value} onClick={() => { setSpeed(s.value); setShowSpeedMenu(false); }} className={`block w-full text-left px-3 py-1 rounded text-[10px] transition-colors ${speed === s.value ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-accent'}`}>
                  {s.label} {s.label === '1×' && '(Normal)'}
                </button>
              ))}
            </div>
          )}
        </div>

        <span className="text-muted-foreground/30">|</span>

        {/* Device Frame */}
        <div className="relative">
          <button onClick={() => setShowDeviceMenu(!showDeviceMenu)} className="px-1.5 py-0.5 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
            {device.id === 'none' ? '🖥️ Frame' : device.label}
          </button>
          {showDeviceMenu && (
            <div className="absolute top-full left-0 mt-1 z-50 rounded-lg border border-border bg-card p-1 shadow-lg">
              {DEVICE_FRAMES.map(d => (
                <button key={d.id} onClick={() => { setDeviceFrame(d.id); setShowDeviceMenu(false); }} className={`block w-full text-left px-3 py-1 rounded text-[10px] transition-colors ${deviceFrame === d.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-accent'}`}>
                  {d.label} {d.id !== 'none' && <span className="text-muted-foreground/50 ml-1">{d.width}×{d.height}</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        <span className="text-muted-foreground/30">|</span>

        {/* Record */}
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`px-1.5 py-0.5 rounded transition-colors ${isRecording ? 'bg-red-500/20 text-red-400 animate-pulse' : 'text-muted-foreground hover:text-foreground hover:bg-accent'}`}
        >
          {isRecording ? '⏹ Stop' : '⏺ Record'}
        </button>

        <span className="text-muted-foreground/30">|</span>

        {/* Console Toggle */}
        <button
          onClick={() => setShowConsole(!showConsole)}
          className={`px-1.5 py-0.5 rounded transition-colors ${showConsole ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-accent'}`}
        >
          Console {errorCount > 0 && <span className="text-red-400 ml-0.5">({errorCount})</span>}
        </button>

        {/* Auto-pause toggle */}
        <button
          onClick={() => setErrorPause(!errorPause)}
          className={`px-1.5 py-0.5 rounded transition-colors ${errorPause ? 'bg-yellow-500/10 text-yellow-400' : 'text-muted-foreground hover:text-foreground hover:bg-accent'}`}
          title="Auto-pause on error"
        >
          {errorPause ? '⏸ Auto-pause ON' : '⏸ Auto-pause'}
        </button>

        <span className="flex-1" />

        {/* Restart */}
        <button onClick={onRestart} className="px-1.5 py-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
          ↻ Restart
        </button>
      </div>
    ),
    consolePanel: showConsole ? (
      <div className="border-t border-border bg-background max-h-[150px] overflow-auto">
        <div className="flex items-center justify-between px-2 py-1 border-b border-border">
          <span className="text-[10px] font-mono text-muted-foreground">Console ({consoleLogs.length})</span>
          <button onClick={() => setConsoleLogs([])} className="text-[9px] font-mono text-muted-foreground hover:text-foreground">Clear</button>
        </div>
        {consoleLogs.length === 0 ? (
          <p className="text-[10px] text-muted-foreground/50 font-mono text-center py-3">No console output</p>
        ) : (
          consoleLogs.map((entry, i) => (
            <div key={i} className={`px-2 py-0.5 text-[10px] font-mono border-b border-border/30 ${
              entry.level === 'error' ? 'text-red-400 bg-red-500/5' :
              entry.level === 'warn' ? 'text-yellow-400 bg-yellow-500/5' :
              'text-muted-foreground'
            }`}>
              <span className="text-muted-foreground/40 mr-2">{new Date(entry.timestamp).toLocaleTimeString()}</span>
              {entry.message}
            </div>
          ))
        )}
      </div>
    ) : null,
    deviceFrame: device,
  };
}

function toast(msg: string) {
  // Simple fallback if sonner not available in this context
  console.log(msg);
}
