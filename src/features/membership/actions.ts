'use server';

import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { isPlanId } from '@/lib/plans';
import { createOrder } from '@/lib/orders';

export type CheckoutState = {
  error?: string;
  orderNo?: string;
};

export async function checkoutAction(previous: CheckoutState, formData: FormData): Promise<CheckoutState> {
  const user = await requireUser();
  const planId = formData.get('planId');
  if (!isPlanId(planId)) return { error: '请选择有效的会员套餐' };

  const order = await createOrder(user.id, planId);
  if (order.payUrl) redirect(order.payUrl);

  return {
    orderNo: order.orderNo,
    error:
      order.error === 'payment_not_configured'
        ? '支付功能尚未完成配置（缺少支付宝应用参数），订单已记录，配置后即可重新发起支付。'
        : '发起支付失败，请稍后重试。',
  };
}
