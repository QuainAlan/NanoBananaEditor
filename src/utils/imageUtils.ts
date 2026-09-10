import type { ImageRef } from '../types';

export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function splitDataUrl(dataUrl: string): { mimeType: string; data: string } {
  const match = /^data:([^;,]+)?(?:;base64)?,(.*)$/s.exec(dataUrl);
  if (!match) return { mimeType: 'image/png', data: dataUrl };
  return { mimeType: match[1] || 'image/png', data: match[2] };
}

export function toDataUrl(data: string, mimeType: string): string {
  return `data:${mimeType};base64,${data}`;
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not decode image'));
    img.src = src;
  });
}

export function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * Turn any image file into an ImageRef, downscaling very large inputs so the
 * request stays small. Gemini looks at inputs at roughly 1K anyway.
 */
export async function fileToImageRef(file: Blob, name?: string, maxSide = 2048): Promise<ImageRef> {
  const original = await fileToDataUrl(file);
  const img = await loadImage(original);
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const isPng = file.type === 'image/png';
  if (scale >= 1 && (file.type === 'image/png' || file.type === 'image/jpeg' || file.type === 'image/webp')) {
    return { id: generateId(), dataUrl: original, mimeType: file.type, width: img.width, height: img.height, name };
  }
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
  const mimeType = isPng ? 'image/png' : 'image/jpeg';
  const dataUrl = canvas.toDataURL(mimeType, 0.92);
  return { id: generateId(), dataUrl, mimeType, width: canvas.width, height: canvas.height, name };
}

export async function imageRefFromBase64(data: string, mimeType: string): Promise<ImageRef> {
  const dataUrl = toDataUrl(data, mimeType);
  try {
    const img = await loadImage(dataUrl);
    return { id: generateId(), dataUrl, mimeType, width: img.width, height: img.height };
  } catch {
    return { id: generateId(), dataUrl, mimeType };
  }
}

export async function convertDataUrl(dataUrl: string, format: 'png' | 'jpeg' | 'webp', quality = 0.94): Promise<string> {
  const img = await loadImage(dataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d')!;
  if (format === 'jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(img, 0, 0);
  return canvas.toDataURL(`image/${format}`, quality);
}

export function downloadDataUrl(dataUrl: string, filename: string): void {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export async function copyImageToClipboard(dataUrl: string): Promise<void> {
  const png = await convertDataUrl(dataUrl, 'png');
  const blob = await (await fetch(png)).blob();
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function dataUrlBytes(dataUrl: string): number {
  const { data } = splitDataUrl(dataUrl);
  return Math.floor((data.length * 3) / 4);
}

export function slugify(text: string, max = 40): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, max) || 'image'
  );
}

export function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
