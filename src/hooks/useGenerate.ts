import { useCallback, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { toast } from '../store/useToastStore';
import { useCredits } from './useCredits';
import { getAccessToken } from './useAuth';
import { runImageRequest, ImageApiError, type ApiHistoryTurn, type ApiImage, type ImageApiRequest } from '../services/imageApi';
import { buildMaskImages } from '../services/maskService';
import { MODELS, creditsPerImage, totalCredits } from '../lib/models';
import { generateId, imageRefFromBase64, splitDataUrl } from '../utils/imageUtils';
import { triggerAction } from '../lib/actions';
import type { HistoryItem, ImageRef } from '../types';

const MAX_CHAIN_TURNS = 2;

/** Walk back through parent edits to build a short multi-turn history. */
function buildConversation(history: HistoryItem[], canvasImage: ImageRef | null): ApiHistoryTurn[] {
  if (!canvasImage) return [];
  const byOutput = history.find((h) => h.output.id === canvasImage.id);
  if (!byOutput) return [];
  const chain: HistoryItem[] = [];
  let cursor: HistoryItem | undefined = byOutput;
  while (cursor && chain.length < MAX_CHAIN_TURNS) {
    chain.unshift(cursor);
    cursor = cursor.parentId ? history.find((h) => h.id === cursor!.parentId) : undefined;
  }
  // Drop the last item: its output is the source image sent in the final turn.
  const prior = chain.slice(0, -1);
  const turns: ApiHistoryTurn[] = [];
  for (const item of prior) {
    const { data, mimeType } = splitDataUrl(item.output.dataUrl);
    turns.push({ role: 'user', text: item.prompt });
    turns.push({ role: 'model', image: { data, mimeType } });
  }
  // Include the last item's prompt as context without repeating its image.
  const last = chain[chain.length - 1];
  if (last && prior.length > 0) turns.push({ role: 'user', text: last.prompt });
  return turns;
}

export function useGenerate() {
  const store = useAppStore();
  const byokKey = useSettingsStore((s) => s.byokKey);
  const { balance, byok, setBalance, refresh } = useCredits();

  const { mode, prompt, settings, canvasImage, brushStrokes, isGenerating } = store;
  const spec = MODELS[settings.model];
  const isEdit = mode !== 'generate';

  const perImage = creditsPerImage({ model: settings.model, size: settings.size, useSearch: settings.useSearch });
  const cost = totalCredits({ model: settings.model, size: settings.size, useSearch: settings.useSearch, variants: settings.variants });

  const blocker = useMemo(() => {
    if (isGenerating) return 'Working on it';
    if (!prompt.trim()) return isEdit ? 'Describe the change' : 'Describe the image';
    if (isEdit && !canvasImage) return 'Add an image to edit';
    if (mode === 'mask' && brushStrokes.length === 0) return 'Paint the region to change';
    if (!byok && balance < cost) return `Needs ${cost} credits, you have ${balance}`;
    return null;
  }, [isGenerating, prompt, isEdit, canvasImage, mode, brushStrokes.length, byok, balance, cost]);

  const run = useCallback(async () => {
    const s = useAppStore.getState();
    if (s.isGenerating) return;
    const text = s.prompt.trim();
    if (!text) return;

    const accessToken = await getAccessToken();
    if (!accessToken) {
      toast.error('Sign in to generate images');
      return;
    }

    const images: ApiImage[] = [];
    let maskPreview: ImageRef | undefined;
    let source: ImageRef | undefined;

    if (s.mode !== 'generate') {
      if (!s.canvasImage) {
        toast.warning('Add an image first', 'Upload one or pick a result from your history.');
        return;
      }
      source = s.canvasImage;
      const src = splitDataUrl(source.dataUrl);
      images.push({ data: src.data, mimeType: src.mimeType, role: 'source' });
      if (s.brushStrokes.length > 0) {
        const built = await buildMaskImages(source, s.brushStrokes);
        if (built.coverage < 0.0005) {
          toast.warning('The painted region is tiny', 'Paint a larger area or clear the mask to edit the whole image.');
          return;
        }
        maskPreview = built.preview;
        const p = splitDataUrl(built.preview.dataUrl);
        const m = splitDataUrl(built.mask.dataUrl);
        images.push({ data: p.data, mimeType: p.mimeType, role: 'mask-preview' });
        images.push({ data: m.data, mimeType: m.mimeType, role: 'mask' });
      }
    }
    for (const ref of s.references) {
      const r = splitDataUrl(ref.dataUrl);
      images.push({ data: r.data, mimeType: r.mimeType, role: 'reference' });
    }

    const modelSpec = MODELS[s.settings.model];
    if (images.length > modelSpec.maxInputImages) {
      toast.error(`${modelSpec.name} takes up to ${modelSpec.maxInputImages} images`, 'Remove a few references or switch model.');
      return;
    }

    const history = s.mode !== 'generate' && s.settings.keepConversation ? buildConversation(s.history, s.canvasImage) : [];
    const parentItem = source ? s.history.find((h) => h.output.id === source!.id) : undefined;

    const base: ImageApiRequest = {
      mode: s.mode === 'generate' ? 'generate' : 'edit',
      model: s.settings.model,
      prompt: text,
      images: images.length ? images : undefined,
      aspectRatio: s.mode === 'generate' ? s.settings.aspectRatio ?? undefined : undefined,
      size: s.settings.size,
      thinkingLevel: modelSpec.thinkingControl ? s.settings.thinkingLevel : undefined,
      useSearch: modelSpec.supportsSearch ? s.settings.useSearch : false,
      temperature: s.settings.temperature,
      history: history.length ? history : undefined,
    };

    const count = s.settings.variants;
    const batchId = count > 1 ? generateId() : undefined;
    s.setGenerating(count);

    const jobs = Array.from({ length: count }, (_, i) => {
      const seed = s.settings.seed != null ? s.settings.seed + i : undefined;
      return runImageRequest({ ...base, seed }, { accessToken, byokKey: byokKey || undefined })
        .then(async (res) => {
          const first = res.images[0];
          const output = await imageRefFromBase64(first.data, first.mimeType);
          const item: HistoryItem = {
            id: generateId(),
            kind: base.mode,
            prompt: text,
            model: res.model,
            size: res.size,
            aspectRatio: res.aspectRatio ?? (source ? undefined : s.settings.aspectRatio ?? undefined),
            thinkingLevel: base.thinkingLevel,
            useSearch: base.useSearch,
            seed,
            temperature: base.temperature,
            inputs: { source, references: s.references, maskPreview },
            output,
            batchId,
            variantIndex: i,
            variantCount: count,
            text: res.text,
            grounding: res.grounding,
            credits: res.credits,
            byok: res.byok,
            usage: res.usage,
            durationMs: res.durationMs,
            parentId: parentItem?.id,
            createdAt: Date.now(),
          };
          return { item, balance: res.balance };
        })
        .finally(() => {
          const st = useAppStore.getState();
          st.setGenerating(Math.max(0, st.generatingCount - 1));
        });
    });

    const results = await Promise.allSettled(jobs);
    const okItems = results.filter((r): r is PromiseFulfilledResult<{ item: HistoryItem; balance: number | null }> => r.status === 'fulfilled');
    const failures = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');

    if (okItems.length) {
      const items = okItems.map((r) => r.value.item);
      const st = useAppStore.getState();
      st.addHistoryItems(items);
      st.setCanvasImage(items[0].output);
      st.selectItem(items[0].id);
      const lastBalance = okItems[okItems.length - 1].value.balance;
      if (lastBalance != null) setBalance(lastBalance);
      else refresh();
      if (st.mode === 'mask') st.setMode('edit');
      if (items[0].text && items.length === 1) {
        toast.custom({ kind: 'info', title: 'Model note', description: items[0].text.slice(0, 220), duration: 7000 });
      }
    }

    const insufficient = failures.find((f) => f.reason instanceof ImageApiError && f.reason.code === 'insufficient_credits');
    if (insufficient) {
      const err = insufficient.reason as ImageApiError;
      toast.custom({
        kind: 'warning',
        title: 'Not enough credits',
        description: `This needs ${err.needed ?? perImage} credits and you have ${err.balance ?? balance}.`,
        action: { label: 'Get credits', onClick: () => triggerAction('openPurchase') },
        duration: 10000,
      });
      refresh();
    }
    const other = failures.filter((f) => !(f.reason instanceof ImageApiError && f.reason.code === 'insufficient_credits'));
    if (other.length) {
      const msg = other[0].reason instanceof Error ? other[0].reason.message : 'Something went wrong';
      toast.error(other.length > 1 ? `${other.length} variants failed` : 'Generation failed', msg);
      if (other.some((f) => f.reason instanceof ImageApiError && f.reason.status === 401)) {
        refresh();
      }
    }
    useAppStore.getState().setGenerating(0);
  }, [byokKey, balance, perImage, setBalance, refresh]);

  return { run, blocker, cost, perImage, spec, canRun: blocker === null };
}
