'use server';

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { booksAllowed, dailyGoalLimit } from '@/lib/plans';
import { checkDailyGoal, isQuizMode } from '@/lib/validation';
import { isBookId, type BookId } from '@/lib/wordbooks';

export type PlanState = { error?: string };

export async function savePlanAction(prev: PlanState, formData: FormData): Promise<PlanState> {
  void prev;
  const user = await getCurrentUser();
  if (!user) return { error: '请先登录' };

  const bookId = formData.get('bookId');
  if (!isBookId(bookId)) return { error: '请选择词书' };
  if (!booksAllowed(user.membershipExpiresAt).includes(bookId)) {
    return { error: '该词书需要开通会员，或改选小学、初中词库' };
  }

  const goalError = checkDailyGoal(formData.get('dailyGoal'), dailyGoalLimit(user.membershipExpiresAt));
  if (goalError) return { error: goalError };

  const quizMode = formData.get('quizMode');
  if (!isQuizMode(quizMode)) return { error: '请选择测验模式' };

  const dailyGoal = Number(formData.get('dailyGoal'));
  await prisma.bookSetting.upsert({
    where: { userId_bookId: { userId: user.id, bookId } },
    create: { userId: user.id, bookId, dailyGoal, quizMode },
    update: { dailyGoal, quizMode },
  });

  redirect(`/study/session?book=${bookId as BookId}`);
}
