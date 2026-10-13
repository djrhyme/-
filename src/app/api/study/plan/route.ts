import { fail, ok, readJson } from '@/features/api/http';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { booksAllowed, dailyGoalLimit } from '@/lib/plans';
import { MIN_DAILY_GOAL } from '@/lib/validation';
import { buildDailyPlan, buildMistakePlan } from '@/lib/study';
import { isBookId } from '@/lib/wordbooks';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return fail(401, '请先登录');

  const body = await readJson(request);
  if (!body) return fail(400, '请求格式不正确');

  const bookId = body.bookId;
  if (!isBookId(bookId)) return fail(400, '请选择有效的词书');
  if (!booksAllowed(user.membershipExpiresAt).includes(bookId)) {
    return fail(403, '该词书需要开通会员后使用');
  }

  const mode = body.mode === 'mistakes' ? 'mistakes' : 'daily';
  const setting = await prisma.bookSetting.findUnique({
    where: { userId_bookId: { userId: user.id, bookId } },
    select: { dailyGoal: true, quizMode: true },
  });

  if (mode === 'mistakes') {
    const plan = await buildMistakePlan(user.id, bookId);
    return ok({ mode, bookId, quizMode: setting?.quizMode ?? 'spelling', ...plan });
  }

  const limit = dailyGoalLimit(user.membershipExpiresAt);
  const goal = Math.max(MIN_DAILY_GOAL, Math.min(setting?.dailyGoal ?? 20, limit));
  const plan = await buildDailyPlan(user.id, bookId, goal);
  return ok({ mode, bookId, goal, quizMode: setting?.quizMode ?? 'spelling', ...plan });
}
