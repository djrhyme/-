import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('surface p-6', className)} {...props} />;
}

export function CardTitle({ className, children }: { className?: string; children: ReactNode }) {
  return <h2 className={cn('text-xl text-ink', className)}>{children}</h2>;
}

export function CardHeading({ title, hint, action }: { title: ReactNode; hint?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4 border-b border-rule pb-4">
      <div>
        <CardTitle>{title}</CardTitle>
        {hint ? <p className="mt-1 text-sm text-ink-faint">{hint}</p> : null}
      </div>
      {action}
    </div>
  );
}
