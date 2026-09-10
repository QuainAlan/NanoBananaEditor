import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MailCheck } from 'lucide-react';
import { useAuth } from './hooks/useAuth';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useAppStore } from './store/useAppStore';
import { Header } from './components/Header';
import { Composer } from './components/Composer';
import { Canvas } from './components/Canvas';
import { HistoryPanel } from './components/HistoryPanel';
import { AuthForm } from './components/AuthForm';
import { Toaster } from './components/ui/Toaster';
import { Button } from './components/ui/Button';
import { LogoMark } from './components/Logo';
import { supabase } from './lib/supabase';
import { toast } from './store/useToastStore';
import { triggerAction } from './lib/actions';
import './store/useThemeStore';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, retry: 1 } },
});

function Shell() {
  const { user, loading } = useAuth();
  useKeyboardShortcuts();
  const { showComposer, showHistory, setShowComposer, setShowHistory } = useAppStore();

  // Mobile: start with panels closed, and never show both at once.
  useEffect(() => {
    if (window.innerWidth < 768) {
      setShowComposer(false);
      setShowHistory(false);
    }
  }, [setShowComposer, setShowHistory]);
  useEffect(() => {
    const check = () => {
      if (window.innerWidth < 768 && showComposer && showHistory) setShowHistory(false);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [showComposer, showHistory, setShowHistory]);

  // Purchase return + open-purchase bridge
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const purchase = params.get('purchase');
    if (purchase === 'success') {
      toast.success('Payment received', 'Your credits will appear in a moment.');
      queryClient.invalidateQueries({ queryKey: ['credits'] });
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ['credits'] }), 4000);
    } else if (purchase === 'cancelled') {
      toast.info('Checkout cancelled');
    }
    if (purchase) window.history.replaceState({}, '', window.location.pathname);
    const onOpen = () => triggerAction('openPurchase');
    window.addEventListener('nb:open-purchase', onOpen);
    return () => window.removeEventListener('nb:open-purchase', onOpen);
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-bg">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <LogoMark size={44} />
          <div className="h-1 w-24 overflow-hidden rounded-full bg-surface-3">
            <div className="h-full w-1/2 animate-shimmer rounded-full bg-accent" />
          </div>
        </div>
      </div>
    );
  }

  const confirmed = Boolean(user?.email_confirmed_at);

  return (
    <div className="theme-transition relative flex h-full flex-col bg-bg text-ink">
      <Header />
      <div className="relative flex min-h-0 flex-1">
        {confirmed && <Composer />}
        <Canvas />
        {confirmed && <HistoryPanel />}
        {(showComposer || showHistory) && (
          <button
            className="absolute inset-0 z-20 bg-black/40 md:hidden"
            aria-label="Close panel"
            onClick={() => {
              setShowComposer(false);
              setShowHistory(false);
            }}
          />
        )}
      </div>

      {!user && <AuthForm />}

      {user && !confirmed && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-bg/85 p-4 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-7 text-center shadow-pop animate-slide-up">
            <MailCheck className="mx-auto mb-3 h-8 w-8 text-accent-text" />
            <h2 className="font-display text-lg font-semibold text-ink">Confirm your email</h2>
            <p className="mt-2 text-sm text-muted">
              We sent a link to <strong className="text-ink">{user.email}</strong>. Open it to unlock the editor.
            </p>
            <Button
              variant="outline"
              className="mt-5 w-full"
              onClick={async () => {
                const { error } = await supabase.auth.resend({ type: 'signup', email: user.email! });
                if (error) toast.error('Could not resend', error.message);
                else toast.success('Confirmation email sent');
              }}
            >
              Resend the link
            </Button>
            <Button variant="ghost" className="mt-2 w-full" onClick={() => supabase.auth.signOut()}>
              Sign out
            </Button>
          </div>
        </div>
      )}

      <Toaster />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Shell />
    </QueryClientProvider>
  );
}
