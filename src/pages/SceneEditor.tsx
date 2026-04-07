import { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Helmet } from 'react-helmet-async';
import { toast } from 'sonner';
import StudioNav from '@/components/studio/StudioNav';

/* ── Types ─────────────────────────────────── */
interface SceneObject {
  id: string;
  type: 'rect' | 'circle' | 'sprite' | 'trigger' | 'spawn' | 'text';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  label: string;
  layer: number;
  locked: boolean;
  color: string;
  properties: Record<string, string>;
}

interface Layer {
  id: number;
  name: string;
  visible: boolean;
  locked: boolean;
  color: string;
}

/* ── Constants ─────────────────────────────── */
const OBJECT_TYPES = [
  { type: 'rect', icon: '▬', label: 'Rectangle' },
  { type: 'circle', icon: '●', label: 'Circle' },
  { type: 'sprite', icon: '🖼️', label: 'Sprite' },
  { type: 'trigger', icon: '⚡', label: 'Trigger Zone' },
  { type: 'spawn', icon: '📍', label: 'Spawn Point' },
  { type: 'text', icon: 'T', label: 'Text' },
];

const TILE_PALETTE = [
  { id: 'ground', color: '#3a5a40', label: 'Ground' },
  { id: 'wall', color: '#6b705c', label: 'Wall' },
  { id: 'water', color: '#219ebc', label: 'Water' },
  { id: 'lava', color: '#e63946', label: 'Lava' },
  { id: 'ice', color: '#a8dadc', label: 'Ice' },
  { id: 'sand', color: '#dda15e', label: 'Sand' },
  { id: 'void', color: '#1d3557', label: 'Void' },
  { id: 'path', color: '#bc6c25', label: 'Path' },
];

const GRID_SIZES = [16, 32, 64];

const SceneEditor = () => {
  const [objects, setObjects] = useState<SceneObject[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [layers, setLayers] = useState<Layer[]>([
    { id: 0, name: 'Background', visible: true, locked: false, color: '#3b82f6' },
    { id: 1, name: 'Objects', visible: true, locked: false, color: '#22c55e' },
    { id: 2, name: 'Foreground', visible: true, locked: false, color: '#f59e0b' },
  ]);
  const [activeLayer, setActiveLayer] = useState(1);
  const [tool, setTool] = useState<'select' | 'place' | 'tile' | 'navmesh' | 'trigger'>('select');
  const [placeType, setPlaceType] = useState<string>('rect');
  const [gridSize, setGridSize] = useState(32);
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [showPhysics, setShowPhysics] = useState(false);
  const [selectedTile, setSelectedTile] = useState('ground');
  const [tileMap, setTileMap] = useState<Record<string, string>>({});
  const [tileTool, setTileTool] = useState<'paint' | 'fill' | 'line' | 'rect'>('paint');
  const [navMeshRegions, setNavMeshRegions] = useState<Array<{ x: number; y: number; w: number; h: number }>>([]);
  const [multiSelect, setMultiSelect] = useState<string[]>([]);
  const [levelPrompt, setLevelPrompt] = useState('');
  const [isGeneratingLevel, setIsGeneratingLevel] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasSize] = useState({ w: 800, h: 600 });
  const [cameraOffset, setCameraOffset] = useState({ x: 0, y: 0 });

  const snap = (v: number) => snapToGrid ? Math.round(v / gridSize) * gridSize : v;

  const addObject = useCallback((type: string, x: number, y: number) => {
    const obj: SceneObject = {
      id: crypto.randomUUID(),
      type: type as SceneObject['type'],
      x: snap(x), y: snap(y),
      width: type === 'circle' ? 40 : type === 'trigger' ? 96 : 64,
      height: type === 'circle' ? 40 : type === 'trigger' ? 96 : 64,
      rotation: 0,
      label: `${type}_${objects.length}`,
      layer: activeLayer,
      locked: false,
      color: type === 'trigger' ? '#f59e0b40' : type === 'spawn' ? '#22c55e' : '#6366f1',
      properties: type === 'trigger' ? { event: 'on_enter' } : {},
    };
    setObjects(prev => [...prev, obj]);
    setSelectedId(obj.id);
    return obj;
  }, [objects, activeLayer, gridSize, snapToGrid]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left + cameraOffset.x;
    const y = e.clientY - rect.top + cameraOffset.y;

    if (tool === 'place') {
      addObject(placeType, x, y);
    } else if (tool === 'tile') {
      const tileX = Math.floor(x / gridSize);
      const tileY = Math.floor(y / gridSize);
      const key = `${tileX},${tileY}`;
      if (tileTool === 'paint') {
        setTileMap(prev => ({ ...prev, [key]: selectedTile }));
      }
    } else if (tool === 'select') {
      const clicked = objects.find(o => {
        const layer = layers.find(l => l.id === o.layer);
        if (!layer?.visible || layer.locked || o.locked) return false;
        return x >= o.x && x <= o.x + o.width && y >= o.y && y <= o.y + o.height;
      });
      if (clicked) {
        if (e.shiftKey) {
          setMultiSelect(prev => prev.includes(clicked.id) ? prev.filter(id => id !== clicked.id) : [...prev, clicked.id]);
        } else {
          setSelectedId(clicked.id);
          setMultiSelect([]);
        }
      } else {
        setSelectedId(null);
        setMultiSelect([]);
      }
    }
  };

  // Canvas render
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasSize.w, canvasSize.h);
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, canvasSize.w, canvasSize.h);

    // Grid
    if (showGrid) {
      ctx.strokeStyle = '#ffffff08';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvasSize.w; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvasSize.h); ctx.stroke();
      }
      for (let y = 0; y < canvasSize.h; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvasSize.w, y); ctx.stroke();
      }
    }

    // Tiles
    Object.entries(tileMap).forEach(([key, tileId]) => {
      const [tx, ty] = key.split(',').map(Number);
      const tile = TILE_PALETTE.find(t => t.id === tileId);
      if (tile) {
        ctx.fillStyle = tile.color;
        ctx.fillRect(tx * gridSize, ty * gridSize, gridSize, gridSize);
      }
    });

    // Nav mesh regions
    navMeshRegions.forEach(r => {
      ctx.fillStyle = '#22c55e15';
      ctx.strokeStyle = '#22c55e40';
      ctx.lineWidth = 2;
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeRect(r.x, r.y, r.w, r.h);
    });

    // Objects by layer
    layers.filter(l => l.visible).forEach(layer => {
      objects.filter(o => o.layer === layer.id).forEach(obj => {
        ctx.save();
        ctx.translate(obj.x + obj.width / 2, obj.y + obj.height / 2);
        ctx.rotate((obj.rotation * Math.PI) / 180);

        if (obj.type === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, obj.width / 2, 0, Math.PI * 2);
          ctx.fillStyle = obj.color;
          ctx.fill();
        } else {
          ctx.fillStyle = obj.color;
          ctx.fillRect(-obj.width / 2, -obj.height / 2, obj.width, obj.height);
        }

        // Physics debug overlay
        if (showPhysics) {
          ctx.strokeStyle = '#ff006640';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(-obj.width / 2, -obj.height / 2, obj.width, obj.height);
          ctx.setLineDash([]);
          // Velocity vector
          ctx.strokeStyle = '#00ff6640';
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(30, 0); ctx.stroke();
          ctx.fillStyle = '#00ff66';
          ctx.beginPath(); ctx.moveTo(30, -4); ctx.lineTo(38, 0); ctx.lineTo(30, 4); ctx.fill();
        }

        // Selection
        if (selectedId === obj.id || multiSelect.includes(obj.id)) {
          ctx.strokeStyle = '#6366f1';
          ctx.lineWidth = 2;
          ctx.setLineDash([]);
          ctx.strokeRect(-obj.width / 2 - 2, -obj.height / 2 - 2, obj.width + 4, obj.height + 4);
          // Transform handles
          const hs = 5;
          ctx.fillStyle = '#6366f1';
          [[-obj.width/2, -obj.height/2], [obj.width/2, -obj.height/2], [-obj.width/2, obj.height/2], [obj.width/2, obj.height/2]].forEach(([hx, hy]) => {
            ctx.fillRect(hx - hs/2, hy - hs/2, hs, hs);
          });
        }

        // Label
        ctx.fillStyle = '#ffffff80';
        ctx.font = '9px monospace';
        ctx.fillText(obj.label, -obj.width / 2, -obj.height / 2 - 4);

        ctx.restore();
      });
    });

    // Camera viewport indicator
    ctx.strokeStyle = '#ffffff20';
    ctx.lineWidth = 1;
    ctx.strokeRect(cameraOffset.x + 50, cameraOffset.y + 50, 320, 180);
    ctx.fillStyle = '#ffffff08';
    ctx.font = '8px monospace';
    ctx.fillText('Camera View', cameraOffset.x + 55, cameraOffset.y + 63);

  }, [objects, layers, selectedId, multiSelect, showGrid, showPhysics, gridSize, tileMap, navMeshRegions, canvasSize, cameraOffset]);

  const selectedObj = objects.find(o => o.id === selectedId);

  const handleGenerateLevel = () => {
    if (!levelPrompt.trim()) return;
    setIsGeneratingLevel(true);
    // Simulate level generation from description
    setTimeout(() => {
      const newObjects: SceneObject[] = [];
      // Parse simple instructions
      const lower = levelPrompt.toLowerCase();
      if (lower.includes('platform')) {
        for (let i = 0; i < 3; i++) {
          newObjects.push({
            id: crypto.randomUUID(), type: 'rect',
            x: 100 + i * 200, y: 350 + (Math.random() - 0.5) * 100,
            width: 120, height: 20, rotation: 0,
            label: `platform_${i}`, layer: 1, locked: false,
            color: '#6366f1', properties: { physics: 'static' },
          });
        }
      }
      if (lower.includes('enem')) {
        for (let i = 0; i < 2; i++) {
          newObjects.push({
            id: crypto.randomUUID(), type: 'circle',
            x: 200 + i * 300, y: 300,
            width: 30, height: 30, rotation: 0,
            label: `enemy_${i}`, layer: 1, locked: false,
            color: '#e63946', properties: { type: 'patrol' },
          });
        }
      }
      if (lower.includes('coin') || lower.includes('collect')) {
        for (let i = 0; i < 5; i++) {
          newObjects.push({
            id: crypto.randomUUID(), type: 'circle',
            x: 80 + i * 150, y: 250 + (Math.random() - 0.5) * 80,
            width: 16, height: 16, rotation: 0,
            label: `coin_${i}`, layer: 2, locked: false,
            color: '#f59e0b', properties: { type: 'collectible' },
          });
        }
      }
      if (lower.includes('spawn') || lower.includes('player')) {
        newObjects.push({
          id: crypto.randomUUID(), type: 'spawn',
          x: 50, y: 400, width: 24, height: 24, rotation: 0,
          label: 'player_spawn', layer: 1, locked: false,
          color: '#22c55e', properties: {},
        });
      }
      if (lower.includes('chest') || lower.includes('treasure')) {
        newObjects.push({
          id: crypto.randomUUID(), type: 'rect',
          x: 650, y: 300, width: 32, height: 24, rotation: 0,
          label: 'chest', layer: 1, locked: false,
          color: '#dda15e', properties: { type: 'interactive' },
        });
      }
      setObjects(prev => [...prev, ...newObjects]);
      setIsGeneratingLevel(false);
      toast.success(`Generated ${newObjects.length} objects from description`);
    }, 1500);
  };

  const deleteSelected = () => {
    if (selectedId) {
      setObjects(prev => prev.filter(o => o.id !== selectedId));
      setSelectedId(null);
    }
    if (multiSelect.length > 0) {
      setObjects(prev => prev.filter(o => !multiSelect.includes(o.id)));
      setMultiSelect([]);
    }
  };

  const exportScene = () => {
    const sceneData = JSON.stringify({ objects, layers, tileMap, navMeshRegions, gridSize }, null, 2);
    const blob = new Blob([sceneData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'scene.json';
    a.click();
    toast.success('Scene exported!');
  };

  return (
    <>
      <Helmet>
        <title>Scene Editor — Eternity Game Studio</title>
        <meta name="description" content="Visual scene editor with drag-and-drop objects, tile painting, physics overlays, trigger zones, and AI-powered level generation." />
      </Helmet>
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <main className="pt-[60px]">
          <StudioNav />
          <section className="mx-auto max-w-7xl px-4 py-4">
            {/* Top toolbar */}
            <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1">
              <span className="font-heading text-sm font-semibold mr-2">Scene Editor</span>
              {/* Tools */}
              {[
                { id: 'select' as const, icon: '↖', label: 'Select' },
                { id: 'place' as const, icon: '+', label: 'Place' },
                { id: 'tile' as const, icon: '▦', label: 'Tile Paint' },
                { id: 'navmesh' as const, icon: '◇', label: 'Nav Mesh' },
                { id: 'trigger' as const, icon: '⚡', label: 'Trigger' },
              ].map(t => (
                <button key={t.id} onClick={() => setTool(t.id)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-mono transition-colors ${tool === t.id ? 'bg-primary/10 border border-primary/30 text-primary' : 'border border-border text-muted-foreground hover:text-foreground'}`}>
                  {t.icon} {t.label}
                </button>
              ))}
              <span className="text-muted-foreground/30">|</span>
              {/* Grid controls */}
              <button onClick={() => setShowGrid(!showGrid)} className={`px-2 py-1 rounded-lg text-[10px] font-mono border ${showGrid ? 'border-primary/30 text-primary' : 'border-border text-muted-foreground'}`}>Grid</button>
              <button onClick={() => setSnapToGrid(!snapToGrid)} className={`px-2 py-1 rounded-lg text-[10px] font-mono border ${snapToGrid ? 'border-primary/30 text-primary' : 'border-border text-muted-foreground'}`}>Snap</button>
              <button onClick={() => setShowPhysics(!showPhysics)} className={`px-2 py-1 rounded-lg text-[10px] font-mono border ${showPhysics ? 'border-primary/30 text-primary' : 'border-border text-muted-foreground'}`}>Physics</button>
              <select value={gridSize} onChange={e => setGridSize(Number(e.target.value))} className="bg-card border border-border rounded-lg px-2 py-1 text-[10px] font-mono text-foreground">
                {GRID_SIZES.map(s => <option key={s} value={s}>{s}px</option>)}
              </select>
              <span className="flex-1" />
              <button onClick={deleteSelected} className="px-2 py-1 rounded-lg text-[10px] font-mono border border-destructive/30 text-destructive hover:bg-destructive/10">Delete</button>
              <button onClick={exportScene} className="px-2 py-1 rounded-lg text-[10px] font-mono bg-primary text-primary-foreground font-semibold">Export</button>
            </div>

            <div className="grid grid-cols-[200px_1fr_220px] gap-3">
              {/* Left Panel: Layers + Objects */}
              <div className="space-y-3">
                {/* Layers (#42) */}
                <div className="rounded-xl border border-border bg-card p-2.5">
                  <p className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground mb-2">Layers</p>
                  {layers.map(layer => (
                    <div key={layer.id} className={`flex items-center gap-1.5 rounded-lg px-2 py-1 mb-1 cursor-pointer transition-colors ${activeLayer === layer.id ? 'bg-primary/10' : 'hover:bg-accent'}`}
                      onClick={() => setActiveLayer(layer.id)}>
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: layer.color }} />
                      <button onClick={(e) => { e.stopPropagation(); setLayers(prev => prev.map(l => l.id === layer.id ? { ...l, visible: !l.visible } : l)); }}
                        className={`text-[10px] ${layer.visible ? 'text-foreground' : 'text-muted-foreground/30'}`}>
                        {layer.visible ? '👁' : '👁‍🗨'}
                      </button>
                      <span className="text-[10px] font-mono flex-1">{layer.name}</span>
                      <button onClick={(e) => { e.stopPropagation(); setLayers(prev => prev.map(l => l.id === layer.id ? { ...l, locked: !l.locked } : l)); }}
                        className="text-[10px] text-muted-foreground">
                        {layer.locked ? '🔒' : '🔓'}
                      </button>
                    </div>
                  ))}
                </div>

                {/* Object types to place */}
                {tool === 'place' && (
                  <div className="rounded-xl border border-border bg-card p-2.5">
                    <p className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground mb-2">Place Object</p>
                    {OBJECT_TYPES.map(ot => (
                      <button key={ot.type} onClick={() => setPlaceType(ot.type)}
                        className={`w-full flex items-center gap-2 rounded-lg px-2 py-1.5 mb-1 text-left transition-colors ${placeType === ot.type ? 'bg-primary/10 border border-primary/30' : 'border border-transparent hover:bg-accent'}`}>
                        <span className="text-sm">{ot.icon}</span>
                        <span className="text-[10px] font-mono">{ot.label}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Tile palette (#46) */}
                {tool === 'tile' && (
                  <div className="rounded-xl border border-border bg-card p-2.5">
                    <p className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground mb-2">Tile Palette</p>
                    <div className="grid grid-cols-4 gap-1 mb-2">
                      {TILE_PALETTE.map(t => (
                        <button key={t.id} onClick={() => setSelectedTile(t.id)}
                          className={`h-8 rounded border-2 transition-colors ${selectedTile === t.id ? 'border-primary' : 'border-transparent'}`}
                          style={{ backgroundColor: t.color }} title={t.label} />
                      ))}
                    </div>
                    <div className="flex gap-1">
                      {(['paint', 'fill', 'line', 'rect'] as const).map(tt => (
                        <button key={tt} onClick={() => setTileTool(tt)}
                          className={`flex-1 rounded px-1 py-0.5 text-[9px] font-mono ${tileTool === tt ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                          {tt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Scene objects list */}
                <div className="rounded-xl border border-border bg-card p-2.5">
                  <p className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground mb-2">Objects ({objects.length})</p>
                  <div className="max-h-[200px] overflow-auto space-y-0.5">
                    {objects.map(obj => (
                      <button key={obj.id} onClick={() => setSelectedId(obj.id)}
                        className={`w-full text-left flex items-center gap-1.5 rounded px-2 py-1 text-[10px] font-mono transition-colors ${selectedId === obj.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: obj.color }} />
                        {obj.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Canvas */}
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <canvas ref={canvasRef} width={canvasSize.w} height={canvasSize.h}
                  onClick={handleCanvasClick}
                  className="w-full cursor-crosshair" style={{ imageRendering: 'pixelated' }} />
              </div>

              {/* Right Panel: Properties + Level Generator */}
              <div className="space-y-3">
                {/* Properties Inspector */}
                <div className="rounded-xl border border-border bg-card p-2.5">
                  <p className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground mb-2">Properties</p>
                  {selectedObj ? (
                    <div className="space-y-2">
                      {[
                        { key: 'label', label: 'Label', type: 'text' },
                        { key: 'x', label: 'X', type: 'number' },
                        { key: 'y', label: 'Y', type: 'number' },
                        { key: 'width', label: 'Width', type: 'number' },
                        { key: 'height', label: 'Height', type: 'number' },
                        { key: 'rotation', label: 'Rotation', type: 'number' },
                      ].map(prop => (
                        <div key={prop.key}>
                          <label className="text-[8px] font-mono text-muted-foreground">{prop.label}</label>
                          <input
                            type={prop.type}
                            value={(selectedObj as any)[prop.key]}
                            onChange={(e) => {
                              const val = prop.type === 'number' ? Number(e.target.value) : e.target.value;
                              setObjects(prev => prev.map(o => o.id === selectedId ? { ...o, [prop.key]: val } : o));
                            }}
                            className="w-full bg-background border border-border rounded px-2 py-0.5 text-[10px] font-mono text-foreground focus:outline-none"
                          />
                        </div>
                      ))}
                      <div>
                        <label className="text-[8px] font-mono text-muted-foreground">Color</label>
                        <input type="color" value={selectedObj.color}
                          onChange={(e) => setObjects(prev => prev.map(o => o.id === selectedId ? { ...o, color: e.target.value } : o))}
                          className="w-full h-6 rounded cursor-pointer" />
                      </div>
                    </div>
                  ) : (
                    <p className="text-[10px] text-muted-foreground font-mono">Select an object</p>
                  )}
                </div>

                {/* Level from Description (#48) */}
                <div className="rounded-xl border border-border bg-card p-2.5">
                  <p className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground mb-2">Generate from Description</p>
                  <textarea value={levelPrompt} onChange={(e) => setLevelPrompt(e.target.value)}
                    placeholder="e.g. 'three platforms, two patrolling enemies, a coin trail leading to a chest'"
                    className="w-full bg-background border border-border rounded-lg text-[10px] font-mono p-2 min-h-[60px] resize-none text-foreground placeholder:text-muted-foreground focus:outline-none" />
                  <button onClick={handleGenerateLevel} disabled={!levelPrompt.trim() || isGeneratingLevel}
                    className="w-full mt-1.5 rounded-lg bg-primary px-3 py-1.5 text-[10px] font-heading font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity">
                    {isGeneratingLevel ? 'Generating...' : '✨ Generate Level'}
                  </button>
                </div>

                {/* Stats */}
                <div className="rounded-xl border border-border bg-card p-2.5">
                  <p className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5">Stats</p>
                  <div className="space-y-1 text-[10px] font-mono text-muted-foreground">
                    <div className="flex justify-between"><span>Objects</span><span className="text-foreground">{objects.length}</span></div>
                    <div className="flex justify-between"><span>Tiles</span><span className="text-foreground">{Object.keys(tileMap).length}</span></div>
                    <div className="flex justify-between"><span>Nav Regions</span><span className="text-foreground">{navMeshRegions.length}</span></div>
                    <div className="flex justify-between"><span>Grid</span><span className="text-foreground">{gridSize}px</span></div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </>
  );
};

export default SceneEditor;
