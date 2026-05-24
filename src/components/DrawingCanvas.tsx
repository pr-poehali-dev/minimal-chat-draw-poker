import { useRef, useEffect, useState, useCallback } from 'react';
import Icon from '@/components/ui/icon';

interface Layer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  canvas: HTMLCanvasElement | null;
}

const PALETTE = [
  '#e8d5a3', '#f5c842', '#e8a020', '#d44', '#e84393',
  '#9b59b6', '#3498db', '#1abc9c', '#2ecc71', '#27ae60',
  '#000000', '#333333', '#666666', '#999999', '#cccccc', '#ffffff',
];

const BRUSH_SIZES = [2, 4, 8, 14, 22];

type Tool = 'pen' | 'eraser' | 'fill' | 'line';

export default function DrawingCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRefs = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const [color, setColor] = useState('#e8d5a3');
  const [customColor, setCustomColor] = useState('#e8d5a3');
  const [brushSize, setBrushSize] = useState(4);
  const [tool, setTool] = useState<Tool>('pen');
  const [showLayers, setShowLayers] = useState(false);
  const [layers, setLayers] = useState<Layer[]>([
    { id: 'l1', name: 'Основной', visible: true, opacity: 1, canvas: null },
    { id: 'l2', name: 'Детали', visible: true, opacity: 0.85, canvas: null },
  ]);
  const [activeLayer, setActiveLayer] = useState('l1');

  const getPos = useCallback((e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  const draw = useCallback((canvas: HTMLCanvasElement, from: { x: number; y: number }, to: { x: number; y: number }) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = color;
    ctx.lineWidth = tool === 'eraser' ? brushSize * 2 : brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  }, [color, brushSize, tool]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRefs.current.get(activeLayer);
    if (!canvas) return;
    isDrawing.current = true;
    const pos = getPos(e, canvas);
    lastPos.current = pos;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, (tool === 'eraser' ? brushSize : brushSize / 2), 0, Math.PI * 2);
      ctx.fill();
    }
  }, [activeLayer, color, brushSize, tool, getPos]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDrawing.current) return;
    const canvas = canvasRefs.current.get(activeLayer);
    if (!canvas || !lastPos.current) return;
    const pos = getPos(e, canvas);
    draw(canvas, lastPos.current, pos);
    lastPos.current = pos;
  }, [activeLayer, draw, getPos]);

  const handleMouseUp = useCallback(() => {
    isDrawing.current = false;
    lastPos.current = null;
  }, []);

  const clearCanvas = () => {
    const canvas = canvasRefs.current.get(activeLayer);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
  };

  const addLayer = () => {
    const id = `l${Date.now()}`;
    setLayers(prev => [...prev, { id, name: `Слой ${prev.length + 1}`, visible: true, opacity: 1, canvas: null }]);
    setActiveLayer(id);
  };

  const toggleLayerVisibility = (id: string) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, visible: !l.visible } : l));
  };

  const deleteLayer = (id: string) => {
    if (layers.length <= 1) return;
    setLayers(prev => prev.filter(l => l.id !== id));
    if (activeLayer === id) setActiveLayer(layers.find(l => l.id !== id)?.id || 'l1');
  };

  return (
    <div className="flex flex-col h-full gap-2">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Tools */}
        <div className="flex gap-1 bg-[hsl(var(--muted))] p-1 rounded-lg">
          {([['pen', 'Pen'], ['eraser', 'Eraser'], ['fill', 'PaintBucket'], ['line', 'Minus']] as [Tool, string][]).map(([t, icon]) => (
            <button
              key={t}
              onClick={() => setTool(t)}
              className={`p-1.5 rounded-md transition-colors ${tool === t ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'}`}
            >
              <Icon name={icon} size={14} />
            </button>
          ))}
        </div>

        {/* Brush sizes */}
        <div className="flex items-center gap-1 bg-[hsl(var(--muted))] px-2 py-1.5 rounded-lg">
          {BRUSH_SIZES.map(s => (
            <button
              key={s}
              onClick={() => setBrushSize(s)}
              className={`rounded-full transition-all flex items-center justify-center ${brushSize === s ? 'bg-[hsl(var(--primary))]' : 'bg-[hsl(var(--border))]'}`}
              style={{ width: s + 8, height: s + 8, minWidth: 10, minHeight: 10 }}
            />
          ))}
        </div>

        <div className="ml-auto flex gap-1">
          {/* Layers toggle */}
          <button
            onClick={() => setShowLayers(!showLayers)}
            className={`p-1.5 rounded-lg border transition-colors ${showLayers ? 'border-[hsl(var(--primary))] text-[hsl(var(--primary))]' : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]'}`}
          >
            <Icon name="Layers" size={14} />
          </button>
          {/* Clear */}
          <button
            onClick={clearCanvas}
            className="p-1.5 rounded-lg border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:border-red-500 hover:text-red-400 transition-colors"
          >
            <Icon name="Trash2" size={14} />
          </button>
        </div>
      </div>

      <div className="flex gap-2 flex-1 min-h-0">
        {/* Canvas area */}
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          {/* Color palette */}
          <div className="flex items-center gap-1 flex-wrap">
            {PALETTE.map(c => (
              <button
                key={c}
                onClick={() => { setColor(c); setCustomColor(c); }}
                className={`rounded-full transition-transform hover:scale-110 ${color === c ? 'ring-2 ring-[hsl(var(--primary))] ring-offset-1 ring-offset-[hsl(var(--background))]' : ''}`}
                style={{ width: 18, height: 18, backgroundColor: c, border: c === '#ffffff' ? '1px solid hsl(var(--border))' : 'none' }}
              />
            ))}
            {/* Custom color picker */}
            <label className="relative cursor-pointer">
              <div
                className={`rounded-full w-[18px] h-[18px] ring-offset-1 ring-offset-[hsl(var(--background))] overflow-hidden border border-[hsl(var(--border))] ${!PALETTE.includes(color) ? 'ring-2 ring-[hsl(var(--primary))]' : ''}`}
                style={{ background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)' }}
              />
              <input type="color" value={customColor} onChange={e => { setCustomColor(e.target.value); setColor(e.target.value); }}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
            </label>
            <div className="w-5 h-5 rounded-full border-2 border-[hsl(var(--border))] ml-1" style={{ backgroundColor: color }} />
          </div>

          {/* Canvas */}
          <div
            ref={containerRef}
            className="relative flex-1 rounded-xl overflow-hidden border border-[hsl(var(--border))] bg-white"
            style={{ cursor: tool === 'eraser' ? 'cell' : tool === 'fill' ? 'crosshair' : 'crosshair' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {layers.map((layer, i) => (
              <canvas
                key={layer.id}
                ref={el => {
                  if (el) {
                    canvasRefs.current.set(layer.id, el);
                    if (!el.width) {
                      el.width = 800;
                      el.height = 400;
                    }
                  }
                }}
                className="absolute inset-0 w-full h-full"
                style={{
                  opacity: layer.visible ? layer.opacity : 0,
                  zIndex: i + 1,
                  pointerEvents: layer.id === activeLayer && layer.visible ? 'auto' : 'none',
                }}
              />
            ))}
            {/* Watermark */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 0 }}>
              <span className="text-gray-100 text-4xl font-cormorant select-none">Royal Canvas</span>
            </div>
          </div>
        </div>

        {/* Layers panel */}
        {showLayers && (
          <div className="w-36 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-2 flex flex-col gap-2 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] font-semibold">Слои</span>
              <button onClick={addLayer} className="text-[hsl(var(--primary))] hover:opacity-70 transition-opacity">
                <Icon name="Plus" size={12} />
              </button>
            </div>
            <div className="flex flex-col gap-1 flex-1 overflow-y-auto">
              {[...layers].reverse().map(layer => (
                <div
                  key={layer.id}
                  onClick={() => setActiveLayer(layer.id)}
                  className={`flex items-center gap-1.5 p-1.5 rounded-lg cursor-pointer transition-colors ${activeLayer === layer.id ? 'bg-[hsl(var(--accent))] border border-[hsl(var(--primary))]' : 'hover:bg-[hsl(var(--muted))]'}`}
                >
                  <button onClick={e => { e.stopPropagation(); toggleLayerVisibility(layer.id); }}
                    className={`shrink-0 ${layer.visible ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))]'}`}>
                    <Icon name={layer.visible ? 'Eye' : 'EyeOff'} size={11} />
                  </button>
                  <span className="text-xs truncate flex-1 text-[hsl(var(--foreground))]">{layer.name}</span>
                  {layers.length > 1 && (
                    <button onClick={e => { e.stopPropagation(); deleteLayer(layer.id); }}
                      className="text-[hsl(var(--muted-foreground))] hover:text-red-400 transition-colors shrink-0">
                      <Icon name="X" size={10} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
