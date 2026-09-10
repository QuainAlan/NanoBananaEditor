import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Stage, Layer, Image as KonvaImage, Line, Circle } from 'react-konva';
import type Konva from 'konva';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  Copy,
  Eraser,
  Brush,
  Undo2,
  Trash2,
  Eye,
  EyeOff,
  SplitSquareHorizontal,
  PencilLine,
  ImagePlus,
  ArrowUpToLine,
  Check,
  ChevronDown,
} from 'lucide-react';
import { useAppStore, selectSelectedItem } from '../store/useAppStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useCredits } from '../hooks/useCredits';
import { registerAction, triggerAction } from '../lib/actions';
import { MODELS, SIZE_LABELS } from '../lib/models';
import { convertDataUrl, copyImageToClipboard, downloadDataUrl, loadImage, slugify } from '../utils/imageUtils';
import { toast } from '../store/useToastStore';
import { cn } from '../utils/cn';
import { Button, IconButton } from './ui/Button';
import { LogoMark } from './Logo';
import { CompareSlider } from './CompareSlider';
import type { BrushStroke } from '../types';

const SAMPLE_PROMPTS = [
  'Editorial photo of a ceramic coffee cup on a marble counter, soft window light, 85mm',
  'Isometric illustration of a tiny cozy bookshop at night, warm lamps, rain outside',
  'A poster for a jazz night with the headline "Blue Hour" in bold serif type',
  'Macro shot of dew drops on a spider web at sunrise, bokeh background',
];

export const Canvas: React.FC = () => {
  const {
    canvasImage,
    canvasZoom,
    setCanvasZoom,
    canvasPan,
    setCanvasPan,
    mode,
    setMode,
    brushStrokes,
    addBrushStroke,
    undoBrushStroke,
    clearBrushStrokes,
    brushSize,
    setBrushSize,
    brushErase,
    setBrushErase,
    showMasks,
    setShowMasks,
    isGenerating,
    generatingCount,
    generatingStartedAt,
    settings,
    compareMode,
    setCompareMode,
    setPrompt,
    addReference,
    updateSettings,
    setModel,
  } = useAppStore();
  const selected = useAppStore(selectSelectedItem);
  const downloadFormat = useSettingsStore((s) => s.downloadFormat);
  const setDownloadFormat = useSettingsStore((s) => s.setDownloadFormat);
  const { byok, balance } = useCredits();

  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const [drawing, setDrawing] = useState(false);
  const [current, setCurrent] = useState<number[]>([]);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [showFormats, setShowFormats] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  // Resize observer for the stage
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setStageSize({ width: el.clientWidth, height: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fitZoom = useCallback(
    (img: HTMLImageElement) => {
      const pad = 0.92;
      return Math.min((stageSize.width * pad) / img.width, (stageSize.height * pad) / img.height, 1.5);
    },
    [stageSize]
  );

  // Load image and fit
  useEffect(() => {
    let cancelled = false;
    if (!canvasImage) {
      setImage(null);
      return;
    }
    loadImage(canvasImage.dataUrl)
      .then((img) => {
        if (cancelled) return;
        setImage(img);
        setCanvasZoom(fitZoom(img));
        setCanvasPan({ x: 0, y: 0 });
      })
      .catch(() => toast.error('Could not display this image'));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasImage?.id]);

  // Refit when the viewport changes and the user has not zoomed
  useEffect(() => {
    if (image && canvasPan.x === 0 && canvasPan.y === 0) setCanvasZoom(fitZoom(image));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageSize.width, stageSize.height]);

  // Elapsed timer while generating
  useEffect(() => {
    if (!isGenerating || !generatingStartedAt) {
      setElapsed(0);
      return;
    }
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - generatingStartedAt) / 1000)), 500);
    return () => clearInterval(t);
  }, [isGenerating, generatingStartedAt]);

  const imagePos = useMemo(() => {
    if (!image) return { x: 0, y: 0 };
    return {
      x: (stageSize.width / canvasZoom - image.width) / 2,
      y: (stageSize.height / canvasZoom - image.height) / 2,
    };
  }, [image, stageSize, canvasZoom]);

  const toImageCoords = (stage: Konva.Stage) => {
    const p = stage.getRelativePointerPosition();
    if (!p || !image) return null;
    return { x: p.x - imagePos.x, y: p.y - imagePos.y };
  };

  const inBounds = (p: { x: number; y: number }) => image != null && p.x >= 0 && p.y >= 0 && p.x <= image.width && p.y <= image.height;

  const onPointerDown = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (mode !== 'mask' || !image) return;
    const stage = e.target.getStage();
    if (!stage) return;
    const p = toImageCoords(stage);
    if (!p || !inBounds(p)) return;
    setDrawing(true);
    setCurrent([p.x, p.y]);
  };

  const onPointerMove = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    const stage = e.target.getStage();
    if (!stage || !image) return;
    const p = toImageCoords(stage);
    if (mode === 'mask' && p) setCursor(p);
    if (!drawing || !p) return;
    setCurrent((c) => [...c, Math.max(0, Math.min(image.width, p.x)), Math.max(0, Math.min(image.height, p.y))]);
  };

  const onPointerUp = () => {
    if (!drawing) return;
    setDrawing(false);
    if (current.length >= 2) {
      const stroke: BrushStroke = { id: `s-${Date.now()}`, points: current, brushSize: brushSize / Math.max(0.25, Math.min(1, canvasZoom)) * canvasZoom, erase: brushErase };
      // Brush size is expressed in image pixels regardless of zoom
      stroke.brushSize = brushSize / canvasZoom;
      addBrushStroke(stroke);
    }
    setCurrent([]);
  };

  const onWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    const oldScale = canvasZoom;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const factor = 1.08;
    const newScale = Math.max(0.05, Math.min(6, direction > 0 ? oldScale * factor : oldScale / factor));
    const mousePointTo = { x: (pointer.x - stage.x()) / oldScale, y: (pointer.y - stage.y()) / oldScale };
    const newPos = { x: pointer.x - mousePointTo.x * newScale, y: pointer.y - mousePointTo.y * newScale };
    setCanvasZoom(newScale);
    setCanvasPan({ x: newPos.x / newScale, y: newPos.y / newScale });
  };

  const zoomBy = (factor: number) => setCanvasZoom(Math.max(0.05, Math.min(6, canvasZoom * factor)));
  const fit = () => {
    if (image) {
      setCanvasZoom(fitZoom(image));
      setCanvasPan({ x: 0, y: 0 });
    }
  };

  const download = useCallback(
    async (format = downloadFormat) => {
      if (!canvasImage) return;
      try {
        const url = await convertDataUrl(canvasImage.dataUrl, format);
        const base = selected ? slugify(selected.prompt) : 'nano-banana';
        downloadDataUrl(url, `${base}-${Date.now().toString(36)}.${format === 'jpeg' ? 'jpg' : format}`);
      } catch {
        toast.error('Download failed');
      }
    },
    [canvasImage, downloadFormat, selected]
  );

  useEffect(() => registerAction('download', () => void download()), [download]);

  const copy = async () => {
    if (!canvasImage) return;
    try {
      await copyImageToClipboard(canvasImage.dataUrl);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Clipboard blocked', 'Your browser did not allow image copy. Download instead.');
    }
  };

  const useAsReference = () => {
    if (!canvasImage) return;
    if (addReference({ ...canvasImage, id: `${canvasImage.id}-ref-${Date.now().toString(36)}` })) toast.success('Added as a reference');
    else toast.warning('Reference slots are full for this model');
  };

  const upscale = () => {
    if (!canvasImage) return;
    const pro = MODELS['gemini-3-pro-image'];
    const cost = pro.credits['4K'];
    if (!byok && balance < cost) {
      toast.custom({ kind: 'warning', title: `4K upscale needs ${cost} credits`, description: `You have ${balance}.`, action: { label: 'Get credits', onClick: () => triggerAction('openPurchase') } });
      return;
    }
    setMode('edit');
    setModel('gemini-3-pro-image');
    updateSettings({ size: '4K', variants: 1 });
    setPrompt('Recreate this exact image at the highest possible resolution with sharper fine detail and cleaner edges. Do not change the composition, subject, colours, lighting or any element.');
    setTimeout(() => triggerAction('generate'), 50);
  };

  const canCompare = Boolean(selected?.inputs.source && canvasImage?.id === selected?.output.id);
  const spec = MODELS[settings.model];

  return (
    <div className="relative flex h-full min-w-0 flex-1 flex-col">
      {/* Toolbar */}
      <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-line bg-surface/70 px-2 backdrop-blur md:px-3">
        <div className="flex items-center gap-1">
          <IconButton label="Zoom out" size="icon-sm" onClick={() => zoomBy(1 / 1.25)} disabled={!image}>
            <ZoomOut className="h-4 w-4" />
          </IconButton>
          <button onClick={fit} className="w-12 text-center font-mono text-xs tabular-nums text-muted hover:text-ink" title="Fit (0)">
            {Math.round(canvasZoom * 100)}%
          </button>
          <IconButton label="Zoom in" size="icon-sm" onClick={() => zoomBy(1.25)} disabled={!image}>
            <ZoomIn className="h-4 w-4" />
          </IconButton>
          <IconButton label="Fit to screen (0)" size="icon-sm" onClick={fit} disabled={!image}>
            <Maximize2 className="h-4 w-4" />
          </IconButton>

          {mode === 'mask' && image && (
            <div className="ml-2 flex items-center gap-1 rounded-lg border border-line bg-surface-2/60 px-2 py-1">
              <IconButton label="Brush (X)" size="icon-sm" onClick={() => setBrushErase(false)} className={cn(!brushErase && 'bg-mask/20 text-mask')}>
                <Brush className="h-4 w-4" />
              </IconButton>
              <IconButton label="Eraser (X)" size="icon-sm" onClick={() => setBrushErase(true)} className={cn(brushErase && 'bg-mask/20 text-mask')}>
                <Eraser className="h-4 w-4" />
              </IconButton>
              <input
                type="range"
                min={4}
                max={200}
                value={brushSize}
                onChange={(e) => setBrushSize(parseInt(e.target.value, 10))}
                className="slider mx-1 w-20"
                title={`Brush ${brushSize}px`}
              />
              <span className="w-8 text-right font-mono text-[10px] text-muted">{brushSize}</span>
              <IconButton label="Undo stroke (Z)" size="icon-sm" onClick={undoBrushStroke} disabled={!brushStrokes.length}>
                <Undo2 className="h-4 w-4" />
              </IconButton>
              <IconButton label="Clear mask" size="icon-sm" onClick={clearBrushStrokes} disabled={!brushStrokes.length}>
                <Trash2 className="h-4 w-4" />
              </IconButton>
              <IconButton label={showMasks ? 'Hide mask' : 'Show mask'} size="icon-sm" onClick={() => setShowMasks(!showMasks)}>
                {showMasks ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </IconButton>
            </div>
          )}
        </div>

        {image && (
          <div className="flex items-center gap-1">
            {canCompare && (
              <Button variant={compareMode ? 'secondary' : 'ghost'} size="sm" onClick={() => setCompareMode(!compareMode)} title="Before / after (C)">
                <SplitSquareHorizontal className="h-4 w-4" />
                <span className="hidden lg:inline">Compare</span>
              </Button>
            )}
            {mode === 'generate' && (
              <Button variant="ghost" size="sm" onClick={() => setMode('edit')} title="Edit this image (E)">
                <PencilLine className="h-4 w-4" />
                <span className="hidden lg:inline">Edit</span>
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={useAsReference} title="Use as a reference image">
              <ImagePlus className="h-4 w-4" />
              <span className="hidden lg:inline">Reference</span>
            </Button>
            {selected && selected.size !== '4K' && (
              <Button variant="ghost" size="sm" onClick={upscale} title={`Re-render at 4K with Nano Banana Pro (${MODELS['gemini-3-pro-image'].credits['4K']} credits)`}>
                <ArrowUpToLine className="h-4 w-4" />
                <span className="hidden lg:inline">4K</span>
              </Button>
            )}
            <IconButton label="Copy image" size="icon-sm" onClick={copy}>
              <Copy className="h-4 w-4" />
            </IconButton>
            <div className="relative">
              <div className="flex">
                <Button variant="secondary" size="sm" className="rounded-r-none" onClick={() => void download()} title="Download (D)">
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">{downloadFormat.toUpperCase()}</span>
                </Button>
                <Button variant="secondary" size="sm" className="rounded-l-none border-l-0 px-1.5" onClick={() => setShowFormats((v) => !v)} aria-label="Choose format">
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </div>
              {showFormats && (
                <div className="absolute right-0 top-full z-20 mt-1 w-36 rounded-lg border border-line bg-surface p-1 shadow-pop animate-fade-in" onMouseLeave={() => setShowFormats(false)}>
                  {(['png', 'jpeg', 'webp'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => {
                        setDownloadFormat(f);
                        setShowFormats(false);
                        void download(f);
                      }}
                      className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs text-ink hover:bg-surface-2"
                    >
                      {f.toUpperCase()}
                      {downloadFormat === f && <Check className="h-3 w-3 text-accent-text" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Stage */}
      <div ref={containerRef} className="canvas-backdrop relative flex-1 overflow-hidden">
        {!image && !isGenerating && (
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="max-w-lg text-center animate-slide-up">
              <LogoMark size={56} className="mx-auto mb-5 drop-shadow-lg" />
              <h2 className="font-display text-2xl font-semibold text-ink">What are we making?</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted">
                {mode === 'generate'
                  ? 'Describe it in the composer. Reference photos, real-world grounding and 4K output are all one click away.'
                  : 'Drop, paste or upload an image, then tell the model what to change. Paint a mask to keep the edit local.'}
              </p>
              {mode === 'generate' && (
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {SAMPLE_PROMPTS.map((p) => (
                    <button
                      key={p}
                      onClick={() => setPrompt(p)}
                      className="max-w-[260px] truncate rounded-full border border-line bg-surface px-3 py-1.5 text-left text-xs text-ink-2 shadow-soft transition-colors hover:border-accent hover:text-ink"
                      title={p}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {image && compareMode && selected?.inputs.source && (
          <CompareSlider before={selected.inputs.source.dataUrl} after={canvasImage!.dataUrl} onClose={() => setCompareMode(false)} />
        )}

        {!compareMode && (
          <Stage
            ref={stageRef}
            width={stageSize.width}
            height={stageSize.height}
            scaleX={canvasZoom}
            scaleY={canvasZoom}
            x={canvasPan.x * canvasZoom}
            y={canvasPan.y * canvasZoom}
            draggable={mode !== 'mask' && !!image}
            onDragEnd={(e) => setCanvasPan({ x: e.target.x() / canvasZoom, y: e.target.y() / canvasZoom })}
            onWheel={onWheel}
            onMouseDown={onPointerDown}
            onMouseMove={onPointerMove}
            onMouseUp={onPointerUp}
            onMouseLeave={() => {
              setCursor(null);
              onPointerUp();
            }}
            onTouchStart={onPointerDown}
            onTouchMove={onPointerMove}
            onTouchEnd={onPointerUp}
            style={{ cursor: mode === 'mask' && image ? 'none' : image ? 'grab' : 'default' }}
          >
            <Layer>{image && <KonvaImage image={image} x={imagePos.x} y={imagePos.y} />}</Layer>
            <Layer opacity={showMasks ? 0.55 : 0} listening={false}>
              {brushStrokes.map((s) => (
                <Line
                  key={s.id}
                  points={s.points}
                  stroke="#a855f7"
                  strokeWidth={s.brushSize}
                  tension={0.3}
                  lineCap="round"
                  lineJoin="round"
                  globalCompositeOperation={s.erase ? 'destination-out' : 'source-over'}
                  x={imagePos.x}
                  y={imagePos.y}
                />
              ))}
              {drawing && current.length >= 2 && (
                <Line
                  points={current}
                  stroke="#a855f7"
                  strokeWidth={brushSize / canvasZoom}
                  tension={0.3}
                  lineCap="round"
                  lineJoin="round"
                  globalCompositeOperation={brushErase ? 'destination-out' : 'source-over'}
                  x={imagePos.x}
                  y={imagePos.y}
                />
              )}
            </Layer>
            <Layer listening={false}>
              {mode === 'mask' && cursor && image && (
                <Circle
                  x={imagePos.x + cursor.x}
                  y={imagePos.y + cursor.y}
                  radius={brushSize / canvasZoom / 2}
                  stroke={brushErase ? '#ffffff' : '#a855f7'}
                  strokeWidth={1.5 / canvasZoom}
                  dash={brushErase ? [4 / canvasZoom, 4 / canvasZoom] : undefined}
                />
              )}
            </Layer>
          </Stage>
        )}

        {isGenerating && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-bg/60 backdrop-blur-[2px] animate-fade-in">
            <div className="w-72 rounded-2xl border border-line bg-surface p-5 shadow-pop">
              <div className="flex items-center gap-3">
                <div className="relative h-10 w-10">
                  <div className="absolute inset-0 rounded-full border-2 border-accent/30" />
                  <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-accent" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-ink">
                    {generatingCount > 1 ? `Rendering ${generatingCount} variants` : 'Rendering'}
                  </div>
                  <div className="text-xs text-muted">
                    {spec.name} · {SIZE_LABELS[settings.size].label}
                  </div>
                </div>
              </div>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-3">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-accent to-accent-2 transition-all duration-500"
                  style={{ width: `${Math.min(92, (elapsed / spec.typicalSeconds[1]) * 100)}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-[11px] text-muted">
                <span>{elapsed}s</span>
                <span>usually {spec.typicalSeconds[0]} to {spec.typicalSeconds[1]}s</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="flex h-8 shrink-0 items-center justify-between gap-3 overflow-hidden whitespace-nowrap border-t border-line bg-surface/70 px-3 text-[11px] text-muted">
        <div className="flex min-w-0 items-center gap-3 overflow-hidden">
          {image && (
            <span className="font-mono tabular-nums">
              {image.width} × {image.height}
            </span>
          )}
          {selected && (
            <span className="hidden truncate sm:inline">
              {MODELS[selected.model].name} · {SIZE_LABELS[selected.size].label}
              {selected.aspectRatio ? ` · ${selected.aspectRatio}` : ''} · {selected.byok ? 'own key' : `${selected.credits} cr`}
            </span>
          )}
          {mode === 'mask' && brushStrokes.length > 0 && <span className="text-mask">{brushStrokes.length} stroke{brushStrokes.length === 1 ? '' : 's'}</span>}
        </div>
        <div className="hidden shrink-0 items-center gap-1 lg:flex">
          <span>© 2026</span>
          <a href="https://markfulton.com" target="_blank" rel="noopener noreferrer" className="hover:text-ink">
            Mark Fulton
          </a>
          <span>·</span>
          <a href="https://www.reinventing.ai" target="_blank" rel="noopener noreferrer" className="hover:text-ink">
            Reinventing.AI
          </a>
        </div>
      </div>
    </div>
  );
};
