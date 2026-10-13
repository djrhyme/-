'use client';

import { useState, useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { checkoutAction, type CheckoutState } from '@/features/membership/actions';
import { PLANS, formatYuan } from '@/lib/plans';
import { cn } from '@/lib/utils';

const EMPTY: CheckoutState = {};

export function CheckoutForm({ canPay }: { canPay: boolean }) {
  const [state, formAction, pending] = useActionState(checkoutAction, EMPTY);
  const [selected, setSelected] = useState(PLANS[PLANS.length - 1]!.id);

  return (
    <form action={formAction} className="space-y-6">
      <fieldset className="grid gap-3 sm:grid-cols-3">
        <legend className="sr-only">选择会员套餐</legend>
        {PLANS.map(plan => {
          const active = selected === plan.id;
          return (
            <label
              key={plan.id}
              className={cn(
                'surface cursor-pointer p-5 transition-colors',
                active ? 'outline outline-2 -outline-offset-2 outline-moss' : 'hover:border-moss/60',
              )}
            >
              <input
                type="radio"
                name="planId"
                value={plan.id}
                checked={active}
                onChange={() => setSelected(plan.id)}
                className="sr-only"
              />
              <span className="rule-label block">{plan.name}</span>
              <span className="word-display mt-2 block text-3xl">
                <span className="text-lg align-top">¥</span>
                {formatYuan(plan.amountCents)}
              </span>
              <span className="mt-1 block text-sm text-ink-soft">
                {plan.months} 个月 · {plan.blurb}
              </span>
            </label>
          );
        })}
      </fieldset>

      <p className="text-sm text-ink-soft">
        会员为手动续费，到期不自动扣款；开通后立即解锁全部 8 套词库，并取消每日 30 词的上限。
      </p>

      {!canPay ? (
        <p className="surface border-clay/40 bg-clay-soft p-4 text-sm text-clay">
          支付宝参数尚未配置，现在下单只会生成待支付订单；配置完成后在同一页面重新发起支付即可。
        </p>
      ) : null}

      {state.error ? (
        <div className="surface border-clay/40 bg-clay-soft p-4 text-sm text-clay">
          <p>{state.error}</p>
          {state.orderNo ? <p className="mt-1 text-ink-soft">订单号 {state.orderNo}，可在个人中心查看。</p> : null}
        </div>
      ) : null}

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? '正在创建订单…' : '去支付宝支付'}
      </Button>
    </form>
  );
}
