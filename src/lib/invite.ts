import { createHash, timingSafeEqual } from 'node:crypto';
import { inviteCode } from '@/lib/env';

export function checkInvite(raw: unknown): string | null {
  const expected = inviteCode();
  if (!expected) return null;
  if (typeof raw !== 'string' || raw.trim() === '') return '当前为邀请制访问，请填写邀请码';

  // 两侧先做摘要，长度不同也能常量时间比较
  const given = createHash('sha256').update(raw.trim()).digest();
  const wanted = createHash('sha256').update(expected).digest();
  return timingSafeEqual(given, wanted) ? null : '邀请码不正确';
}
