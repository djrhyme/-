import type { Metadata } from 'next';
import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { formatCnDate, formatDateTime, todayStr } from '@/lib/dates';
import { dailyGoalLimit, membershipActive } from '@/lib/plans';
import { getOverview } from '@/lib/study';
import { listOrders } from '@/lib/orders';
import { loadCounts } from '@/lib/wordbooks';
import { Badge } from '@/components/ui/badge';
import { LinkButton } from '@/components/ui/button';
import { ResetBookForm } from '@/features/me/reset-form';

export const metadata: Metadata = {
  title: '个人中心',
  robots: { index: false, follow: false },
};

const ORDER_STATUS: Record<string, { label: string; tone: 'moss' | 'neutral' | 'wrong' }> = {
  paid: { label: '已支付', tone: 'moss' },
  pending: { label: '待支付', tone: 'neutral' },
  closed: { label: '已关闭', tone: 'wrong' },
};

export default async function MePage() {
  const user = await requireUser();
  const counts = await loadCounts();
  const [overview, orders] = await Promise.all([getOverview(user.id, counts), listOrders(user.id)]);

  const isMember = membershipActive(user.membershipExpiresAt);
  const recentMax = Math.max(1, ...overview.recent.map(day => day.done));

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 px-5 py-10 sm:py-14">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="rule-label">个人中心</p>
          <h1 className="mt-2 text-3xl">{user.nickname || '学习者'}</h1>
          <p className="mt-2 text-sm text-ink-faint">
            {user.email} · 注册于 {formatCnDate(user.createdAt)}
          </p>
        </div>
        <Badge tone={isMember ? 'moss' : 'clay'}>{isMember ? '会员' : '免费版'}</Badge>
      </header>

      <section className="surface">
        <div className="grid grid-cols-2 divide-x divide-rule border-b border-rule sm:grid-cols-4">
          <Stat label="累计学习单词" value={overview.totalLearned} />
          <Stat label={`今日完成（${todayStr()}）`} value={overview.today.done} />
          <Stat label="错题数量" value={overview.totalWrong} />
          <Stat label="连续打卡天数" value={overview.streakDays} />
        </div>
        <div className="px-6 py-5">
          <p className="rule-label">近 14 天练习量</p>
          {overview.recent.length === 0 ? (
            <p className="mt-3 text-sm text-ink-faint">还没有学习记录，去生成今日队列吧。</p>
          ) : (
            <div className="mt-4 flex items-end gap-1.5">
              {overview.recent.map(day => (
                <div key={day.date} className="flex-1 text-center" title={`${day.date}：${day.done} 词`}>
                  <div
                    className="mx-auto w-full rounded-t-[2px] bg-moss/80"
                    style={{ height: `${Math.max(4, Math.round((day.done / recentMax) * 56))}px` }}
                  />
                  <p className="mt-1 text-[0.65rem] tabular-nums text-ink-faint">{day.date.slice(8)}</p>
                </div>
              ))}
            </div>
          )}
          <p className="mt-3 text-sm text-ink-soft">
            今天新学 {overview.today.newCount} 个、复习 {overview.today.reviewCount} 个，答对{' '}
            {overview.today.correctCount} 次、答错 {overview.today.wrongCount} 次；共有 {overview.activeDays} 天学习记录。
          </p>
        </div>
      </section>

      <section className="surface space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule pb-4">
          <h2 className="text-xl">会员状态</h2>
          <LinkButton href="/membership" size="sm" variant={isMember ? 'outline' : 'primary'}>
            {isMember ? '续费或更换套餐' : '开通会员'}
          </LinkButton>
        </div>
        <p className="text-ink-soft">
          {isMember ? (
            <>
              会员有效期至 <strong className="text-ink">{formatCnDate(user.membershipExpiresAt!)}</strong>
              ，全部 8 套词库可用，每日计划上限 {dailyGoalLimit(user.membershipExpiresAt)} 词。
            </>
          ) : (
            <>
              当前为免费版：可用小学、初中两套词库，每日计划上限 {dailyGoalLimit(user.membershipExpiresAt)} 词。
              开通会员后解锁高中、四级、六级、专八、雅思、托福词库，并取消每日数量上限。
            </>
          )}
        </p>
        <p className="text-sm text-ink-faint">会员为手动续费，不会自动扣款；到期后仅影响词库范围与每日上限，学习记录会保留。</p>
      </section>

      <section className="surface space-y-4 p-6">
        <div className="border-b border-rule pb-4">
          <h2 className="text-xl">词书进度</h2>
        </div>
        <ul className="divide-y divide-rule">
          {overview.books.map(book => (
            <li key={book.bookId} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <Link href={`/books/${book.bookId}`} className="text-ink hover:text-moss">
                  {book.name}
                </Link>
                <p className="text-sm text-ink-faint">
                  已学 {book.learned} / {book.total}
                  {book.due > 0 ? ` · 今日到期复习 ${book.due}` : ''}
                  {book.wrong > 0 ? ` · 错题 ${book.wrong}` : ''}
                </p>
              </div>
              <div className="flex gap-2">
                {book.wrong > 0 ? (
                  <LinkButton href={`/mistakes?book=${book.bookId}`} size="sm" variant="outline">
                    错题
                  </LinkButton>
                ) : null}
                <LinkButton href={`/study?book=${book.bookId}`} size="sm" variant="ghost">
                  去学习
                </LinkButton>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="surface space-y-4 p-6">
        <div className="border-b border-rule pb-4">
          <h2 className="text-xl">订单记录</h2>
        </div>
        {orders.length === 0 ? (
          <p className="text-sm text-ink-faint">还没有订单。</p>
        ) : (
          <ul className="divide-y divide-rule text-sm">
            {orders.map(order => {
              const status = ORDER_STATUS[order.status] ?? { label: order.status, tone: 'neutral' as const };
              return (
                <li key={order.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-ink">{order.months} 个月会员 · ¥{(order.amountCents / 100).toFixed(2)}</p>
                    <p className="text-ink-faint">
                      {order.orderNo} · 下单 {formatDateTime(order.createdAt)}
                      {order.paidAt ? ` · 支付 ${formatDateTime(order.paidAt)}` : ''}
                    </p>
                  </div>
                  <Badge tone={status.tone}>{status.label}</Badge>
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-sm text-ink-faint">
          支付成功后会员时长即时生效。若已付款但状态未更新，请稍后刷新本页；仍未更新可在
          <Link href="/privacy" className="mx-1 text-moss underline">
            联系邮箱
          </Link>
          反馈订单号。
        </p>
      </section>

      <section className="surface space-y-4 p-6">
        <div className="border-b border-rule pb-4">
          <h2 className="text-xl">清空学习记录</h2>
          <p className="mt-1 text-sm text-ink-faint">按词书清空，只影响所选词书的进度与错题本。</p>
        </div>
        <ResetBookForm
          books={overview.books.map(book => ({ id: book.bookId, name: book.name, learned: book.learned }))}
          defaultBookId={overview.books.find(book => book.learned > 0)?.bookId ?? 'primary'}
        />
      </section>

      <p className="pb-2 text-sm text-ink-faint">
        学习记录保存在本站服务器数据库中，账号密码以加密方式存储。详见
        <Link href="/privacy" className="mx-1 text-moss underline">
          隐私政策
        </Link>
        与
        <Link href="/disclaimer" className="mx-1 text-moss underline">
          免责声明
        </Link>
        。
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="px-5 py-5">
      <p className="text-sm text-ink-faint">{label}</p>
      <p className="word-display mt-1 text-4xl tabular-nums">{value}</p>
    </div>
  );
}
