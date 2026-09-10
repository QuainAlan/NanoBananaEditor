import React, { useEffect, useState } from 'react';
import { HelpCircle, Settings, Sun, Moon, Zap, KeyRound, PanelLeft, PanelRight, Plus } from 'lucide-react';
import { Logo, LogoMark } from './Logo';
import { Button, IconButton } from './ui/Button';
import { InfoModal } from './InfoModal';
import { SettingsModal } from './SettingsModal';
import { PurchaseModal } from './PurchaseModal';
import { useThemeStore } from '../store/useThemeStore';
import { useCredits } from '../hooks/useCredits';
import { useAuth } from '../hooks/useAuth';
import { useAppStore } from '../store/useAppStore';
import { registerAction } from '../lib/actions';
import { cn } from '../utils/cn';

export const Header: React.FC = () => {
  const [showInfo, setShowInfo] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPurchase, setShowPurchase] = useState(false);
  const { resolved, toggle } = useThemeStore();
  const { balance, isLoading, byok } = useCredits();
  const { user } = useAuth();
  const { showComposer, setShowComposer, showHistory, setShowHistory } = useAppStore();

  useEffect(() => {
    const a = registerAction('openPurchase', () => setShowPurchase(true));
    const b = registerAction('openSettings', () => setShowSettings(true));
    return () => {
      a();
      b();
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('purchase') === 'success') {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const low = !byok && balance < 3;

  return (
    <>
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-line bg-surface/80 px-3 backdrop-blur md:px-4">
        <div className="flex items-center gap-2">
          <IconButton
            label={showComposer ? 'Hide composer' : 'Show composer'}
            onClick={() => setShowComposer(!showComposer)}
            className={cn('md:hidden', showComposer && 'text-accent-text')}
          >
            <PanelLeft className="h-5 w-5" />
          </IconButton>
          <a href="/" className="hidden items-center md:flex" aria-label="Nano Banana Editor">
            <Logo />
          </a>
          <a href="/" className="md:hidden" aria-label="Nano Banana Editor">
            <LogoMark size={28} />
          </a>
          <span className="ml-1 hidden rounded-md border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-muted md:inline">
            v2.0
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {user && (
            <button
              onClick={() => (byok ? setShowSettings(true) : setShowPurchase(true))}
              className={cn(
                'flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 text-xs font-semibold transition-colors',
                byok
                  ? 'border-success/40 bg-success/10 text-success'
                  : low
                    ? 'border-danger/40 bg-danger/10 text-danger'
                    : 'border-accent/40 bg-accent/10 text-accent-text hover:bg-accent/20'
              )}
              title={byok ? 'Using your own Gemini key' : 'Credits'}
            >
              {byok ? <KeyRound className="h-3.5 w-3.5" /> : <Zap className="h-3.5 w-3.5" />}
              {byok ? 'Own key' : isLoading ? '…' : `${balance} credits`}
              {!byok && <Plus className="h-3 w-3 opacity-70" />}
            </button>
          )}
          <IconButton label={resolved === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} onClick={toggle}>
            {resolved === 'dark' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
          </IconButton>
          <IconButton label="Settings" onClick={() => setShowSettings(true)}>
            <Settings className="h-[18px] w-[18px]" />
          </IconButton>
          <IconButton label="About" onClick={() => setShowInfo(true)}>
            <HelpCircle className="h-[18px] w-[18px]" />
          </IconButton>
          <IconButton
            label={showHistory ? 'Hide history' : 'Show history'}
            onClick={() => setShowHistory(!showHistory)}
            className={cn('md:hidden', showHistory && 'text-accent-text')}
          >
            <PanelRight className="h-5 w-5" />
          </IconButton>
        </div>
      </header>

      <InfoModal open={showInfo} onOpenChange={setShowInfo} />
      <SettingsModal open={showSettings} onOpenChange={setShowSettings} />
      <PurchaseModal open={showPurchase} onOpenChange={setShowPurchase} />
    </>
  );
};

export { Button };
