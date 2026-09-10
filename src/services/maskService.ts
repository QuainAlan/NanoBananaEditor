import type { BrushStroke, ImageRef } from '../types';
import { generateId, loadImage } from '../utils/imageUtils';

function drawStrokes(ctx: CanvasRenderingContext2D, strokes: BrushStroke[]) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const stroke of strokes) {
    if (stroke.points.length < 2) continue;
    ctx.globalCompositeOperation = stroke.erase ? 'destination-out' : 'source-over';
    ctx.strokeStyle = '#ffffff';
    ctx.fillStyle = '#ffffff';
    ctx.lineWidth = stroke.brushSize;
    if (stroke.points.length === 2) {
      ctx.beginPath();
      ctx.arc(stroke.points[0], stroke.points[1], stroke.brushSize / 2, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    ctx.beginPath();
    ctx.moveTo(stroke.points[0], stroke.points[1]);
    for (let i = 2; i < stroke.points.length; i += 2) ctx.lineTo(stroke.points[i], stroke.points[i + 1]);
    ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';
}

/**
 * Build the two images Gemini needs for a region edit:
 *  - mask: black background, white where the user painted
 *  - preview: the source with a translucent purple overlay on the painted region
 */
export async function buildMaskImages(
  source: ImageRef,
  strokes: BrushStroke[]
): Promise<{ mask: ImageRef; preview: ImageRef; coverage: number }> {
  const img = await loadImage(source.dataUrl);
  const w = img.width;
  const h = img.height;

  // Alpha mask of the painted region
  const alpha = document.createElement('canvas');
  alpha.width = w;
  alpha.height = h;
  const actx = alpha.getContext('2d')!;
  drawStrokes(actx, strokes);

  // Coverage estimate (sampled)
  const sample = actx.getImageData(0, 0, w, h).data;
  let painted = 0;
  let total = 0;
  for (let i = 3; i < sample.length; i += 4 * 16) {
    total++;
    if (sample[i] > 10) painted++;
  }
  const coverage = total ? painted / total : 0;

  // Black/white mask
  const mask = document.createElement('canvas');
  mask.width = w;
  mask.height = h;
  const mctx = mask.getContext('2d')!;
  mctx.fillStyle = '#000000';
  mctx.fillRect(0, 0, w, h);
  mctx.drawImage(alpha, 0, 0);

  // Purple overlay preview
  const preview = document.createElement('canvas');
  preview.width = w;
  preview.height = h;
  const pctx = preview.getContext('2d')!;
  pctx.drawImage(img, 0, 0);
  const tint = document.createElement('canvas');
  tint.width = w;
  tint.height = h;
  const tctx = tint.getContext('2d')!;
  tctx.fillStyle = '#a855f7';
  tctx.fillRect(0, 0, w, h);
  tctx.globalCompositeOperation = 'destination-in';
  tctx.drawImage(alpha, 0, 0);
  pctx.globalAlpha = 0.45;
  pctx.drawImage(tint, 0, 0);
  pctx.globalAlpha = 1;

  return {
    mask: { id: generateId(), dataUrl: mask.toDataURL('image/png'), mimeType: 'image/png', width: w, height: h },
    preview: { id: generateId(), dataUrl: preview.toDataURL('image/png'), mimeType: 'image/png', width: w, height: h },
    coverage,
  };
}
