import React, { useState } from 'react';
import { Sun, Moon, Monitor, KeyRound, Eye, EyeOff, ExternalLink, Trash2, LogOut, Check } from 'lucide-react';
import { Dialog } from './ui/Dialog';
import { Button } from './ui/Button';
import { Segmented, Label } from './ui/Segmented';
import { useAuth } from '../hooks/useAuth';
import { useThemeStore, type ThemePreference } from '../store/useThemeStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useAppStore } from '../store/useAppStore';
import { useCredits } from '../hooks/useCredits';
import { toast } from '../store/useToastStore';
import { MODEL_LIST, USD_PER_CREDIT } from '../lib/models';

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ open, onOpenChange }) => {
  const { user, signOut } = useAuth();
  const { preference, setPreference } = useThemeStore();
  const { byokKey, setByokKey, downloadFormat, setDownloadFormat } = useSettingsStore();
  const { history, clearHistory } = useAppStore();
  const { balance } = useCredits();
  const [draftKey, setDraftKey] = useState(byokKey);
  const [showKey, setShowKey] = useState(false);
  const [confirmWipe, setConfirmWipe] = useState(false);

  const saveKey = () => {
    const key = draftKey.trim();
    if (key && !/^AIza[0-9A-Za-z_-]{20,}$/.test(key)) {
      toast.warning('That does not look like a Gemini API key', 'Keys from AI Studio start with AIza.');
    }
    setByokKey(key);
    toast.success(key ? 'Using your own Gemini key' : 'Back to credits');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Settings" size="md">
      <div className="space-y-6">
        <section>
          <Label>Appearance</Label>
          <Segmented<ThemePreference>
            size="md"
            options={[
              { value: 'light', label: <span className="inline-flex items-center gap-1.5"><Sun className="h-4 w-4" />Light</span> },
              { value: 'dark', label: <span className="inline-flex items-center gap-1.5"><Moon className="h-4 w-4" />Dark</span> },
              { value: 'system', label: <span className="inline-flex items-center gap-1.5"><Monitor className="h-4 w-4" />System</span> },
            ]}
            value={preference}
            onChange={setPreference}
          />
        </section>

        <section>
          <Label hint="skips credits">Your own Gemini key</Label>
          <div className="rounded-xl border border-line bg-surface-2/50 p-3">
            <p className="text-xs leading-relaxed text-muted">
              Paste a key from Google AI Studio and requests bill your Google account directly instead of using credits. The key is stored only in this browser and sent with each request over HTTPS. It is never saved on our servers.
            </p>
            <div className="mt-3 flex gap-2">
              <div className="relative flex-1">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  type={showKey ? 'text' : 'password'}
                  value={draftKey}
                  onChange={(e) => setDraftKey(e.target.value)}
                  placeholder="AIza…"
                  autoComplete="off"
                  spellCheck={false}
                  className="h-10 w-full rounded-lg border border-line bg-surface pl-9 pr-9 font-mono text-xs text-ink focus:border-accent/60 focus:outline-none"
                />
                <button type="button" onClick={() => setShowKey((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-ink" aria-label={showKey ? 'Hide key' : 'Show key'}>
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button variant="secondary" onClick={saveKey} disabled={draftKey.trim() === byokKey}>
                <Check className="h-4 w-4" /> Save
              </Button>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px]">
              <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-accent-text hover:underline">
                Get a key from AI Studio <ExternalLink className="h-3 w-3" />
              </a>
              {byokKey && (
                <button
                  onClick={() => {
                    setDraftKey('');
                    setByokKey('');
                    toast.success('Key removed');
                  }}
                  className="text-muted hover:text-danger"
                >
                  Remove key
                </button>
              )}
            </div>
            {byokKey && (
              <div className="mt-3 rounded-lg border border-line bg-surface p-2 text-[11px] text-muted">
                <div className="mb-1 font-semibold text-ink-2">What Google charges per image</div>
                {MODEL_LIST.map((m) => (
                  <div key={m.id} className="flex justify-between">
                    <span>{m.name}</span>
                    <span className="font-mono">
                      {m.sizes.map((s) => `${s} $${m.apiCostUsd[s].toFixed(3)}`).join(' · ')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section>
          <Label>Download format</Label>
          <Segmented
            options={[
              { value: 'png', label: 'PNG', hint: 'Lossless, biggest' },
              { value: 'jpeg', label: 'JPG', hint: 'Small, no transparency' },
              { value: 'webp', label: 'WebP', hint: 'Small and sharp' },
            ]}
            value={downloadFormat}
            onChange={setDownloadFormat}
          />
        </section>

        <section>
          <Label>Account</Label>
          <div className="flex items-center justify-between rounded-xl border border-line bg-surface-2/50 p-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-ink">{user?.email}</div>
              <div className="text-[11px] text-muted">
                {balance} credits · about ${(balance * USD_PER_CREDIT).toFixed(2)} of value
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={async () => { await signOut(); onOpenChange(false); }}>
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </Button>
          </div>
        </section>

        <section>
          <Label hint={`${history.length} items in this browser`}>Local data</Label>
          {confirmWipe ? (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-danger/30 bg-danger/5 p-3 text-xs">
              <span className="text-ink-2">Delete every generated image stored in this browser?</span>
              <div className="flex gap-1.5">
                <Button size="xs" variant="danger" onClick={() => { clearHistory(); setConfirmWipe(false); toast.success('History cleared'); }}>
                  Delete
                </Button>
                <Button size="xs" variant="ghost" onClick={() => setConfirmWipe(false)}>
                  Keep
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setConfirmWipe(true)} disabled={!history.length}>
              <Trash2 className="h-3.5 w-3.5" /> Clear history
            </Button>
          )}
        </section>
      </div>
    </Dialog>
  );
};
