import type { ImageSize, ModelId, ThinkingLevel } from '../lib/models';

export type Mode = 'generate' | 'edit' | 'mask';

export interface ImageRef {
  id: string;
  dataUrl: string;
  mimeType: string;
  width?: number;
  height?: number;
  name?: string;
}

export interface GroundingInfo {
  queries: string[];
  sources: { title?: string; uri: string }[];
}

export interface UsageInfo {
  promptTokens: number;
  outputTokens: number;
  thoughtTokens: number;
}

export interface HistoryItem {
  id: string;
  kind: 'generate' | 'edit';
  prompt: string;
  model: ModelId;
  size: ImageSize;
  aspectRatio?: string;
  thinkingLevel?: ThinkingLevel;
  useSearch?: boolean;
  seed?: number;
  temperature?: number;
  inputs: {
    source?: ImageRef;
    references: ImageRef[];
    maskPreview?: ImageRef;
  };
  output: ImageRef;
  batchId?: string;
  variantIndex?: number;
  variantCount?: number;
  text?: string;
  grounding?: GroundingInfo;
  credits: number;
  byok: boolean;
  usage?: UsageInfo;
  durationMs?: number;
  parentId?: string;
  createdAt: number;
}

export interface BrushStroke {
  id: string;
  points: number[];
  brushSize: number;
  erase?: boolean;
}

export interface PromptHint {
  category: 'subject' | 'scene' | 'style' | 'camera' | 'text' | 'edit';
  text: string;
  example: string;
}
