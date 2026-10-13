import { BOOKS, type BookId } from '@/lib/book-catalog';

export const FREE_DAILY_GOAL_MAX = 30;
export const MEMBER_DAILY_GOAL_MAX = 200;
/** 单次进入学习时加载的到期复习词上限 */
export const REVIEW_QUEUE_CAP = 200;

export type Plan = {
  id: string;
  name: string;
  months: number;
  amountCents: number;
  blurb: string;
};

// 价格由运营调整，改这里即可
export const PLANS: Plan[] = [
  { id: 'monthly', name: '月度会员', months: 1, amountCents: 1000, blurb: '解锁全部 8 套词库' },
  { id: 'quarterly', name: '季度会员', months: 3, amountCents: 2700, blurb: '折合每月 9 元' },
  { id: 'yearly', name: '年度会员', months: 12, amountCents: 8800, blurb: '折合每月约 7.3 元' },
];

export function isPlanId(value: unknown): value is string {
  return typeof value === 'string' && PLANS.some(p => p.id === value);
}

export function planById(id: string): Plan {
  const plan = PLANS.find(p => p.id === id);
  if (!plan) throw new Error('unknown plan');
  return plan;
}

export function membershipActive(expiresAt: Date | null, now = new Date()): boolean {
  return expiresAt !== null && expiresAt.getTime() > now.getTime();
}

export function booksAllowed(expiresAt: Date | null): BookId[] {
  return (membershipActive(expiresAt) ? BOOKS : BOOKS.filter(b => b.tier === 'free')).map(b => b.id);
}

export function dailyGoalLimit(expiresAt: Date | null): number {
  return membershipActive(expiresAt) ? MEMBER_DAILY_GOAL_MAX : FREE_DAILY_GOAL_MAX;
}

export function formatYuan(amountCents: number): string {
  return (amountCents / 100).toFixed(2).replace(/\.00$/, '');
}
