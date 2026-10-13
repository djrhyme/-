import type { Metadata } from 'next';
import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { paymentConfigured, queryTrade } from '@/lib/alipay';
import { prisma } from '@/lib/db';
import { formatCnDate } from '@/lib/dates';
import { markOrderPaid } from '@/lib/orders';
import { BOOKS, type BookId } from '@/lib/wordbooks';
import { FREE_DAILY_GOAL_MAX, MEMBER_DAILY_GOAL_MAX, membershipActive } from '@/lib/plans';
import { Badge } from '@/components/ui/badge';
import { CheckoutForm } from '@/features/membership/checkout-form';

export const metadata: Metadata = {
  title: '会员词库',
  description: '开通会员解锁全部 8 套开源词库，取消每日背词数量上限，手动续费不自动扣款。',
};

const FREE_BOOKS: BookId[] = ['primary', 'junior'];

type Notice = { tone: 'moss' | 'clay' | 'wrong'; text: string };

/** 支付宝同步回跳后主动查询一次交易，异步通知仍是权威来源 */
async function resolveReturn(orderNo: string, userId: string): Promise<Notice | null> {
  const order = await prisma.order.findFirst({ where: { orderNo, userId } });
  if (!order) return { tone: 'wrong', text: '没有看到这个订单，请确认是否用当前账号下单。' };
  if (order.status === 'paid') {
    return { tone: 'moss', text: '该订单已支付，会员时长已到账。' };
  }
  if (!paymentConfigured()) return null;

  try {
    const { tradeStatus, tradeNo } = await queryTrade(order.orderNo);
    if (tradeStatus === 'TRADE_SUCCESS' || tradeStatus === 'TRADE_FINISHED') {
      await markOrderPaid(order.orderNo, tradeNo);
      return { tone: 'moss', text: '支付成功，会员已开通。若页面状态未刷新，请稍后重新进入个人中心。' };
    }
    return {
      tone: 'clay',
      text: '订单尚未收到支付结果。支付宝付款完成后，系统会在异步通知到达时自动开通会员，可稍后在订单记录中查看。',
    };
  } catch {
    return { tone: 'clay', text: '暂时无法确认支付结果，稍后可在订单记录中查看状态。' };
  }
}

export default async function MembershipPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  // 支付宝回跳会带上 out_trade_no，也支持手动用 ?order= 查询
  const orderNo =
    typeof params.order === 'string'
      ? params.order
      : typeof params.out_trade_no === 'string'
        ? params.out_trade_no
        : null;

  const [notice, pending] = await Promise.all([
    orderNo ? resolveReturn(orderNo, user.id) : Promise.resolve(null),
    orderNo
      ? prisma.order.count({ where: { userId: user.id, status: 'pending' } })
      : Promise.resolve(0),
  ]);

  const isMember = membershipActive(user.membershipExpiresAt);
  const canPay = paymentConfigured();

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-10 sm:py-14">
      <header className="mb-8">
        <p className="rule-label">会员词库</p>
        <h1 className="mt-2 text-3xl">解锁全部 8 套词库</h1>
        <p className="mt-2 text-ink-soft">
          {isMember ? (
            <>
              当前会员有效期至 <strong className="text-ink">{formatCnDate(user.membershipExpiresAt!)}</strong>
              ，续费在原到期时间上顺延。
            </>
          ) : (
            <>免费版可使用小学、初中两套词库，每日新词上限 {FREE_DAILY_GOAL_MAX} 个。</>
          )}
        </p>
      </header>

      {notice ? (
        <p className="mb-6 rounded-[3px] border border-rule bg-card px-4 py-3 text-sm text-ink-soft">{notice.text}</p>
      ) : null}
      {!notice && pending > 0 ? (
        <p className="mb-6 rounded-[3px] border border-clay/30 bg-clay-soft px-4 py-3 text-sm text-clay">
          你有 {pending} 个待支付订单，重新下单会生成新的订单号。
        </p>
      ) : null}

      <div className="surface p-6 sm:p-8">
        <CheckoutForm canPay={canPay} />
      </div>

      <section className="mt-10">
        <h2 className="text-xl">免费版与会员对比</h2>
        <div className="surface mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-rule text-ink-faint">
              <tr>
                <th className="px-5 py-3 font-medium">能力</th>
                <th className="px-5 py-3 font-medium">免费版</th>
                <th className="px-5 py-3 font-medium">会员</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              <Row free="小学、初中 2 套" member="全部 8 套开源词库" label="可用词库" />
              <Row free={`每日新词上限 ${FREE_DAILY_GOAL_MAX} 个`} member={`每日新词上限 ${MEMBER_DAILY_GOAL_MAX} 个`} label="每日计划" />
              <Row free="支持" member="支持" label="预览 + 拼写 / 字母选择测验" />
              <Row free="支持" member="支持" label="错题本与独立复习" />
              <Row free="支持" member="支持" label="复习间隔自动安排" />
              <Row free="支持" member="支持" label="学习统计与连续打卡" />
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl">词库覆盖</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {BOOKS.map(book => (
            <li key={book.id} className="surface flex items-center justify-between gap-3 px-5 py-4">
              <span>
                <Link href={`/books/${book.id}`} className="text-ink hover:text-moss">
                  {book.name}
                </Link>
                <span className="ml-2 text-sm text-ink-faint">{book.stage}</span>
              </span>
              <Badge tone={FREE_BOOKS.includes(book.id) ? 'moss' : 'clay'}>
                {FREE_BOOKS.includes(book.id) ? '免费' : '会员'}
              </Badge>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10 space-y-3 text-sm text-ink-soft">
        <h2 className="text-xl text-ink">购买说明</h2>
        <p>本站是英语单词记忆练习工具，会员仅提供词库范围与每日数量等软件功能，不包含任何课程、教学或提分服务。</p>
        <p>支付通过支付宝电脑网站支付完成，会员为手动续费，签约自动扣款未启用；到期后不会自动扣费。</p>
        <p>
          词库全部来自开源词典项目 ECDICT（MIT 协议），来源与筛选方式见
          <Link href="/copyright" className="mx-1 text-moss underline">
            词库版权声明
          </Link>
          。释义仅供参考。
        </p>
        <p>
          会员开通后 7 天内未使用且未消耗任何付费额度的，可联系邮箱申请退款；具体规则见
          <Link href="/privacy" className="mx-1 text-moss underline">
            隐私政策与服务说明
          </Link>
          。
        </p>
      </section>
    </div>
  );
}

function Row({ label, free, member }: { label: string; free: string; member: string }) {
  return (
    <tr>
      <th scope="row" className="px-5 py-3 text-left font-medium text-ink">
        {label}
      </th>
      <td className="px-5 py-3 text-ink-soft">{free}</td>
      <td className="px-5 py-3 text-ink-soft">{member}</td>
    </tr>
  );
}
