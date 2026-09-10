import React from 'react';
import { Zap, Sparkles, Crown, Check, Globe, Images, Brain } from 'lucide-react';
import { MODEL_LIST, SIZE_LABELS, type ModelId, type ModelSpec, type ImageSize } from '../lib/models';
import { cn } from '../utils/cn';
import { Label } from './ui/Segmented';

const tierIcon: Record<ModelSpec['tier'], React.ReactNode> = {
  fast: <Zap className="h-4 w-4" />,
  standard: <Sparkles className="h-4 w-4" />,
  pro: <Crown className="h-4 w-4" />,
};

const tierTone: Record<ModelSpec['tier'], string> = {
  fast: 'text-success',
  standard: 'text-accent-text',
  pro: 'text-mask',
};

interface ModelPickerProps {
  value: ModelId;
  size: ImageSize;
  onChange: (model: ModelId) => void;
}

export const ModelPicker: React.FC<ModelPickerProps> = ({ value, size, onChange }) => (
  <div>
    <Label hint="credits per image">Model</Label>
    <div className="space-y-1.5">
      {MODEL_LIST.map((m) => {
        const active = m.id === value;
        const cost = m.credits[m.sizes.includes(size) ? size : m.defaultSize];
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onChange(m.id)}
            aria-pressed={active}
            className={cn(
              'group w-full rounded-xl border p-3 text-left transition-all duration-150',
              active
                ? 'border-accent/60 bg-accent/10 shadow-[0_0_0_1px_rgb(var(--c-accent)/0.25)]'
                : 'border-line bg-surface hover:border-line-strong hover:bg-surface-2/60'
            )}
          >
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-surface',
                  tierTone[m.tier]
                )}
              >
                {tierIcon[m.tier]}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold text-ink">{m.name}</span>
                  {active && <Check className="h-3.5 w-3.5 text-accent-text" />}
                </div>
                <div className="truncate text-[11px] text-muted">{m.tagline}</div>
              </div>
              <div className="shrink-0 text-right">
                <div className={cn('text-sm font-semibold tabular-nums', active ? 'text-accent-text' : 'text-ink')}>
                  {cost}
                  <span className="ml-0.5 text-[10px] font-medium text-muted">cr</span>
                </div>
                <div className="text-[10px] text-muted">
                  {m.sizes.length === 1 ? '1K only' : `${SIZE_LABELS[m.sizes[0]].label} to ${SIZE_LABELS[m.sizes[m.sizes.length - 1]].label}`}
                </div>
              </div>
            </div>
            {active && (
              <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-line/70 pt-2.5">
                <Capability icon={<Images className="h-3 w-3" />} label={`${m.maxInputImages} inputs`} />
                {m.supportsSearch && <Capability icon={<Globe className="h-3 w-3" />} label="Search grounding" />}
                <Capability icon={<Brain className="h-3 w-3" />} label={m.thinkingControl ? 'Thinking control' : 'Always thinks'} />
                <Capability label={`~${m.typicalSeconds[0]}-${m.typicalSeconds[1]}s`} />
              </div>
            )}
          </button>
        );
      })}
    </div>
  </div>
);

const Capability: React.FC<{ icon?: React.ReactNode; label: string }> = ({ icon, label }) => (
  <span className="inline-flex items-center gap-1 rounded-md bg-surface px-1.5 py-0.5 text-[10px] font-medium text-ink-2 border border-line">
    {icon}
    {label}
  </span>
);
