import type { ReactNode } from 'react';
import Link from 'next/link';

export function AuthShell({
  title,
  lead,
  children,
}: {
  title: string;
  lead: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-0">
      <div className="surface p-7">
        <p className="rule-label">
          <Link href="/" className="hover:text-moss">
            记词本
          </Link>
        </p>
        <h1 className="mt-2 text-2xl text-ink">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">{lead}</p>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
