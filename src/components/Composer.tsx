import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Wand2,
  PencilLine,
  Brush,
  Upload,
  X,
  ChevronDown,
  ChevronRight,
  Lightbulb,
  Globe,
  Brain,
  MessageSquare,
  Dices,
  Thermometer,
  PanelLeftClose,
  PanelLeftOpen,
  Trash2,
  ImagePlus,
  Layers,
} from 'lucide-react';
import * as Switch from '@radix-ui/react-switch';
import { useAppStore } from '../store/useAppStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useGenerate } from '../hooks/useGenerate';
import { useCredits } from '../hooks/useCredits';
import { registerAction, triggerAction } from '../lib/actions';
import { MODELS, RATIO_GROUPS, SIZE_LABELS, apiCostUsd, SEARCH_GROUNDING_CREDITS, type ImageSize } from '../lib/models';
import { fileToImageRef } from '../utils/imageUtils';
import { toast } from '../store/useToastStore';
import { cn } from '../utils/cn';
import { Button, IconButton } from './ui/Button';
import { Segmented, Chip, Label } from './ui/Segmented';
import { ModelPicker } from './ModelPicker';
import { PromptHints } from './PromptHints';
import type { Mode } from '../types';

const MODE_OPTIONS: { value: Mode; label: React.ReactNode; hint: string }[] = [
  { value: 'generate', label: <span className="inline-flex items-center gap-1.5"><Wand2 className="h-3.5 w-3.5" />Generate</span>, hint: 'Create from a prompt (G)' },
  { value: 'edit', label: <span className="inline-flex items-center gap-1.5"><PencilLine className="h-3.5 w-3.5" />Edit</span>, hint: 'Change an image with words (E)' },
  { value: 'mask', label: <span className="inline-flex items-center gap-1.5"><Brush className="h-3.5 w-3.5" />Mask</span>, hint: 'Paint the region to change (M)' },
];

const PLACEHOLDERS: Record<Mode, string> = {
  generate:
    'A product photo of a matte black ceramic mug on a walnut desk, morning light from a window on the left, shallow depth of field, 50mm lens…',
  edit: 'Replace the sky with a dramatic sunset and keep everything else the same…',
  mask: 'Turn the painted area into a bowl of fresh strawberries…',
};

export const Composer: React.FC = () => {
  const {
    mode,
    setMode,
    prompt,
    setPrompt,
    references,
    addReference,
    removeReference,
    clearReferences,
    settings,
    updateSettings,
    setModel,
    showAdvanced,
    setShowAdvanced,
    canvasImage,
    setCanvasImage,
    showComposer,
    setShowComposer,
    isGenerating,
    generatingCount,
    clearSession,
  } = useAppStore();
  const byokKey = useSettingsStore((s) => s.byokKey);
  const { run, blocker, cost, canRun } = useGenerate();
  const { balance, byok } = useCredits();
  const [showHints, setShowHints] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const sourceInput = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const spec = MODELS[settings.model];
  const isEdit = mode !== 'generate';
  const refCap = Math.max(1, spec.maxInputImages - (isEdit ? 3 : 0));

  useEffect(() => registerAction('generate', () => void run()), [run]);

  // Auto-grow the textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${Math.min(260, Math.max(96, el.scrollHeight))}px`;
  }, [prompt, showComposer]);

  const ingestFiles = useCallback(
    async (files: FileList | File[], asSource = false) => {
      const list = Array.from(files).filter((f) => f.type.startsWith('image/'));
      if (!list.length) return;
      if (asSource || (isEdit && !canvasImage)) {
        const ref = await fileToImageRef(list[0], list[0].name);
        setCanvasImage(ref);
        useAppStore.getState().selectItem(null);
        list.shift();
        if (!list.length) return;
      }
      let added = 0;
      for (const file of list) {
        const ref = await fileToImageRef(file, file.name);
        if (addReference(ref)) added++;
        else {
          toast.warning(`${spec.name} takes up to ${refCap} references here`, 'Switch to a model with more input slots to add more.');
          break;
        }
      }
      if (added && mode === 'generate' && !prompt.trim()) textareaRef.current?.focus();
    },
    [isEdit, canvasImage, setCanvasImage, addReference, spec.name, refCap, mode, prompt]
  );

  // Paste images anywhere
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = Array.from(e.clipboardData?.items ?? []);
      const files = items.filter((i) => i.kind === 'file' && i.type.startsWith('image/')).map((i) => i.getAsFile()!).filter(Boolean);
      if (files.length) {
        e.preventDefault();
        void ingestFiles(files);
        toast.success(files.length > 1 ? `${files.length} images pasted` : 'Image pasted');
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [ingestFiles]);

  if (!showComposer) {
    return (
      <div className="hidden h-full w-11 shrink-0 flex-col items-center border-r border-line bg-surface py-3 md:flex">
        <IconButton label="Show composer (P)" onClick={() => setShowComposer(true)}>
          <PanelLeftOpen className="h-5 w-5" />
        </IconButton>
        <div className="mt-4 flex flex-col gap-1">
          {MODE_OPTIONS.map((m) => (
            <IconButton
              key={m.value}
              label={m.hint}
              size="icon"
              onClick={() => {
                setMode(m.value);
                setShowComposer(true);
              }}
              className={cn(mode === m.value && 'bg-accent/15 text-accent-text')}
            >
              {m.value === 'generate' ? <Wand2 className="h-4 w-4" /> : m.value === 'edit' ? <PencilLine className="h-4 w-4" /> : <Brush className="h-4 w-4" />}
            </IconButton>
          ))}
        </div>
      </div>
    );
  }

  const usd = apiCostUsd({ model: settings.model, size: settings.size, useSearch: settings.useSearch }) * settings.variants;

  return (
    <aside
      className={cn(
        'flex h-full w-[min(340px,88vw)] shrink-0 flex-col border-r border-line bg-surface',
        'absolute inset-y-0 left-0 z-30 shadow-pop md:relative md:z-auto md:shadow-none'
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        void ingestFiles(e.dataTransfer.files);
      }}
    >
      {/* Mode tabs */}
      <div className="flex items-center gap-2 border-b border-line px-3 py-2.5">
        <Segmented options={MODE_OPTIONS} value={mode} onChange={setMode} size="md" />
        <IconButton label="Hide composer (P)" size="icon-sm" onClick={() => setShowComposer(false)}>
          <PanelLeftClose className="h-4 w-4" />
        </IconButton>
      </div>

      <div className="relative flex-1 space-y-5 overflow-y-auto px-4 pb-6 pt-4">
        {dragOver && (
          <div className="pointer-events-none absolute inset-2 z-10 flex items-center justify-center rounded-xl border-2 border-dashed border-accent bg-accent/10 text-sm font-medium text-accent-text">
            Drop images here
          </div>
        )}

        {/* Source image for edit / mask */}
        {isEdit && (
          <section>
            <Label hint={mode === 'mask' ? 'paint on the canvas' : undefined}>Editing</Label>
            {canvasImage ? (
              <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-2/60 p-2">
                <img src={canvasImage.dataUrl} alt="Source" className="h-14 w-14 rounded-lg object-cover" />
                <div className="min-w-0 flex-1 text-xs">
                  <div className="font-medium text-ink">Current canvas</div>
                  <div className="text-muted">
                    {canvasImage.width && canvasImage.height ? `${canvasImage.width} × ${canvasImage.height}` : 'Image'}
                  </div>
                </div>
                <Button variant="outline" size="xs" onClick={() => sourceInput.current?.click()}>
                  Replace
                </Button>
              </div>
            ) : (
              <button
                onClick={() => sourceInput.current?.click()}
                className="flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-line-strong/80 bg-surface-2/40 px-3 py-6 text-center transition-colors hover:border-accent hover:bg-accent/5"
              >
                <ImagePlus className="h-5 w-5 text-muted" />
                <span className="text-sm font-medium text-ink">Upload an image to edit</span>
                <span className="text-[11px] text-muted">or paste, drop, or pick one from history</span>
              </button>
            )}
            <input
              ref={sourceInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files) void ingestFiles(e.target.files, true);
                e.target.value = '';
              }}
            />
          </section>
        )}

        {/* Prompt */}
        <section>
          <Label
            hint={
              <button onClick={() => setShowHints(true)} className="inline-flex items-center gap-1 text-accent-text hover:underline">
                <Lightbulb className="h-3 w-3" /> Prompt tips
              </button>
            }
          >
            {mode === 'generate' ? 'Prompt' : 'What should change'}
          </Label>
          <div className="rounded-xl border border-line bg-surface-2/50 transition-colors focus-within:border-accent/60 focus-within:bg-surface">
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={PLACEHOLDERS[mode]}
              spellCheck
              className="block w-full resize-none bg-transparent px-3 pt-3 text-sm leading-relaxed text-ink placeholder:text-muted/80 focus:outline-none"
            />
            <div className="flex items-center justify-between px-3 pb-2 pt-1 text-[11px] text-muted">
              <PromptQuality length={prompt.trim().length} />
              {prompt && (
                <button onClick={() => setPrompt('')} className="hover:text-ink">
                  Clear
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Reference images */}
        <section>
          <Label hint={`${references.length} / ${refCap}`}>{mode === 'generate' ? 'Reference images' : 'Style & subject references'}</Label>
          <div className="grid grid-cols-4 gap-2">
            {references.map((ref) => (
              <div key={ref.id} className="group relative aspect-square overflow-hidden rounded-lg border border-line bg-surface-2">
                <img src={ref.dataUrl} alt={ref.name ?? 'Reference'} className="h-full w-full object-cover" />
                <button
                  onClick={() => removeReference(ref.id)}
                  className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  aria-label="Remove reference"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {references.length < refCap && (
              <button
                onClick={() => fileInput.current?.click()}
                className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-line-strong/80 text-muted transition-colors hover:border-accent hover:text-accent-text"
                title="Add reference images"
              >
                <Upload className="h-4 w-4" />
                <span className="text-[10px] font-medium">Add</span>
              </button>
            )}
          </div>
          {references.length === 0 && (
            <p className="mt-2 text-[11px] leading-relaxed text-muted">
              Optional. Drop, paste or upload photos of a product, person or style you want the model to follow.
            </p>
          )}
          {references.length > 0 && (
            <button onClick={clearReferences} className="mt-2 text-[11px] text-muted hover:text-danger">
              Remove all
            </button>
          )}
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) void ingestFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </section>

        {/* Model */}
        <ModelPicker value={settings.model} size={settings.size} onChange={setModel} />

        {/* Output */}
        <section className="space-y-4">
          {mode === 'generate' ? (
            <div>
              <Label>Aspect ratio</Label>
              <div className="space-y-2">
                {RATIO_GROUPS.map((group) => {
                  const ratios = group.ratios.filter((r) => spec.aspectRatios.includes(r));
                  if (!ratios.length) return null;
                  return (
                    <div key={group.label} className="flex items-center gap-2">
                      <span className="w-14 shrink-0 text-[11px] text-muted">{group.label}</span>
                      <div className="flex flex-wrap gap-1.5">
                        {ratios.map((r) => (
                          <Chip key={r} active={settings.aspectRatio === r} onClick={() => updateSettings({ aspectRatio: r })}>
                            <span className="inline-flex items-center gap-1.5">
                              <RatioGlyph ratio={r} />
                              {r}
                            </span>
                          </Chip>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="rounded-lg border border-line bg-surface-2/50 px-3 py-2 text-[11px] text-muted">
              Edits keep the source aspect ratio. Resolution below still applies.
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Resolution</Label>
              <Segmented
                options={(['512', '1K', '2K', '4K'] as ImageSize[]).map((s) => ({
                  value: s,
                  label: SIZE_LABELS[s].label,
                  hint: spec.sizes.includes(s) ? `${SIZE_LABELS[s].hint} · ${spec.credits[s]} cr` : `${spec.name} does not offer ${s}`,
                  disabled: !spec.sizes.includes(s),
                }))}
                value={settings.size}
                onChange={(size) => updateSettings({ size })}
              />
            </div>
            <div>
              <Label>Variants</Label>
              <Segmented
                options={[1, 2, 4].map((n) => ({ value: n as 1 | 2 | 4, label: `${n}×`, hint: `${n} image${n > 1 ? 's' : ''} in parallel` }))}
                value={settings.variants}
                onChange={(variants) => updateSettings({ variants })}
              />
            </div>
          </div>
        </section>

        {/* Advanced */}
        <section>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex w-full items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-muted hover:text-ink"
          >
            <span>Advanced</span>
            {showAdvanced ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
          {showAdvanced && (
            <div className="mt-3 space-y-3 animate-fade-in">
              {spec.thinkingControl && (
                <Row icon={<Brain className="h-4 w-4" />} title="Thinking" hint="High reasons longer before rendering. Better for complex layouts and text.">
                  <Segmented
                    fullWidth={false}
                    options={[
                      { value: 'MINIMAL', label: 'Fast' },
                      { value: 'HIGH', label: 'Deep' },
                    ]}
                    value={settings.thinkingLevel}
                    onChange={(thinkingLevel) => updateSettings({ thinkingLevel })}
                  />
                </Row>
              )}
              {spec.supportsSearch && (
                <Row
                  icon={<Globe className="h-4 w-4" />}
                  title={
                    <span>
                      Search grounding <span className="ml-1 rounded bg-accent/15 px-1 py-0.5 text-[10px] font-semibold text-accent-text">+{SEARCH_GROUNDING_CREDITS} cr</span>
                    </span>
                  }
                  hint="Looks things up first. Real weather, live scores, current products."
                >
                  <Toggle checked={settings.useSearch} onChange={(useSearch) => updateSettings({ useSearch })} />
                </Row>
              )}
              {isEdit && (
                <Row icon={<MessageSquare className="h-4 w-4" />} title="Remember the thread" hint="Sends the last edits as context so follow-ups like “now make it warmer” work.">
                  <Toggle checked={settings.keepConversation} onChange={(keepConversation) => updateSettings({ keepConversation })} />
                </Row>
              )}
              <Row icon={<Thermometer className="h-4 w-4" />} title={`Creativity ${settings.temperature.toFixed(1)}`} hint="Lower sticks to the prompt. Higher explores.">
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={0.1}
                  value={settings.temperature}
                  onChange={(e) => updateSettings({ temperature: parseFloat(e.target.value) })}
                  className="slider w-24"
                />
              </Row>
              <Row icon={<Dices className="h-4 w-4" />} title="Seed" hint="Same seed and prompt gives a similar result. Variants use seed, seed+1…">
                <input
                  type="number"
                  value={settings.seed ?? ''}
                  placeholder="Random"
                  onChange={(e) => updateSettings({ seed: e.target.value === '' ? null : parseInt(e.target.value, 10) })}
                  className="h-7 w-24 rounded-md border border-line bg-surface px-2 text-right text-xs text-ink focus:border-accent/60 focus:outline-none"
                />
              </Row>
            </div>
          )}
        </section>

        {/* Session */}
        <section className="border-t border-line pt-3">
          {confirmClear ? (
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-muted">Clear prompt, references and canvas?</span>
              <div className="flex gap-1.5">
                <Button
                  size="xs"
                  variant="danger"
                  onClick={() => {
                    clearSession();
                    setConfirmClear(false);
                  }}
                >
                  Clear
                </Button>
                <Button size="xs" variant="ghost" onClick={() => setConfirmClear(false)}>
                  Keep
                </Button>
              </div>
            </div>
          ) : (
            <button onClick={() => setConfirmClear(true)} className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-danger">
              <Trash2 className="h-3.5 w-3.5" /> Clear session
            </button>
          )}
        </section>
      </div>

      {/* Generate bar */}
      <div className="border-t border-line bg-surface p-3">
        <Button
          size="lg"
          className="w-full justify-between"
          onClick={() => void run()}
          disabled={!canRun}
          loading={isGenerating}
        >
          <span className="inline-flex items-center gap-2">
            {!isGenerating && (mode === 'generate' ? <Wand2 className="h-4 w-4" /> : <Layers className="h-4 w-4" />)}
            {isGenerating
              ? generatingCount > 1
                ? `Rendering ${generatingCount} variants…`
                : 'Rendering…'
              : mode === 'generate'
                ? settings.variants > 1
                  ? `Generate ${settings.variants} variants`
                  : 'Generate'
                : 'Apply edit'}
          </span>
          {!isGenerating && (
            <span className="rounded-md bg-black/10 px-2 py-0.5 text-xs font-semibold tabular-nums">
              {byok ? `≈ $${usd.toFixed(3)}` : `${cost} cr`}
            </span>
          )}
        </Button>
        <div className="mt-2 flex items-center justify-between text-[11px] text-muted">
          <span>{blocker ?? (byok ? 'Billed to your own Gemini key' : `${balance} credits left after: ${Math.max(0, balance - cost)}`)}</span>
          <span className="hidden sm:inline">⌘ Enter</span>
        </div>
        {!byok && !byokKey && balance < cost && !isGenerating && prompt.trim() && (
          <Button variant="outline" size="sm" className="mt-2 w-full" onClick={() => triggerAction('openPurchase')}>
            Get more credits
          </Button>
        )}
      </div>

      <PromptHints open={showHints} onOpenChange={setShowHints} mode={mode} />
    </aside>
  );
};

const Row: React.FC<{ icon: React.ReactNode; title: React.ReactNode; hint?: string; children: React.ReactNode }> = ({ icon, title, hint, children }) => (
  <div className="flex items-start justify-between gap-3 rounded-lg border border-line bg-surface-2/40 p-2.5">
    <div className="flex min-w-0 gap-2">
      <span className="mt-0.5 text-muted">{icon}</span>
      <div className="min-w-0">
        <div className="text-xs font-medium text-ink">{title}</div>
        {hint && <div className="mt-0.5 text-[11px] leading-snug text-muted">{hint}</div>}
      </div>
    </div>
    <div className="shrink-0">{children}</div>
  </div>
);

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void }> = ({ checked, onChange }) => (
  <Switch.Root
    checked={checked}
    onCheckedChange={onChange}
    className={cn(
      'relative h-5 w-9 rounded-full border transition-colors',
      checked ? 'border-accent bg-accent' : 'border-line-strong bg-surface-3'
    )}
  >
    <Switch.Thumb
      className={cn(
        'block h-4 w-4 translate-x-0.5 rounded-full bg-white shadow transition-transform',
        checked && 'translate-x-[18px]'
      )}
    />
  </Switch.Root>
);

const PromptQuality: React.FC<{ length: number }> = ({ length }) => {
  const level = length === 0 ? 0 : length < 25 ? 1 : length < 80 ? 2 : 3;
  const text = ['Describe the scene, subject, light and style', 'Add more detail for better results', 'Good detail', 'Rich prompt'][level];
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-flex gap-0.5">
        {[1, 2, 3].map((i) => (
          <span key={i} className={cn('h-1.5 w-3 rounded-full', i <= level ? (level === 3 ? 'bg-success' : 'bg-accent') : 'bg-line-strong/60')} />
        ))}
      </span>
      {text}
    </span>
  );
};

const RatioGlyph: React.FC<{ ratio: string }> = ({ ratio }) => {
  const [w, h] = ratio.split(':').map(Number);
  const max = 12;
  const scale = max / Math.max(w, h);
  const gw = Math.max(3, Math.round(w * scale));
  const gh = Math.max(3, Math.round(h * scale));
  return <span className="inline-block rounded-[2px] border border-current opacity-70" style={{ width: gw, height: gh }} />;
};
