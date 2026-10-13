import { fail, ok, readJson } from '@/features/api/http';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { booksAllowed, dailyGoalLimit } from '@/lib/plans';
import { checkDailyGoal, isQuizMode } from '@/lib/validation';
import { isBookId } from '@/lib/wordbooks';

/** dailyGoal 可选：学习过程中只切换测验模式时不需要重新提交计划数量 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return fail(401, '请先登录');

  const body = await readJson(request, 4096);
  if (!body) return fail(400, '请求格式不正确');

  const bookId = body.bookId;
  if (!isBookId(bookId)) return fail(400, '请选择有效的词书');
  if (!booksAllowed(user.membershipExpiresAt).includes(bookId)) {
    return fail(403, '该词书需要开通会员后使用');
  }
  if (!isQuizMode(body.quizMode)) return fail(400, '请选择测验模式');

  const setting = await prisma.bookSetting.findUnique({
    where: { userId_bookId: { userId: user.id, bookId } },
    select: { dailyGoal: true },
  });
  const dailyGoal = body.dailyGoal === undefined ? setting?.dailyGoal ?? 20 : Number(body.dailyGoal);
  if (body.dailyGoal !== undefined) {
    const goalError = checkDailyGoal(body.dailyGoal, dailyGoalLimit(user.membershipExpiresAt));
    if (goalError) return fail(400, goalError);
  }

  await prisma.bookSetting.upsert({
    where: { userId_bookId: { userId: user.id, bookId } },
    create: { userId: user.id, bookId, dailyGoal, quizMode: body.quizMode },
    update: { dailyGoal, quizMode: body.quizMode },
  });

  return ok({ dailyGoal, quizMode: body.quizMode });
}
