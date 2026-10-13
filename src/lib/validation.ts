import { MEMBER_DAILY_GOAL_MAX } from '@/lib/plans';

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 64;
export const MIN_DAILY_GOAL = 5;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;

export function normalizeEmail(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const value = input.trim().toLowerCase();
  if (value.length === 0 || value.length > 254) return null;
  return EMAIL_RE.test(value) ? value : null;
}

/** 返回 null 表示通过，否则为面向用户的提示文案 */
export function checkPassword(input: unknown): string | null {
  if (typeof input !== 'string') return '请填写密码';
  if (input.length < MIN_PASSWORD_LENGTH || input.length > MAX_PASSWORD_LENGTH) {
    return `密码长度需在 ${MIN_PASSWORD_LENGTH} 到 ${MAX_PASSWORD_LENGTH} 位之间`;
  }
  if (!/[A-Za-z]/.test(input) || !/\d/.test(input)) return '密码需要同时包含字母和数字';
  return null;
}

export function isVerificationCode(input: unknown): input is string {
  return typeof input === 'string' && /^\d{6}$/.test(input.trim());
}

export type QuizMode = 'spelling' | 'letters';

export function isQuizMode(value: unknown): value is QuizMode {
  return value === 'spelling' || value === 'letters';
}

/** 返回 null 表示通过 */
export function checkDailyGoal(raw: unknown, limit: number): string | null {
  const value = typeof raw === 'number' ? raw : Number(String(raw ?? '').trim());
  if (!Number.isInteger(value)) return '每日背词数量请填写整数';
  if (value < MIN_DAILY_GOAL || value > limit) {
    const hint = limit < MEMBER_DAILY_GOAL_MAX ? `，开通会员后可提高至 ${MEMBER_DAILY_GOAL_MAX}` : '';
    return `每日背词数量需在 ${MIN_DAILY_GOAL} 到 ${limit} 之间${hint}`;
  }
  return null;
}

/** 拼写判分：忽略大小写与首尾空格，中间空格不参与比较 */
export function isCorrectSpelling(input: string, answer: string): boolean {
  return input.trim().toLowerCase().replace(/\s+/g, '') === answer.toLowerCase();
}
