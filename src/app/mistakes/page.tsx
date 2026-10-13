import type { Metadata } from 'next';
import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { formatDateTime, todayStr } from '@/lib/dates';
import { Badge } from '@/components/ui/badge';
import { LinkButton } from '@/components/ui/button';
import { getMistakeList } from '@/lib/study';
import { BOOKS, bookById, isBookId, loadCounts, type BookId } from '@/lib/wordbooks';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: '错题本',
  robots: { index: false, follow: false },
};

export default async function MistakesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const counts = await loadCounts();

  const bookId: BookId =
    typeof params.book === 'string' && isBookId(params.book) ? params.book : 'primary';
  const book = bookById(bookId);
  const mistakes = await getMistakeList(user.id, bookId);
  const today = todayStr();

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-10 sm:py-14">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="rule-label">错题本</p>
          <h1 className="mt-2 text-3xl">做错过的单词</h1>
          <p className="mt-2 text-ink-soft">
            错题复习独立于每日计划，不受当日数量限制。答对后熟悉度回升，答错会继续留在错题本里。
          </p>
        </div>
        {mistakes.length > 0 ? (
          <LinkButton href={`/study/session?book=${bookId}&mode=mistakes`}>开始错题复习</LinkButton>
        ) : null}
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {BOOKS.map(item => (
          <Link
            key={item.id}
            href={`/mistakes?book=${item.id}`}
            className={cn(
              'rounded-[3px] border px-3 py-1.5 text-sm transition-colors',
              item.id === bookId
                ? 'border-moss bg-moss-soft text-moss'
                : 'border-rule bg-card text-ink-soft hover:border-moss hover:text-moss',
            )}
          >
            {item.name}
          </Link>
        ))}
      </div>

      <div className="surface divide-y divide-rule">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
          <h2 className="text-xl">
            {book.name}
            <span className="ml-2 text-sm font-normal text-ink-faint">共 {counts[bookId] ?? 0} 词</span>
          </h2>
          <p className="text-sm text-ink-soft">错题 {mistakes.length} 个</p>
        </div>

        {mistakes.length === 0 ? (
          <p className="px-6 py-14 text-center text-ink-soft">
            这本词书还没有错题。
            <Link href={`/study?book=${bookId}`} className="ml-1 text-moss underline">
              去背单词
            </Link>
          </p>
        ) : (
          <ul className="max-h-[32rem] overflow-y-auto">
            {mistakes.map(item => (
              <li key={item.word} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-6 py-4">
                <div className="min-w-0 flex-1">
                  <p className="word-display text-xl">
                    {item.word}
                    {item.phonetic ? (
                      <span className="ml-3 text-sm font-normal text-ink-faint">{item.phonetic}</span>
                    ) : null}
                  </p>
                  <p className="mt-1 text-ink-soft">{item.meaning}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3 text-sm text-ink-faint">
                  <Badge tone="wrong">错 {item.wrongCount} 次</Badge>
                  <span className="tabular-nums">{formatDateTime(item.lastAt)} 练习</span>
                  {formatDateTime(item.lastAt).slice(0, 10) === today ? (
                    <span className="text-moss">今日错</span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mt-6 text-sm text-ink-faint">
        清空某本词书的学习记录（含错题）可以在
        <Link href="/me" className="mx-1 text-moss underline">
          个人中心
        </Link>
        操作。
      </p>
    </div>
  );
}
