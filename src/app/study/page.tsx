import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { todayStr } from '@/lib/dates';
import { booksAllowed, dailyGoalLimit } from '@/lib/plans';
import { getOverview } from '@/lib/study';
import { BOOKS, isBookId, loadCounts, type BookId } from '@/lib/wordbooks';
import { PlanForm, type BookOption } from '@/features/study/plan-form';
import { LinkButton } from '@/components/ui/button';
import { bookById } from '@/lib/book-catalog';

export const metadata: Metadata = { title: '开始背单词', robots: { index: false, follow: false } };

export default async function StudyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const today = todayStr();

  const counts = await loadCounts();
  const [overview, settings] = await Promise.all([
    getOverview(user.id, counts),
    prisma.bookSetting.findMany({ where: { userId: user.id } }),
  ]);

  const allowed = booksAllowed(user.membershipExpiresAt);
  const limit = dailyGoalLimit(user.membershipExpiresAt);
  const progressByBook = new Map(overview.books.map(item => [item.bookId, item]));
  const settingByBook = new Map(settings.map(item => [item.bookId, item]));

  const lastStudiedRaw = [...settings].sort(
    (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
  )[0]?.bookId;
  const lastStudied = isBookId(lastStudiedRaw) ? lastStudiedRaw : null;
  const requested = typeof params.book === 'string' && isBookId(params.book) ? params.book : null;
  const activeBook: BookId =
    requested && allowed.includes(requested)
      ? requested
      : lastStudied && allowed.includes(lastStudied)
        ? lastStudied
        : allowed[0];

  const options: BookOption[] = BOOKS.map(book => {
    const progress = progressByBook.get(book.id);
    return {
      id: book.id,
      name: book.name,
      total: counts[book.id] ?? 0,
      locked: !allowed.includes(book.id),
      due: progress?.due ?? 0,
      learned: progress?.learned ?? 0,
    };
  });

  const currentSetting = settingByBook.get(activeBook);

  const lockedBookId = requested && !allowed.includes(requested) ? requested : null;
  const needMembership = params.need === 'membership';
  const lockNoticeBook = lockedBookId ? bookById(lockedBookId)?.name : null;

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-10 sm:py-14">
      {needMembership ? (
        <div className="surface mb-6 flex flex-wrap items-center justify-between gap-4 px-5 py-4">
          <p className="text-sm text-ink-soft">
            {lockNoticeBook
              ? `《${lockNoticeBook}》属于会员词库，免费版只开放小学、初中词库。`
              : '高阶词库需要会员才能使用，当前账号尚未开通会员。'}
          </p>
          <LinkButton href="/membership" size="sm">
            了解会员
          </LinkButton>
        </div>
      ) : null}

      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="rule-label">每日计划</p>
          <h1 className="mt-2 text-3xl">今天背哪些单词</h1>
          <p className="mt-2 text-ink-soft">
            选一本词书，设定每日新词数量。到期的复习词会自动排在前面，不需要额外操作。
          </p>
        </div>
        <LinkButton href="/mistakes" variant="outline">
          错题复习
        </LinkButton>
      </div>

      <div className="surface p-6 sm:p-8">
        <PlanForm
          books={options}
          current={{
            bookId: activeBook,
            dailyGoal: Math.min(currentSetting?.dailyGoal ?? 20, limit),
            quizMode: currentSetting?.quizMode ?? 'spelling',
          }}
          goalLimit={limit}
        />
      </div>

      <p className="mt-6 text-sm text-ink-faint">
        今日（{today}）已完成 {overview.today.done} 个单词，连续打卡 {overview.streakDays} 天。
      </p>
    </div>
  );
}
