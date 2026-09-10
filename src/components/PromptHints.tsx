import React from 'react';
import { Dialog } from './ui/Dialog';
import type { Mode, PromptHint } from '../types';
import { cn } from '../utils/cn';

const generateHints: PromptHint[] = [
  { category: 'subject', text: 'Name the subject precisely', example: '"a 1970s orange Vespa" beats "a scooter"' },
  { category: 'scene', text: 'Place it somewhere with light', example: '"on a wet cobblestone street at blue hour, neon reflections"' },
  { category: 'style', text: 'Say what kind of image it is', example: '"editorial photograph", "flat vector illustration", "oil painting"' },
  { category: 'camera', text: 'Borrow camera language', example: '"85mm, f/1.8, shallow depth of field, eye level"' },
  { category: 'text', text: 'Put words you want rendered in quotes', example: 'A poster with the headline "Blue Hour" in bold serif type' },
];

const editHints: PromptHint[] = [
  { category: 'edit', text: 'Say what changes and what stays', example: '"Replace the sky with sunset. Keep the building and people unchanged."' },
  { category: 'edit', text: 'One change per request works best', example: 'Chain edits. The thread option keeps context between them.' },
  { category: 'subject', text: 'Describe the new element fully', example: '"add a small grey cat sleeping on the left cushion"' },
  { category: 'style', text: 'For style changes, name the look', example: '"render this as a watercolour with soft paper texture"' },
  { category: 'edit', text: 'For a masked edit, describe only the region', example: 'The model already knows where. Say what should be there.' },
];

const tones: Record<PromptHint['category'], string> = {
  subject: 'bg-info/10 text-info border-info/30',
  scene: 'bg-success/10 text-success border-success/30',
  style: 'bg-accent/15 text-accent-text border-accent/40',
  camera: 'bg-mask/10 text-mask border-mask/30',
  text: 'bg-danger/10 text-danger border-danger/30',
  edit: 'bg-mask/10 text-mask border-mask/30',
};

interface PromptHintsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: Mode;
}

export const PromptHints: React.FC<PromptHintsProps> = ({ open, onOpenChange, mode }) => {
  const hints = mode === 'generate' ? generateHints : editHints;
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={mode === 'generate' ? 'Writing prompts that land' : 'Writing edits that land'} size="md">
      <div className="space-y-4">
        {hints.map((hint, i) => (
          <div key={i} className="flex gap-3">
            <span className={cn('mt-0.5 h-fit shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide', tones[hint.category])}>
              {hint.category}
            </span>
            <div>
              <p className="text-sm font-medium text-ink">{hint.text}</p>
              <p className="mt-0.5 text-xs text-muted">{hint.example}</p>
            </div>
          </div>
        ))}
        <div className="rounded-xl border border-line bg-surface-2/50 p-3 text-xs leading-relaxed text-ink-2">
          <strong className="text-ink">Write sentences, not tag soup.</strong> These models read like a person does. Describe the picture the way you would to a photographer, in the order you notice things.
        </div>
      </div>
    </Dialog>
  );
};
