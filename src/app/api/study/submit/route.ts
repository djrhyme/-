import { fail, ok, readJson } from '@/features/api/http';
import { getCurrentUser } from '@/lib/auth';
import { booksAllowed } from '@/lib/plans';
import { submitAnswers, type AnswerInput } from '@/lib/study';
import { isBookId } from '@/lib/wordbooks';

const MAX_BATCH = 400;

type RawAnswer = { word?: unknown; correct?: unknown; kind?: unknown };

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return fail(401, '请先登录');

  const body = await readJson(request, 64_000);
  if (!body) return fail(400, '请求格式不正确');

  const bookId = body.bookId;
  if (!isBookId(bookId)) return fail(400, '请选择有效的词书');
  if (!booksAllowed(user.membershipExpiresAt).includes(bookId)) {
    return fail(403, '该词书需要开通会员后使用');
  }

  if (!Array.isArray(body.answers) || body.answers.length === 0) {
    return fail(400, '缺少答题记录');
  }

  const answers: AnswerInput[] = (body.answers as RawAnswer[])
    .slice(0, MAX_BATCH)
    .filter(item => item && typeof item === 'object' && typeof item.word === 'string')
    .map(item => ({
      word: (item.word as string).slice(0, 32),
      correct: item.correct === true,
      kind: item.kind === 'new' ? ('new' as const) : ('review' as const),
    }));

  if (answers.length === 0) return fail(400, '答题记录格式不正确');

  const summary = await submitAnswers(user.id, bookId, answers);
  return ok({ ...summary });
}
