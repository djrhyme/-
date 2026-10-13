import Link from 'next/link';
import { ECDICT_ATTRIBUTION } from '@/lib/wordbooks';

const LINKS = [
  { href: '/privacy', label: '隐私政策' },
  { href: '/disclaimer', label: '免责声明' },
  { href: '/copyright', label: '词库版权声明' },
];

export function SiteFooter() {
  const icp = process.env.NEXT_PUBLIC_ICP_NUMBER?.trim();

  return (
    <footer className="mt-16 border-t border-rule bg-paper-deep/50">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-ink-soft sm:px-6">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          {LINKS.map(link => (
            <Link key={link.href} href={link.href} className="hover:text-moss">
              {link.label}
            </Link>
          ))}
        </div>
        <p className="mt-4 max-w-3xl leading-relaxed text-ink-faint">
          本站为英语单词记忆练习工具，不提供学科教学或考试辅导。{ECDICT_ATTRIBUTION}
        </p>
        <p className="mt-3 text-ink-faint">
          © {new Date().getFullYear()} 记词本
          {icp ? <span className="ml-3">{icp}</span> : null}
        </p>
      </div>
    </footer>
  );
}
