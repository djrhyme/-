import { addDays } from '@/lib/dates';

/** 简化 SM2：熟悉度每提升一级，复习间隔按下表拉长（天） */
export const INTERVALS = [1, 2, 4, 7, 15, 30];
export const MAX_FAMILIARITY = INTERVALS.length;

export type SrsSnapshot = { familiarity: number; intervalDays: number };

export type SrsUpdate = {
  familiarity: number;
  intervalDays: number;
  nextReviewAt: string;
  isWrong: boolean;
};

export function applyAnswer(current: SrsSnapshot | null, correct: boolean, today: string): SrsUpdate {
  if (!correct) {
    return { familiarity: 0, intervalDays: 1, nextReviewAt: addDays(today, 1), isWrong: true };
  }
  const familiarity = Math.min(MAX_FAMILIARITY, (current?.familiarity ?? 0) + 1);
  const intervalDays = INTERVALS[familiarity - 1];
  return { familiarity, intervalDays, nextReviewAt: addDays(today, intervalDays), isWrong: false };
}
