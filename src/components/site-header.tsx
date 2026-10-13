import Link from 'next/link';
import { logoutAction } from '@/features/auth/actions';
import { getCurrentUser } from '@/lib/auth';
import { membershipActive } from '@/lib/plans';
import { SITE_NAME } from '@/lib/site';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const NAV = [
  { href: '/study', label: '开始背单词' },
  { href: '/mistakes', label: '错题复习' },
  { href: '/books/primary', label: '词库' },
  { href: '/membership', label: '会员' },
];

export async function SiteHeader() {
  const user = await getCurrentUser();
  const isMember = user ? membershipActive(user.membershipExpiresAt) : false;

  return (
    <header className="sticky top-0 z-20 border-b border-rule bg-paper/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-[3px] bg-moss font-display text-lg leading-none text-white">
            记
          </span>
          <span className="font-display text-xl leading-none text-ink">{SITE_NAME}</span>
        </Link>

        <nav className="flex flex-1 items-center gap-1 overflow-x-auto text-[0.95rem]">
          {NAV.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="shrink-0 rounded-[3px] px-3 py-2 text-ink-soft transition-colors hover:bg-moss-soft hover:text-moss"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          {user ? (
            <>
              <Link
                href="/me"
                className={cn(
                  'hidden items-center gap-2 rounded-[3px] px-3 py-2 text-sm text-ink-soft hover:text-moss sm:flex',
                )}
              >
                {user.email.split('@')[0]}
                {isMember ? <span className="text-xs text-clay">会员</span> : null}
              </Link>
              <form action={logoutAction}>
                <Button variant="ghost" size="sm" type="submit">
                  退出
                </Button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="px-2 py-2 text-sm text-ink-soft hover:text-moss">
                登录
              </Link>
              <Link
                href="/register"
                className="rounded-[3px] border border-moss bg-moss px-3 py-2 text-sm text-white hover:bg-moss-dark"
              >
                免费注册
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
