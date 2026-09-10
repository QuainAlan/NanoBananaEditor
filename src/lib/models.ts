/**
 * Single source of truth for the Gemini image models this editor exposes,
 * what each one can do, and what each request costs in credits.
 *
 * The edge function keeps a byte-for-byte copy of this file at
 * supabase/functions/nano-image/models.ts. `npm run sync:models` copies it.
 * Never edit the copy by hand.
 */

export type ModelId =
  | 'gemini-3.1-flash-lite-image'
  | 'gemini-3.1-flash-image'
  | 'gemini-3-pro-image';

export type ImageSize = '512' | '1K' | '2K' | '4K';
export type ThinkingLevel = 'MINIMAL' | 'HIGH';
export type ModelTier = 'fast' | 'standard' | 'pro';

export interface ModelSpec {
  id: ModelId;
  name: string;
  short: string;
  tier: ModelTier;
  tagline: string;
  strengths: string[];
  sizes: ImageSize[];
  defaultSize: ImageSize;
  aspectRatios: string[];
  /** Hard cap on input images per request (references + edit source + mask). */
  maxInputImages: number;
  supportsSearch: boolean;
  /** Whether thinkingLevel can be set. Pro always thinks and ignores it. */
  thinkingControl: boolean;
  /** Credits charged per output image at each size. */
  credits: Record<ImageSize, number>;
  /** Google list price per output image in USD, for the BYOK display. */
  apiCostUsd: Record<ImageSize, number>;
  typicalSeconds: [number, number];
}

export const STANDARD_RATIOS = ['1:1', '3:2', '2:3', '4:3', '3:4', '5:4', '4:5', '16:9', '9:16', '21:9'];
export const EXTENDED_RATIOS = [...STANDARD_RATIOS, '4:1', '1:4', '8:1', '1:8'];

export const SEARCH_GROUNDING_CREDITS = 1;
export const USD_PER_CREDIT = 22 / 150;

export const MODELS: Record<ModelId, ModelSpec> = {
  'gemini-3.1-flash-lite-image': {
    id: 'gemini-3.1-flash-lite-image',
    name: 'Nano Banana 2 Lite',
    short: 'Lite',
    tier: 'fast',
    tagline: 'Fastest and cheapest. Drafts, thumbnails, quick iterations.',
    strengths: ['Sub-5 second renders', 'Up to 14 reference images', 'Legible text'],
    sizes: ['1K'],
    defaultSize: '1K',
    aspectRatios: EXTENDED_RATIOS,
    maxInputImages: 14,
    supportsSearch: false,
    thinkingControl: true,
    credits: { '512': 1, '1K': 1, '2K': 1, '4K': 1 },
    apiCostUsd: { '512': 0.0336, '1K': 0.0336, '2K': 0.0336, '4K': 0.0336 },
    typicalSeconds: [3, 8],
  },
  'gemini-3.1-flash-image': {
    id: 'gemini-3.1-flash-image',
    name: 'Nano Banana 2',
    short: 'Standard',
    tier: 'standard',
    tagline: 'The everyday workhorse. Pro-level quality at Flash speed, up to 4K.',
    strengths: ['512px to 4K output', 'Google Search grounding', 'Up to 10 reference images', 'Extended ratios like 4:1'],
    sizes: ['512', '1K', '2K', '4K'],
    defaultSize: '1K',
    aspectRatios: EXTENDED_RATIOS,
    maxInputImages: 10,
    supportsSearch: true,
    thinkingControl: true,
    credits: { '512': 1, '1K': 1, '2K': 2, '4K': 3 },
    apiCostUsd: { '512': 0.045, '1K': 0.067, '2K': 0.101, '4K': 0.151 },
    typicalSeconds: [8, 25],
  },
  'gemini-3-pro-image': {
    id: 'gemini-3-pro-image',
    name: 'Nano Banana Pro',
    short: 'Pro',
    tier: 'pro',
    tagline: 'Best quality and prompt adherence. Complex scenes, infographics, typography.',
    strengths: ['Deepest reasoning before it renders', 'Best text rendering', 'Character consistency up to 5 refs', '4K output'],
    sizes: ['1K', '2K', '4K'],
    defaultSize: '1K',
    aspectRatios: STANDARD_RATIOS,
    maxInputImages: 6,
    supportsSearch: true,
    thinkingControl: false,
    credits: { '512': 3, '1K': 3, '2K': 3, '4K': 5 },
    apiCostUsd: { '512': 0.134, '1K': 0.134, '2K': 0.134, '4K': 0.24 },
    typicalSeconds: [15, 45],
  },
};

export const MODEL_LIST: ModelSpec[] = [
  MODELS['gemini-3.1-flash-lite-image'],
  MODELS['gemini-3.1-flash-image'],
  MODELS['gemini-3-pro-image'],
];

export const DEFAULT_MODEL: ModelId = 'gemini-3.1-flash-image';

export function isModelId(value: unknown): value is ModelId {
  return typeof value === 'string' && value in MODELS;
}

/** Clamp a size to what the model supports. */
export function resolveSize(model: ModelId, size: ImageSize | undefined): ImageSize {
  const spec = MODELS[model];
  if (size && spec.sizes.includes(size)) return size;
  return spec.defaultSize;
}

export function resolveAspectRatio(model: ModelId, ratio: string | undefined): string | undefined {
  if (!ratio) return undefined;
  return MODELS[model].aspectRatios.includes(ratio) ? ratio : undefined;
}

export interface CostInput {
  model: ModelId;
  size: ImageSize;
  useSearch?: boolean;
  variants?: number;
}

/** Credits for one request, before multiplying by variants. */
export function creditsPerImage({ model, size, useSearch }: CostInput): number {
  const spec = MODELS[model];
  const base = spec.credits[resolveSize(model, size)];
  const search = useSearch && spec.supportsSearch ? SEARCH_GROUNDING_CREDITS : 0;
  return base + search;
}

export function totalCredits(input: CostInput): number {
  return creditsPerImage(input) * Math.max(1, input.variants ?? 1);
}

export function apiCostUsd({ model, size, useSearch }: CostInput): number {
  const spec = MODELS[model];
  const base = spec.apiCostUsd[resolveSize(model, size)];
  return base + (useSearch && spec.supportsSearch ? 0.014 : 0);
}

export const SIZE_LABELS: Record<ImageSize, { label: string; hint: string }> = {
  '512': { label: '512', hint: 'Tiny, fastest' },
  '1K': { label: '1K', hint: 'About 1024 px' },
  '2K': { label: '2K', hint: 'About 2048 px' },
  '4K': { label: '4K', hint: 'About 4096 px' },
};

export const RATIO_GROUPS: { label: string; ratios: string[] }[] = [
  { label: 'Square', ratios: ['1:1'] },
  { label: 'Landscape', ratios: ['3:2', '4:3', '5:4', '16:9', '21:9'] },
  { label: 'Portrait', ratios: ['2:3', '3:4', '4:5', '9:16'] },
  { label: 'Banner', ratios: ['4:1', '8:1', '1:4', '1:8'] },
];
