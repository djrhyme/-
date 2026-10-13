import { prisma } from '@/lib/db';
import { planById } from '@/lib/plans';
import { buildPagePayUrl, paymentConfigured, PaymentNotConfigured } from '@/lib/alipay';
import { SITE_NAME } from '@/lib/site';

export type CreatedOrder = {
  orderNo: string;
  planId: string;
  amountCents: number;
  payUrl: string | null;
  error: string | null;
};

function randomHex(bytes: number): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export function nextOrderNo(now = new Date()): string {
  const local = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  return `${local.toISOString().replace(/[-:TZ]/g, '').slice(0, 14)}${randomHex(4)}`;
}

export async function createOrder(userId: string, planId: string): Promise<CreatedOrder> {
  const plan = planById(planId);
  const orderNo = nextOrderNo();
  await prisma.order.create({
    data: {
      id: crypto.randomUUID(),
      orderNo,
      userId,
      plan: plan.id,
      months: plan.months,
      amountCents: plan.amountCents,
      status: 'pending',
      provider: 'alipay',
    },
  });

  if (!paymentConfigured()) {
    return { orderNo, planId: plan.id, amountCents: plan.amountCents, payUrl: null, error: 'payment_not_configured' };
  }

  try {
    const payUrl = buildPagePayUrl({
      outTradeNo: orderNo,
      totalAmount: (plan.amountCents / 100).toFixed(2),
      subject: `${SITE_NAME} ${plan.name}`,
    });
    return { orderNo, planId: plan.id, amountCents: plan.amountCents, payUrl, error: null };
  } catch (error) {
    const message = error instanceof PaymentNotConfigured ? 'payment_not_configured' : 'payment_start_failed';
    return { orderNo, planId: plan.id, amountCents: plan.amountCents, payUrl: null, error: message };
  }
}

/** 幂等置为已支付：只有第一次通知会延长会员 */
export async function markOrderPaid(orderNo: string, tradeNo: string | null): Promise<'paid' | 'already' | 'not_found'> {
  const updated = await prisma.order.updateMany({
    where: { orderNo, status: 'pending' },
    data: { status: 'paid', tradeNo, paidAt: new Date() },
  });
  if (updated.count === 0) {
    const existing = await prisma.order.findUnique({ where: { orderNo }, select: { id: true } });
    return existing ? 'already' : 'not_found';
  }

  const order = await prisma.order.findUnique({ where: { orderNo }, select: { userId: true, months: true } });
  if (!order) return 'not_found';
  const now = new Date();
  // 单条 SQL 完成续期，避免并发通知相互覆盖
  await prisma.$executeRaw`
    UPDATE "User"
    SET "membershipExpiresAt" = GREATEST(COALESCE("membershipExpiresAt", ${now}::timestamptz), ${now}::timestamptz)
        + make_interval(months => ${order.months}::int),
        "updatedAt" = ${now}::timestamptz
    WHERE id = ${order.userId}
  `;
  return 'paid';
}

export async function listOrders(userId: string, take = 30) {
  return prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take,
    select: {
      id: true,
      orderNo: true,
      plan: true,
      months: true,
      amountCents: true,
      status: true,
      paidAt: true,
      createdAt: true,
    },
  });
}
