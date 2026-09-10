import React from 'react';
import { cn } from '../../utils/cn';

export interface SegmentedOption<T extends string | number> {
  value: T;
  label: React.ReactNode;
  hint?: string;
  disabled?: boolean;
}

interface SegmentedProps<T extends string | number> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
  className?: string;
  fullWidth?: boolean;
}

export function Segmented<T extends string | number>({ options, value, onChange, size = 'sm', className, fullWidth = true }: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      className={cn('inline-flex rounded-lg bg-surface-2 p-0.5 border border-line', fullWidth && 'w-full', className)}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={opt.disabled}
            title={opt.hint}
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex-1 rounded-md font-medium transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed',
              size === 'sm' ? 'h-7 px-2 text-xs' : 'h-9 px-3 text-sm',
              active ? 'bg-surface text-ink shadow-soft border border-line-strong/60' : 'text-muted hover:text-ink-2'
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export const Chip: React.FC<{
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  title?: string;
}> = ({ active, onClick, children, className, disabled, title }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={cn(
      'h-7 rounded-md border px-2.5 text-xs font-medium transition-all duration-150 disabled:opacity-40',
      active
        ? 'border-accent/60 bg-accent/15 text-accent-text'
        : 'border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink',
      className
    )}
  >
    {children}
  </button>
);

export const Label: React.FC<{ children: React.ReactNode; hint?: React.ReactNode; className?: string }> = ({ children, hint, className }) => (
  <div className={cn('mb-2 flex items-center justify-between', className)}>
    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">{children}</span>
    {hint && <span className="text-[11px] text-muted">{hint}</span>}
  </div>
);
