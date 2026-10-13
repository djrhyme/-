import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

const STYLES = {
  moss: 'border-moss/30 bg-moss-soft text-moss',
  clay: 'border-clay/30 bg-clay-soft text-clay',
  neutral: 'border-rule bg-paper-deep/60 text-ink-soft',
  wrong: 'border-wrong/30 bg-white text-wrong',
} as const;

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: keyof typeof STYLES;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-[3px] border px-2 py-0.5 text-xs font-medium',
        STYLES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
