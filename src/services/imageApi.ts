import type { ImageSize, ModelId, ThinkingLevel } from '../lib/models';
import type { GroundingInfo, UsageInfo } from '../types';

export interface ApiImage {
  data: string;
  mimeType: string;
  role?: 'source' | 'reference' | 'mask' | 'mask-preview';
}

export interface ApiHistoryTurn {
  role: 'user' | 'model';
  text?: string;
  image?: { data: string; mimeType: string };
}

export interface ImageApiRequest {
  mode: 'generate' | 'edit';
  model: ModelId;
  prompt: string;
  images?: ApiImage[];
  aspectRatio?: string;
  size?: ImageSize;
  thinkingLevel?: ThinkingLevel;
  useSearch?: boolean;
  seed?: number;
  temperature?: number;
  history?: ApiHistoryTurn[];
}

export interface ImageApiResponse {
  images: { data: string; mimeType: string }[];
  text?: string;
  model: ModelId;
  size: ImageSize;
  aspectRatio?: string;
  credits: number;
  byok: boolean;
  balance: number | null;
  usage: UsageInfo;
  grounding?: GroundingInfo;
  durationMs: number;
}

export class ImageApiError extends Error {
  status: number;
  code?: string;
  needed?: number;
  balance?: number;
  constructor(message: string, status: number, extra?: { code?: string; needed?: number; balance?: number }) {
    super(message);
    this.name = 'ImageApiError';
    this.status = status;
    this.code = extra?.code;
    this.needed = extra?.needed;
    this.balance = extra?.balance;
  }
}

export async function runImageRequest(
  request: ImageApiRequest,
  auth: { accessToken: string; byokKey?: string; signal?: AbortSignal }
): Promise<ImageApiResponse> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/nano-image`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${auth.accessToken}`,
    apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
  };
  if (auth.byokKey) headers['x-gemini-key'] = auth.byokKey;

  let response: Response;
  try {
    response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(request), signal: auth.signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw new ImageApiError('Cancelled', 0, { code: 'aborted' });
    throw new ImageApiError('Network error. Check your connection and try again.', 0);
  }

  let payload: { error?: string; needed?: number; balance?: number } | null = null;
  try {
    payload = await response.json();
  } catch {
    /* non-JSON body */
  }

  if (!response.ok) {
    if (response.status === 402 || payload?.error === 'insufficient_credits') {
      throw new ImageApiError('Not enough credits for this request.', 402, {
        code: 'insufficient_credits',
        needed: payload?.needed,
        balance: payload?.balance,
      });
    }
    throw new ImageApiError(payload?.error || `Request failed (${response.status})`, response.status);
  }

  return payload as ImageApiResponse;
}
