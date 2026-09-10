import React, { useState } from 'react';
import {
  History,
  Download,
  Trash2,
  PencilLine,
  ImagePlus,
  Copy,
  ChevronDown,
  ChevronRight,
  Code2,
  Globe,
  PanelRightClose,
  PanelRightOpen,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { useAppStore, selectSelectedItem } from '../store/useAppStore';
import { MODELS, SIZE_LABELS } from '../lib/models';
import { convertDataUrl, downloadDataUrl, slugify, timeAgo } from '../utils/imageUtils';
import { toast } from '../store/useToastStore';
import { cn } from '../utils/cn';
import { Button, IconButton } from './ui/Button';
import { ImagePreviewModal } from './ImagePreviewModal';
import type { HistoryItem } from '../types';

export const HistoryPanel: React.FC = () => {
  const { history, selectedId, selectItem, setCanvasImage, removeHistoryItem, clearHistory, showHistory, setShowHistory, setMode, setPrompt, addReference, updateSettings, setModel } =
    useAppStore();
  const selected = useAppStore(selectSelectedItem);
  const [preview, setPreview] = useState<{ url: string; title: string } | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  if (!showHistory) {
    return (
      <div className="hidden h-full w-11 shrink-0 flex-col items-center border-l border-line bg-surface py-3 md:flex">
        <IconButton label="Show history (H)" onClick={() => setShowHistory(true)}>
          <PanelRightOpen className="h-5 w-5" />
        </IconButton>
        {history.length > 0 && (
          <span className="mt-2 rounded-full bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold text-muted">{history.length}</span>
        )}
      </div>
    );
  }

  const open = (item: HistoryItem) => {
    selectItem(item.id);
    setCanvasImage(item.output);
  };

  const downloadItem = async (item: HistoryItem) => {
    const url = await convertDataUrl(item.output.dataUrl, 'png');
    downloadDataUrl(url, `${slugify(item.prompt)}-${item.id.slice(-5)}.png`);
  };

  const reuse = (item: HistoryItem) => {
    setPrompt(item.prompt);
    setModel(item.model);
    updateSettings({ size: item.size, aspectRatio: item.aspectRatio ?? null, useSearch: Boolean(item.useSearch), thinkingLevel: item.thinkingLevel ?? 'MINIMAL', seed: item.seed ?? null });
    toast.success('Settings restored', 'Prompt, model and options loaded into the composer.');
  };

  return (
    <aside
      className={cn(
        'flex h-full w-[min(320px,88vw)] shrink-0 flex-col border-l border-line bg-surface',
        'absolute inset-y-0 right-0 z-30 shadow-pop md:relative md:z-auto md:shadow-none'
      )}
    >
      <div className="flex h-12 items-center justify-between border-b border-line px-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink">
          <History className="h-4 w-4 text-muted" />
          History
          {history.length > 0 && <span className="rounded-full bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold text-muted">{history.length}</span>}
        </div>
        <div className="flex items-center gap-1">
          {history.length > 0 &&
            (confirmClear ? (
              <div className="flex items-center gap-1 text-xs">
                <Button size="xs" variant="danger" onClick={() => { clearHistory(); setConfirmClear(false); }}>
                  Delete all
                </Button>
                <Button size="xs" variant="ghost" onClick={() => setConfirmClear(false)}>
                  Keep
                </Button>
              </div>
            ) : (
              <IconButton label="Clear history" size="icon-sm" onClick={() => setConfirmClear(true)}>
                <Trash2 className="h-4 w-4" />
              </IconButton>
            ))}
          <IconButton label="Hide history (H)" size="icon-sm" onClick={() => setShowHistory(false)}>
            <PanelRightClose className="h-4 w-4" />
          </IconButton>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {history.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <Sparkles className="mb-3 h-6 w-6 text-muted" />
            <p className="text-sm font-medium text-ink">Nothing here yet</p>
            <p className="mt-1 text-xs text-muted">Every render lands here and stays in this browser, even after a refresh.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 p-3">
            {history.map((item) => {
              const active = item.id === selectedId;
              return (
                <button
                  key={item.id}
                  onClick={() => open(item)}
                  className={cn(
                    'group relative aspect-square overflow-hidden rounded-lg border bg-surface-2 text-left transition-all',
                    active ? 'border-accent shadow-glow' : 'border-line hover:border-line-strong'
                  )}
                  title={item.prompt}
                >
                  <img src={item.output.dataUrl} alt={item.prompt} className="h-full w-full object-cover" loading="lazy" />
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent px-1.5 pb-1 pt-4 text-[10px] font-medium text-white">
                    <span className={cn('rounded px-1', item.kind === 'edit' ? 'bg-mask/80' : 'bg-accent/90 text-black')}>
                      {item.kind === 'edit' ? 'Edit' : MODELS[item.model].short}
                    </span>
                    <span>{SIZE_LABELS[item.size].label}</span>
                  </div>
                  {item.variantCount && item.variantCount > 1 && (
                    <span className="absolute left-1.5 top-1.5 rounded bg-black/60 px-1 text-[10px] text-white">
                      {(item.variantIndex ?? 0) + 1}/{item.variantCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selected && (
        <div className="max-h-[48%] shrink-0 overflow-y-auto border-t border-line bg-surface-2/40 p-3">
          <div className="flex items-start justify-between gap-2">
            <p className="line-clamp-4 text-xs leading-relaxed text-ink" title={selected.prompt}>
              {selected.prompt}
            </p>
            <IconButton
              label="Copy prompt"
              size="icon-sm"
              onClick={() => {
                navigator.clipboard.writeText(selected.prompt);
                toast.success('Prompt copied');
              }}
            >
              <Copy className="h-3.5 w-3.5" />
            </IconButton>
          </div>

          <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
            <Meta k="Model" v={MODELS[selected.model].name} />
            <Meta k="Size" v={`${SIZE_LABELS[selected.size].label}${selected.output.width ? ` · ${selected.output.width}×${selected.output.height}` : ''}`} />
            {selected.aspectRatio && <Meta k="Ratio" v={selected.aspectRatio} />}
            <Meta k="Cost" v={selected.byok ? 'own key' : `${selected.credits} credit${selected.credits === 1 ? '' : 's'}`} />
            {selected.seed != null && <Meta k="Seed" v={String(selected.seed)} />}
            {selected.durationMs != null && <Meta k="Time" v={`${(selected.durationMs / 1000).toFixed(1)}s`} />}
            <Meta k="When" v={timeAgo(selected.createdAt)} />
            {selected.thinkingLevel && <Meta k="Thinking" v={selected.thinkingLevel === 'HIGH' ? 'Deep' : 'Fast'} />}
          </dl>

          {selected.text && (
            <div className="mt-2 rounded-lg border border-line bg-surface p-2 text-[11px] leading-relaxed text-ink-2">
              <span className="font-semibold text-muted">Model said: </span>
              {selected.text}
            </div>
          )}

          {selected.grounding && (selected.grounding.sources.length > 0 || selected.grounding.queries.length > 0) && (
            <div className="mt-2 rounded-lg border border-line bg-surface p-2 text-[11px]">
              <div className="mb-1 flex items-center gap-1 font-semibold text-muted">
                <Globe className="h-3 w-3" /> Grounded with Google Search
              </div>
              {selected.grounding.queries.length > 0 && <div className="text-muted">Searched: {selected.grounding.queries.join(' · ')}</div>}
              {selected.grounding.sources.map((s) => (
                <a key={s.uri} href={s.uri} target="_blank" rel="noopener noreferrer" className="block truncate text-accent-text hover:underline">
                  {s.title || s.uri}
                </a>
              ))}
            </div>
          )}

          {(selected.inputs.source || selected.inputs.references.length > 0 || selected.inputs.maskPreview) && (
            <div className="mt-2">
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted">Inputs</div>
              <div className="flex flex-wrap gap-1.5">
                {selected.inputs.source && <Thumb url={selected.inputs.source.dataUrl} label="Source" onClick={() => setPreview({ url: selected.inputs.source!.dataUrl, title: 'Source image' })} />}
                {selected.inputs.maskPreview && <Thumb url={selected.inputs.maskPreview.dataUrl} label="Mask" tone="mask" onClick={() => setPreview({ url: selected.inputs.maskPreview!.dataUrl, title: 'Masked region sent to the model' })} />}
                {selected.inputs.references.map((r, i) => (
                  <Thumb key={r.id} url={r.dataUrl} label={`Ref ${i + 1}`} onClick={() => setPreview({ url: r.dataUrl, title: `Reference ${i + 1}` })} />
                ))}
              </div>
            </div>
          )}

          <div className="mt-3 grid grid-cols-4 gap-1.5">
            <Button variant="outline" size="xs" onClick={() => void downloadItem(selected)} title="Download PNG">
              <Download className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="xs"
              title="Edit this image"
              onClick={() => {
                open(selected);
                setMode('edit');
              }}
            >
              <PencilLine className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="xs"
              title="Use as reference"
              onClick={() => {
                if (addReference({ ...selected.output, id: `${selected.output.id}-ref-${Date.now().toString(36)}` })) toast.success('Added as a reference');
                else toast.warning('Reference slots are full');
              }}
            >
              <ImagePlus className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" size="xs" title="Reuse prompt and settings" onClick={() => reuse(selected)}>
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="mt-2 flex items-center justify-between">
            <button onClick={() => setShowDebug((v) => !v)} className="inline-flex items-center gap-1 text-[11px] text-muted hover:text-ink">
              {showDebug ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              <Code2 className="h-3 w-3" /> Request details
            </button>
            <button onClick={() => removeHistoryItem(selected.id)} className="inline-flex items-center gap-1 text-[11px] text-muted hover:text-danger">
              <Trash2 className="h-3 w-3" /> Delete
            </button>
          </div>
          {showDebug && (
            <pre className="mt-2 max-h-48 overflow-auto rounded-lg border border-line bg-surface p-2 font-mono text-[10px] leading-relaxed text-ink-2">
              {JSON.stringify(
                {
                  model: selected.model,
                  mode: selected.kind,
                  imageConfig: { imageSize: selected.size, aspectRatio: selected.aspectRatio },
                  thinkingLevel: selected.thinkingLevel,
                  tools: selected.useSearch ? ['googleSearch'] : [],
                  seed: selected.seed,
                  temperature: selected.temperature,
                  inputs: { source: !!selected.inputs.source, mask: !!selected.inputs.maskPreview, references: selected.inputs.references.length },
                  usage: selected.usage,
                  credits: selected.credits,
                  durationMs: selected.durationMs,
                },
                null,
                2
              )}
            </pre>
          )}
        </div>
      )}

      <ImagePreviewModal open={!!preview} onOpenChange={(o) => !o && setPreview(null)} imageUrl={preview?.url ?? ''} title={preview?.title ?? ''} />
    </aside>
  );
};

const Meta: React.FC<{ k: string; v: string }> = ({ k, v }) => (
  <div className="flex justify-between gap-2">
    <dt className="text-muted">{k}</dt>
    <dd className="truncate text-right text-ink-2">{v}</dd>
  </div>
);

const Thumb: React.FC<{ url: string; label: string; tone?: 'mask'; onClick: () => void }> = ({ url, label, tone, onClick }) => (
  <button onClick={onClick} className="relative h-12 w-12 overflow-hidden rounded-md border border-line hover:border-accent" title={label}>
    <img src={url} alt={label} className="h-full w-full object-cover" />
    <span className={cn('absolute inset-x-0 bottom-0 truncate px-1 text-[9px] font-medium text-white', tone === 'mask' ? 'bg-mask/80' : 'bg-black/60')}>{label}</span>
  </button>
);
