import React from 'react';
import { ExternalLink, Github, GraduationCap, Users, Keyboard } from 'lucide-react';
import { Dialog } from './ui/Dialog';
import { SHORTCUTS } from '../hooks/useKeyboardShortcuts';
import { MODEL_LIST } from '../lib/models';

interface InfoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const InfoModal: React.FC<InfoModalProps> = ({ open, onOpenChange }) => (
  <Dialog open={open} onOpenChange={onOpenChange} title="About Nano Banana Editor" size="lg">
    <div className="space-y-5 text-sm">
      <p className="text-ink-2">
        An open-source editor for Google&rsquo;s Nano Banana image models. Built by{' '}
        <a href="https://markfulton.com" target="_blank" rel="noopener noreferrer" className="font-medium text-accent-text hover:underline">
          Mark Fulton
        </a>
        . Generate from text, edit with words, paint masks for local changes, ground prompts in live search results and render up to 4K.
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        {MODEL_LIST.map((m) => (
          <div key={m.id} className="rounded-xl border border-line bg-surface-2/50 p-3">
            <div className="text-sm font-semibold text-ink">{m.name}</div>
            <div className="mt-0.5 font-mono text-[10px] text-muted">{m.id}</div>
            <ul className="mt-2 space-y-0.5 text-[11px] text-ink-2">
              {m.strengths.map((s) => (
                <li key={s}>· {s}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card
          icon={<GraduationCap className="h-4 w-4" />}
          title="Learn to build tools like this"
          body="Reinventing.AI runs live build sessions on AI apps, agents and automation for founders and operators."
          href="https://www.reinventing.ai"
          cta="Visit Reinventing.AI"
        />
        <Card
          icon={<Users className="h-4 w-4" />}
          title="Get your own copy"
          body="Join the Vibe Coding is Life community for the one-click install, project downloads and weekly builds."
          href="https://www.skool.com/vibe-coding-is-life/about?ref=456537abaf37491cbcc6976f3c26af41"
          cta="Join the community"
        />
      </div>

      <div className="rounded-xl border border-line p-3">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-ink-2">
          <Keyboard className="h-3.5 w-3.5" /> Keyboard shortcuts
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[11px] sm:grid-cols-3">
          {SHORTCUTS.map((s) => (
            <div key={s.keys} className="flex justify-between gap-2">
              <span className="text-muted">{s.label}</span>
              <kbd className="rounded border border-line bg-surface-2 px-1 font-mono text-[10px] text-ink-2">{s.keys}</kbd>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] text-muted">
        <span>AGPL-3.0 · © 2026 Mark Fulton</span>
        <a href="https://github.com/markfulton/NanoBananaEditor" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-ink">
          <Github className="h-3.5 w-3.5" /> Source on GitHub
        </a>
      </div>
    </div>
  </Dialog>
);

const Card: React.FC<{ icon: React.ReactNode; title: string; body: string; href: string; cta: string }> = ({ icon, title, body, href, cta }) => (
  <div className="flex flex-col rounded-xl border border-line bg-surface-2/50 p-4">
    <div className="flex items-center gap-2 text-sm font-semibold text-ink">
      <span className="text-accent-text">{icon}</span>
      {title}
    </div>
    <p className="mt-1.5 flex-1 text-xs leading-relaxed text-muted">{body}</p>
    <a href={href} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-accent-text hover:underline">
      {cta} <ExternalLink className="h-3 w-3" />
    </a>
  </div>
);
