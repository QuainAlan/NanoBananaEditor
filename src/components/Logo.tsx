import React from 'react';
import { cn } from '../utils/cn';

interface LogoProps {
  size?: number;
  className?: string;
}

/** Brand mark, served from /public/logo-256.png, the same mark as the favicon, the OG card and the email. */
export const LogoMark: React.FC<LogoProps> = ({ size = 32, className }) => (
  <img
    src="/logo-256.png"
    width={size}
    height={size}
    alt=""
    aria-hidden="true"
    draggable={false}
    className={cn('shrink-0 select-none', className)}
    style={{ width: size, height: size }}
  />
);

export const Wordmark: React.FC<{ className?: string; compact?: boolean }> = ({ className, compact }) => (
  <span className={cn('font-display font-semibold tracking-tight leading-none', className)}>
    <span className="text-ink">Nano Banana</span>
    {!compact && <span className="text-muted font-medium"> Editor</span>}
  </span>
);

export const Logo: React.FC<{ className?: string; compact?: boolean; size?: number }> = ({ className, compact, size = 30 }) => (
  <div className={cn('flex items-center gap-2.5', className)}>
    <LogoMark size={size} />
    <Wordmark compact={compact} className="text-[17px]" />
  </div>
);
