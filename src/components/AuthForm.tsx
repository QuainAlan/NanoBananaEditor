import React, { useState } from 'react';
import { Mail, Lock, AlertCircle, CheckCircle2, ArrowRight, Sun, Moon } from 'lucide-react';
import { Button } from './ui/Button';
import { useAuth } from '../hooks/useAuth';
import { LogoMark, Wordmark } from './Logo';
import { cn } from '../utils/cn';
import { useThemeStore } from '../store/useThemeStore';

type AuthMode = 'signin' | 'signup' | 'confirm' | 'reset';

export const AuthForm: React.FC<{ initialMode?: AuthMode }> = ({ initialMode = 'signup' }) => {
  const { signUp, signIn, resendConfirmation, resetPassword } = useAuth();
  const { resolved, toggle } = useThemeStore();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptMarketing, setAcceptMarketing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      if (mode === 'signup') {
        if (!acceptMarketing) {
          setError('Tick the box to continue. It is how the free demo is funded.');
          return;
        }
        const { error } = await signUp(email, password, acceptMarketing);
        if (error) throw error;
        setSuccess('Account created. Check your inbox for the confirmation link.');
        setMode('confirm');
      } else if (mode === 'signin') {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.toLowerCase().includes('not confirmed')) {
            setMode('confirm');
            setError('Confirm your email first. The link is in your inbox.');
          } else throw error;
        }
      } else if (mode === 'reset') {
        const { error } = await resetPassword(email);
        if (error) throw error;
        setSuccess('Password reset email sent.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await resendConfirmation(email);
      if (error) throw error;
      setSuccess('Confirmation email sent again.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not resend');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center overflow-y-auto bg-bg/85 p-4 backdrop-blur-md">
      <div className="w-full max-w-[420px] animate-slide-up">
        <div className="rounded-2xl border border-line bg-surface p-7 shadow-pop">
          <div className="mb-6 text-center">
            <LogoMark size={48} className="mx-auto mb-4 drop-shadow" />
            <Wordmark className="text-xl" />
            <p className="mt-2 text-sm text-muted">
              {mode === 'confirm'
                ? 'One more step: confirm your email.'
                : mode === 'reset'
                  ? 'We will email you a reset link.'
                  : mode === 'signup'
                    ? 'Every Nano Banana model in one editor. Start with 5 free credits.'
                    : 'Generate and edit images with every Nano Banana model, in one editor.'}
            </p>
          </div>

          {success && (
            <Notice tone="success" icon={<CheckCircle2 className="h-4 w-4" />}>
              {success}
            </Notice>
          )}
          {error && (
            <Notice tone="error" icon={<AlertCircle className="h-4 w-4" />}>
              {error}
            </Notice>
          )}

          {mode === 'confirm' ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-ink-2">
                We sent a link to <strong className="text-ink">{email || 'your email'}</strong>. Click it, then come back and sign in.
              </p>
              <Button variant="outline" className="w-full" onClick={resend} loading={loading}>
                <Mail className="h-4 w-4" /> Resend the link
              </Button>
              <button onClick={() => setMode('signin')} className="text-sm font-medium text-accent-text hover:underline">
                Already confirmed? Sign in
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <Field label="Email" icon={<Mail className="h-4 w-4" />}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  className={inputCls}
                />
              </Field>
              {mode !== 'reset' && (
                <Field label="Password" icon={<Lock className="h-4 w-4" />}>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === 'signup' ? 'At least 6 characters' : '••••••••'}
                    required
                    minLength={6}
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    className={inputCls}
                  />
                </Field>
              )}

              {mode === 'signup' && (
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-line bg-surface-2/50 p-3 text-xs leading-relaxed text-ink-2">
                  <input
                    type="checkbox"
                    checked={acceptMarketing}
                    onChange={(e) => setAcceptMarketing(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-[rgb(var(--c-accent))]"
                  />
                  <span>
                    I agree to receive occasional updates about new{' '}
                    <a href="https://www.reinventing.ai" target="_blank" rel="noopener noreferrer" className="font-medium text-accent-text hover:underline">
                      Reinventing.AI
                    </a>{' '}
                    tools and sessions. Required for demo access, unsubscribe any time.
                  </span>
                </label>
              )}

              <Button type="submit" size="lg" className="w-full" loading={loading} disabled={mode === 'signup' && !acceptMarketing}>
                {mode === 'signup' ? 'Create account, get 5 free credits' : mode === 'signin' ? 'Sign in' : 'Send reset link'}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </Button>

              <div className="flex items-center justify-between text-xs">
                <button type="button" onClick={() => setMode(mode === 'signup' ? 'signin' : 'signup')} className="font-medium text-accent-text hover:underline">
                  {mode === 'signup' ? 'Have an account? Sign in' : 'New here? Create an account'}
                </button>
                {mode === 'signin' && (
                  <button type="button" onClick={() => setMode('reset')} className="text-muted hover:text-ink">
                    Forgot password?
                  </button>
                )}
                {mode === 'reset' && (
                  <button type="button" onClick={() => setMode('signin')} className="text-muted hover:text-ink">
                    Back to sign in
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
        <p className="mt-4 flex items-center justify-center gap-3 text-center text-[11px] text-muted">
          <span>
            Open source under AGPL-3.0 ·{' '}
            <a href="https://github.com/markfulton/NanoBananaEditor" target="_blank" rel="noopener noreferrer" className="hover:text-ink">
              GitHub
            </a>
          </span>
          <button type="button" onClick={toggle} className="inline-flex items-center gap-1 rounded-md border border-line px-1.5 py-0.5 hover:text-ink" title="Toggle theme (T)">
            {resolved === 'dark' ? <Sun className="h-3 w-3" /> : <Moon className="h-3 w-3" />}
            {resolved === 'dark' ? 'Light' : 'Dark'}
          </button>
        </p>
      </div>
    </div>
  );
};

const inputCls =
  'h-11 w-full rounded-lg border border-line bg-surface-2/50 pl-10 pr-3 text-sm text-ink placeholder:text-muted/70 transition-colors focus:border-accent/60 focus:bg-surface focus:outline-none';

const Field: React.FC<{ label: string; icon: React.ReactNode; children: React.ReactNode }> = ({ label, icon, children }) => (
  <div>
    <label className="mb-1.5 block text-xs font-medium text-ink-2">{label}</label>
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">{icon}</span>
      {children}
    </div>
  </div>
);

const Notice: React.FC<{ tone: 'success' | 'error'; icon: React.ReactNode; children: React.ReactNode }> = ({ tone, icon, children }) => (
  <div
    className={cn(
      'mb-4 flex items-start gap-2 rounded-lg border p-3 text-sm',
      tone === 'success' ? 'border-success/30 bg-success/10 text-success' : 'border-danger/30 bg-danger/10 text-danger'
    )}
  >
    <span className="mt-0.5">{icon}</span>
    <span>{children}</span>
  </div>
);
