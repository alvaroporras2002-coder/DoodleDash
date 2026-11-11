import { useCallback, useEffect, useRef, useState } from 'react';
import { Circle, Download, Eraser, Minus, PaintBucket, Pencil, Redo2, Send, Square, Trash2, Undo2 } from 'lucide-react';
import './DrawingCanvas.css';

type Tool = 'pen' | 'eraser' | 'fill' | 'line' | 'rect' | 'ellipse';
type Point = { x: number; y: number };
export interface DrawingCanvasProps {
  onSubmit: (image: string) => void;
  onDraftChange?: (image:string) => void;
  disabled?: boolean;
  backgroundImage?: string;
  draftKey?: string;
}
const WIDTH = 900;
const HEIGHT = 560;
const PALETTE = ['#30253e', '#ffffff', '#7041d6', '#b59ae9', '#cbed8e', '#315b44', '#73ac88', '#82b7c9', '#e8c46e', '#d77c9d', '#d45353', '#a6a6a6'];
const TOOLS = [
  { key: 'pen', label: 'Pencil', Icon: Pencil },
  { key: 'eraser', label: 'Eraser', Icon: Eraser },
  { key: 'fill', label: 'Fill', Icon: PaintBucket },
  { key: 'line', label: 'Line', Icon: Minus },
  { key: 'rect', label: 'Rectangle', Icon: Square },
  { key: 'ellipse', label: 'Ellipse', Icon: Circle },
] as const;

/** Fill the connected area without recursively exhausting the browser stack. */
function floodFill(context: CanvasRenderingContext2D, point: Point, color: string) {
  const frame = context.getImageData(0, 0, WIDTH, HEIGHT);
  const data = frame.data;
  const x = Math.min(WIDTH - 1, Math.max(0, Math.floor(point.x)));
  const y = Math.min(HEIGHT - 1, Math.max(0, Math.floor(point.y)));
  const start = y * WIDTH + x;
  const offset = start * 4;
  const original = [data[offset], data[offset + 1], data[offset + 2], data[offset + 3]];
  const replacement = [parseInt(color.slice(1, 3), 16), parseInt(color.slice(3, 5), 16), parseInt(color.slice(5, 7), 16), 255];
  if (original.every((value, index) => value === replacement[index])) return;
  const queue = new Int32Array(WIDTH * HEIGHT);
  const visited = new Uint8Array(WIDTH * HEIGHT);
  let head = 0;
  let tail = 0;
  queue[tail++] = start;
  visited[start] = 1;
  const matches = (pixel: number) => {
    const index = pixel * 4;
    return original.every((value, channel) => Math.abs(data[index + channel] - value) <= 10);
  };
  while (head < tail) {
    const pixel = queue[head++];
    if (!matches(pixel)) continue;
    const index = pixel * 4;
    for (let channel = 0; channel < 4; channel++) data[index + channel] = replacement[channel];
    const column = pixel % WIDTH;
    for (const next of [column > 0 ? pixel - 1 : -1, column < WIDTH - 1 ? pixel + 1 : -1, pixel >= WIDTH ? pixel - WIDTH : -1, pixel < WIDTH * (HEIGHT - 1) ? pixel + WIDTH : -1]) {
      if (next >= 0 && !visited[next]) {
        visited[next] = 1;
        queue[tail++] = next;
      }
    }
  }
  context.putImageData(frame, 0, 0);
}

export function DrawingCanvas({ onSubmit, onDraftChange, disabled = false, backgroundImage, draftKey }: DrawingCanvasProps) {
  const draftCallback=useRef(onDraftChange);
  draftCallback.current=onDraftChange;
  const dirty=useRef(false),revision=useRef(0),emitted=useRef(-1),persisted=useRef(-1);
  const exportCache=useRef<{revision:number;image:string}|null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const backgroundRef = useRef<HTMLImageElement | null>(null);
  const historyRef = useRef<ImageData[]>([]);
  const historyIndexRef = useRef(-1);
  const gestureRef = useRef<{ start: Point; last: Point; before: ImageData; pointerId: number } | null>(null);
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState('#30253e');
  const [size, setSize] = useState(6);
  const [historyState, setHistoryState] = useState({ index: -1, length: 0 });
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const locked = disabled || loading;

  const saveDraft = useCallback(() => {
    if (!canvasRef.current||!dirty.current) return;
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {
      draftTimerRef.current=null;
      try { if(draftKey&&persisted.current!==revision.current){localStorage.setItem(`doodledash:drawing:${draftKey}`, canvasRef.current!.toDataURL('image/png'));persisted.current=revision.current;} }
      catch { /* A full or unavailable browser store must not interrupt a live round. */ }
      emitDraft();
    }, 500);
  }, [draftKey]);

  useEffect(()=>{const timer=setInterval(()=>{if(!disabled)emitDraft();},1200);return()=>clearInterval(timer);},[disabled]);

  const checkpoint = useCallback(() => {
    const context = canvasRef.current?.getContext('2d', { willReadFrequently: true });
    if (!context) return;
    const history = historyRef.current.slice(0, historyIndexRef.current + 1);
    history.push(context.getImageData(0, 0, WIDTH, HEIGHT));
    // Four RGBA bytes per pixel; twelve snapshots stay below ~25 MB.
    if (history.length > 12) history.shift();
    historyRef.current = history;
    historyIndexRef.current = history.length - 1;
    setHistoryState({ index: historyIndexRef.current, length: history.length });
    saveDraft();
  }, [saveDraft]);

  useEffect(() => {
    const context = canvasRef.current?.getContext('2d', { willReadFrequently: true });
    if (!context) return;
    let cancelled = false;
    setLoading(true);
    context.clearRect(0, 0, WIDTH, HEIGHT);
    revision.current++;emitted.current=-1;persisted.current=-1;exportCache.current=null;dirty.current=false;
    gestureRef.current = null;
    historyRef.current = [];
    historyIndexRef.current = -1;
    let stored: string | null = null;
    try { stored = draftKey ? localStorage.getItem(`doodledash:drawing:${draftKey}`) : null; } catch { /* Optional persistence. */ }
    const finish = () => { if (!cancelled) { checkpoint(); setLoading(false); } };
    if (stored?.startsWith('data:image/png;base64,')) {
      const draft = new Image();
      draft.onload = () => { if (!cancelled) { context.drawImage(draft, 0, 0, WIDTH, HEIGHT);dirty.current=true;revision.current++; finish(); } };
      draft.onerror = finish;
      draft.src = stored;
    } else finish();
    return () => { cancelled = true; if (draftTimerRef.current) clearTimeout(draftTimerRef.current); };
  }, [draftKey, checkpoint]);

  useEffect(() => {
    backgroundRef.current = null;
    if (!backgroundImage) return;
    let cancelled = false;
    const image = new Image();
    image.onload = () => { if (!cancelled){backgroundRef.current = image;dirty.current=true;revision.current++;saveDraft();} };
    image.src = backgroundImage;
    return () => { cancelled = true; };
  }, [backgroundImage]);

  const travel = useCallback((delta: number) => {
    if (locked || gestureRef.current) return;
    const index = historyIndexRef.current + delta;
    const frame = historyRef.current[index];
    const context = canvasRef.current?.getContext('2d');
    if (!frame || !context) return;
    context.putImageData(frame, 0, 0);dirty.current=true;revision.current++;
    historyIndexRef.current = index;
    setHistoryState({ index, length: historyRef.current.length });
    saveDraft();
  }, [locked, saveDraft]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest?.('input, textarea, select, [contenteditable="true"]')||document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        travel(event.shiftKey ? 1 : -1);return;
      }
      if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='y'){event.preventDefault();travel(1);return;}
      if(locked||event.ctrlKey||event.metaKey||event.altKey)return;
      const shortcuts:Record<string,Tool>={p:'pen',e:'eraser',f:'fill',l:'line',r:'rect',o:'ellipse'};
      const chosen=shortcuts[event.key.toLowerCase()];if(chosen){event.preventDefault();setTool(chosen);}
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [travel,locked]);

  useEffect(() => {
    if (!disabled || !gestureRef.current) return;
    gestureRef.current = null;
    checkpoint();
  }, [disabled, checkpoint]);

  const coordinates = (event: React.PointerEvent<HTMLCanvasElement>): Point => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return { x: Math.max(0, Math.min(WIDTH, (event.clientX - bounds.left) * WIDTH / bounds.width)), y: Math.max(0, Math.min(HEIGHT, (event.clientY - bounds.top) * HEIGHT / bounds.height)) };
  };
  const configure = (context: CanvasRenderingContext2D) => {
    context.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
    context.strokeStyle = color;
    context.fillStyle = color;
    context.lineWidth = tool === 'eraser' ? size * 3 : size;
    context.lineCap = 'round';
    context.lineJoin = 'round';
  };
  const pointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (locked || event.button !== 0 || gestureRef.current) return;
    const context = event.currentTarget.getContext('2d', { willReadFrequently: true });
    if (!context) return;
    const point = coordinates(event);
    setNotice('');dirty.current=true;revision.current++;
    if (tool === 'fill') { floodFill(context, point, color); checkpoint(); return; }
    event.currentTarget.setPointerCapture(event.pointerId);
    gestureRef.current = { start: point, last: point, before: context.getImageData(0, 0, WIDTH, HEIGHT), pointerId: event.pointerId };
    configure(context);
    if (tool === 'pen' || tool === 'eraser') {
      context.beginPath();
      context.moveTo(point.x, point.y);
      context.lineTo(point.x + .01, point.y + .01);
      context.stroke();
    }
  };
  const pointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const gesture = gestureRef.current;
    if (!gesture || locked || gesture.pointerId !== event.pointerId) return;
    const context = event.currentTarget.getContext('2d');
    if (!context) return;
    const point = coordinates(event);
    configure(context);
    if (tool === 'pen' || tool === 'eraser') {
      context.beginPath();
      context.moveTo(gesture.last.x, gesture.last.y);
      context.lineTo(point.x, point.y);
      context.stroke();
    } else {
      context.putImageData(gesture.before, 0, 0);
      context.beginPath();
      if (tool === 'line') { context.moveTo(gesture.start.x, gesture.start.y); context.lineTo(point.x, point.y); }
      if (tool === 'rect') context.rect(gesture.start.x, gesture.start.y, point.x - gesture.start.x, point.y - gesture.start.y);
      if (tool === 'ellipse') context.ellipse((gesture.start.x + point.x) / 2, (gesture.start.y + point.y) / 2, Math.abs(point.x - gesture.start.x) / 2, Math.abs(point.y - gesture.start.y) / 2, 0, 0, Math.PI * 2);
      context.stroke();
    }
    revision.current++;
    gesture.last = point;
    saveDraft();
  };
  const pointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!gestureRef.current || gestureRef.current.pointerId !== event.pointerId) return;
    gestureRef.current = null;
    event.currentTarget.getContext('2d')!.globalCompositeOperation = 'source-over';
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    checkpoint();
  };
  const clear = () => {
    if (locked || !window.confirm('Clear the whole drawing? You can restore it with Undo.')) return;
    canvasRef.current!.getContext('2d')!.clearRect(0, 0, WIDTH, HEIGHT);
    dirty.current=true;revision.current++;checkpoint();
    setNotice('Canvas cleared. Use Undo to restore your drawing.');
  };
  function emitDraft(){
    if(!canvasRef.current||!dirty.current||!draftCallback.current||emitted.current===revision.current)return;
    const current=revision.current;
    draftCallback.current(exportImage());emitted.current=current;
  }
  function exportImage() {
    if(exportCache.current?.revision===revision.current)return exportCache.current.image;
    const composite = document.createElement('canvas');
    composite.width = WIDTH;
    composite.height = HEIGHT;
    const context = composite.getContext('2d')!;
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, WIDTH, HEIGHT);
    if (backgroundRef.current) context.drawImage(backgroundRef.current, 0, 0, WIDTH, HEIGHT);
    context.drawImage(canvasRef.current!, 0, 0);
    let result = composite.toDataURL('image/png');
    // Keep the encoded payload under the server's limit even for noisy drawings.
    for (let scale = .85; result.length > 420_000 && scale > .15; scale *= .8) {
      const resized = document.createElement('canvas');
      resized.width = Math.round(WIDTH * scale);
      resized.height = Math.round(HEIGHT * scale);
      resized.getContext('2d')!.drawImage(composite, 0, 0, resized.width, resized.height);
      result = resized.toDataURL('image/png');
    }
    exportCache.current={revision:revision.current,image:result};
    return result;
  };
  const download = () => {
    const link = document.createElement('a');
    link.download = 'doodleonline-drawing.png';
    link.href = exportImage();
    link.click();
  };
  const submit = () => {
    if (locked) return;
    const pixels = canvasRef.current!.getContext('2d')!.getImageData(0, 0, WIDTH, HEIGHT).data;
    const hasInk = pixels.some((value, index) => index % 4 === 3 && value > 0);
    if (!hasInk && !backgroundRef.current && !window.confirm('Your canvas is empty. Submit it anyway?')) return;
    const image = exportImage();
    if (image.length > 450_000) { setNotice('The drawing is too large. Try simplifying it before submitting.'); return; }
    onSubmit(image);
  };

  return <section className="drawing-editor" aria-label="Drawing editor">
    <div className="drawing-toolbar">
      <div className="drawing-tools" role="group" aria-label="Tools">
        {TOOLS.map(({ key, label, Icon }) => <button type="button" key={key} className={`drawing-tool ${tool === key ? 'selected' : ''}`} title={`${label} (${{pen:'P',eraser:'E',fill:'F',line:'L',rect:'R',ellipse:'O'}[key]})`} aria-label={label} aria-pressed={tool === key} disabled={locked} onClick={() => setTool(key)}><Icon size={19} /></button>)}
      </div>
      <div className="drawing-colors" role="group" aria-label="Colors">
        {PALETTE.map(value => <button type="button" key={value} className={`drawing-swatch ${color === value ? 'selected' : ''}`} style={{ backgroundColor: value }} aria-label={`Color ${value}`} title={value} aria-pressed={color === value} disabled={locked} onClick={() => setColor(value)} />)}
        <label className="drawing-custom-color" title="Choose another color"><input type="color" value={color} onChange={event => setColor(event.target.value)} aria-label="Choose another color" disabled={locked} /></label>
      </div>
      <label className="drawing-width"><span>Size <strong>{size}</strong></span><input type="range" min="2" max="40" value={size} disabled={locked} onChange={event => setSize(Number(event.target.value))} aria-label="Brush size" /></label>
    </div>
    <div className="drawing-paper" style={backgroundImage ? { backgroundImage: `url(${backgroundImage})` } : undefined}>
      <canvas data-testid="drawing-canvas" ref={canvasRef} width={WIDTH} height={HEIGHT} className={locked ? 'drawing-locked' : tool === 'eraser' ? 'drawing-eraser' : ''} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} onLostPointerCapture={pointerUp} aria-label="Drawing canvas. Use a mouse or stylus to draw." />
      {disabled && <div className="drawing-lock-label">Drawing submitted</div>}
    </div>
    <div className="drawing-footer">
      <div className="drawing-actions" role="group" aria-label="Drawing actions">
        <button type="button" className="drawing-tool" aria-label="Undo" title="Undo (Ctrl + Z)" onClick={() => travel(-1)} disabled={locked || historyState.index <= 0}><Undo2 size={19} /></button>
        <button type="button" className="drawing-tool" aria-label="Redo" title="Redo (Ctrl + Shift + Z)" onClick={() => travel(1)} disabled={locked || historyState.index >= historyState.length - 1}><Redo2 size={19} /></button>
        <span className="drawing-action-divider" />
        <button type="button" className="drawing-tool" aria-label="Clear canvas" title="Clear canvas" onClick={clear} disabled={locked}><Trash2 size={18} /></button>
        <button type="button" className="drawing-tool" aria-label="Download drawing" title="Download PNG" onClick={download} disabled={loading}><Download size={18} /></button>
      </div>
      <details className="drawing-shortcuts"><summary>Shortcuts</summary><p>P Pencil · E Eraser · F Fill · L Line · R Rectangle · O Ellipse<br/>Ctrl / ⌘ + Z Undo · Ctrl + Y / ⌘ + Shift + Z Redo</p></details>
      <button type="button" className="drawing-submit" disabled={locked} onClick={submit}>Submit drawing <Send size={17} /></button>
    </div>
    {notice && <p className="drawing-notice" role="status">{notice}</p>}
  </section>;
}

export default DrawingCanvas;
