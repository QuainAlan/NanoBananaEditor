import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium select-none transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        primary:
          'bg-gradient-to-b from-accent to-accent-2 text-accent-fg shadow-[inset_0_1px_0_rgb(255_255_255/0.35),0_1px_2px_rgb(0_0_0/0.2)] hover:brightness-105',
        secondary: 'bg-surface-2 text-ink hover:bg-surface-3 border border-line',
        outline: 'border border-line-strong/70 bg-transparent text-ink-2 hover:bg-surface-2 hover:text-ink',
        ghost: 'text-ink-2 hover:bg-surface-2 hover:text-ink',
        subtle: 'bg-surface-2/60 text-ink-2 hover:bg-surface-2 hover:text-ink',
        danger: 'bg-danger/10 text-danger border border-danger/30 hover:bg-danger/20',
        link: 'text-accent-text underline-offset-4 hover:underline px-0 h-auto',
      },
      size: {
        xs: 'h-7 px-2 text-xs rounded-md',
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base rounded-xl',
        icon: 'h-9 w-9 rounded-lg',
        'icon-sm': 'h-7 w-7 rounded-md',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  )
);
Button.displayName = 'Button';

export const IconButton = React.forwardRef<HTMLButtonElement, ButtonProps & { label: string }>(
  ({ label, className, size = 'icon', variant = 'ghost', ...props }, ref) => (
    <Button ref={ref} size={size} variant={variant} aria-label={label} title={label} className={className} {...props} />
  )
);
IconButton.displayName = 'IconButton';
