import { prisma } from '@/lib/db';
import { parseNotify } from '@/lib/alipay';
import { markOrderPaid } from '@/lib/orders';

export const dynamic = 'force-dynamic';

const SUCCESS_STATUSES = new Set(['TRADE_SUCCESS', 'TRADE_FINISHED']);

function text(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
  });
}

export async function POST(request: Request) {
  const length = Number(request.headers.get('content-length') ?? '0');
  if (!Number.isFinite(length) || length > 64_000) return text('failure', 400);

  let entries: [string, string][];
  try {
    const form = await request.formData();
    entries = [...form.entries()].filter((entry): entry is [string, string] => typeof entry[1] === 'string');
  } catch {
    return text('failure', 400);
  }

  const parsed = parseNotify(Object.fromEntries(entries));
  if (!parsed.valid) return text('failure', 400);
  if (!parsed.outTradeNo) return text('failure', 400);
  if (!parsed.tradeStatus || !SUCCESS_STATUSES.has(parsed.tradeStatus)) return text('success');

  const order = await prisma.order.findUnique({
    where: { orderNo: parsed.outTradeNo },
    select: { amountCents: true, status: true },
  });
  if (!order) return text('failure', 400);

  // 金额必须与订单一致，避免被篡改的通知延长会员
  if (parsed.totalAmount && Math.round(Number(parsed.totalAmount) * 100) !== order.amountCents) {
    return text('failure', 400);
  }

  await markOrderPaid(parsed.outTradeNo, parsed.tradeNo);
  return text('success');
}
