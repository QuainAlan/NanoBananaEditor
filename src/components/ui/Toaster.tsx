import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { useToastStore, type ToastKind } from '../../store/useToastStore';
import { cn } from '../../utils/cn';

const icons: Record<ToastKind, React.ReactNode> = {
  info: <Info className="h-4 w-4 text-info" />,
  success: <CheckCircle2 className="h-4 w-4 text-success" />,
  error: <AlertCircle className="h-4 w-4 text-danger" />,
  warning: <AlertTriangle className="h-4 w-4 text-accent-text" />,
};

export const Toaster: React.FC = () => {
  const { toasts, dismiss } = useToastStore();
  if (!toasts.length) return null;
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'pointer-events-auto flex items-start gap-3 rounded-xl border border-line bg-surface p-3.5 shadow-pop animate-slide-up',
            t.kind === 'error' && 'border-danger/40'
          )}
        >
          <div className="mt-0.5">{icons[t.kind]}</div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-ink">{t.title}</div>
            {t.description && <div className="mt-0.5 text-xs leading-relaxed text-muted">{t.description}</div>}
            {t.action && (
              <button
                onClick={() => {
                  t.action?.onClick();
                  dismiss(t.id);
                }}
                className="mt-2 text-xs font-semibold text-accent-text hover:underline"
              >
                {t.action.label}
              </button>
            )}
          </div>
          <button onClick={() => dismiss(t.id)} className="text-muted hover:text-ink" aria-label="Dismiss">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
