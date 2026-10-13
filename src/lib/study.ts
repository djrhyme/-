import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { addDays, todayStr } from '@/lib/dates';
import { REVIEW_QUEUE_CAP } from '@/lib/plans';
import { applyAnswer, type SrsSnapshot } from '@/lib/srs';
import { BOOKS, loadBook, type BookId } from '@/lib/wordbooks';

export type QueueItem = { word: string; phonetic: string; meaning: string; kind: 'new' | 'review' };
export type DailyPlan = { items: QueueItem[]; reviewCount: number; newCount: number };
export type AnswerInput = { word: string; correct: boolean; kind: 'new' | 'review' };
export type SubmitSummary = {
  recorded: number;
  correctCount: number;
  wrongCount: number;
  date: string;
};

type StateRow = {
  word: string;
  familiarity: number;
  intervalDays: number;
  nextReviewAt: string | null;
  lastReviewAt: Date | null;
};

const stateSelect = {
  word: true,
  familiarity: true,
  intervalDays: true,
  nextReviewAt: true,
  lastReviewAt: true,
} as const;

async function statesOf(userId: string, bookId: BookId, words?: string[]): Promise<StateRow[]> {
  return prisma.wordState.findMany({
    where: { userId, bookId, ...(words ? { word: { in: words } } : {}) },
    select: stateSelect,
  });
}

/** 到期复习词优先，再补当日新词 */
export async function buildDailyPlan(userId: string, bookId: BookId, goal: number): Promise<DailyPlan> {
  const today = todayStr();
  const [book, states] = await Promise.all([loadBook(bookId), statesOf(userId, bookId)]);
  const entryByWord = new Map(book.map(e => [e.w, e]));

  // 只有真正答过的词才算已学：预建但未作答的记录既不复习，也不占用已学数
  const answered = states.filter(s => s.lastReviewAt !== null);
  const seen = new Set(answered.map(s => s.word));

  const due = answered
    .filter(s => s.nextReviewAt !== null && s.nextReviewAt <= today && entryByWord.has(s.word))
    .sort((a, b) => (a.nextReviewAt! < b.nextReviewAt! ? -1 : a.nextReviewAt! > b.nextReviewAt! ? 1 : 0))
    .slice(0, REVIEW_QUEUE_CAP);
  const fresh = book.filter(e => !seen.has(e.w)).slice(0, goal);

  await prisma.bookSetting.upsert({
    where: { userId_bookId: { userId, bookId } },
    create: { userId, bookId, dailyGoal: goal, lastPlanDate: today },
    update: { dailyGoal: goal, lastPlanDate: today },
  });

  const items: QueueItem[] = [
    ...due.map(s => {
      const entry = entryByWord.get(s.word)!;
      return { word: entry.w, phonetic: entry.p, meaning: entry.t, kind: 'review' as const };
    }),
    ...fresh.map(e => ({ word: e.w, phonetic: e.p, meaning: e.t, kind: 'new' as const })),
  ];
  return { items, reviewCount: due.length, newCount: fresh.length };
}

/** 错题单独复习，不受每日计划限制 */
export async function buildMistakePlan(userId: string, bookId: BookId, limit = 100): Promise<DailyPlan> {
  const rows = await prisma.wordState.findMany({
    where: { userId, bookId, isWrong: true },
    orderBy: { updatedAt: 'asc' },
    take: limit,
    select: { word: true },
  });
  const book = await loadBook(bookId);
  const entryByWord = new Map(book.map(e => [e.w, e]));
  const items = rows
    .map(r => entryByWord.get(r.word))
    .filter((e): e is { w: string; p: string; t: string } => Boolean(e))
    .map(e => ({ word: e.w, phonetic: e.p, meaning: e.t, kind: 'review' as const }));
  return { items, reviewCount: items.length, newCount: 0 };
}

export async function submitAnswers(userId: string, bookId: BookId, answers: AnswerInput[]): Promise<SubmitSummary> {
  const today = todayStr();
  const book = await loadBook(bookId);
  const known = new Set(book.map(e => e.w));

  // 同一词多次作答只保留最后一次，词库外的单词直接丢弃
  const latest = new Map<string, AnswerInput>();
  for (const answer of answers) {
    const word = typeof answer.word === 'string' ? answer.word.trim().toLowerCase() : '';
    if (!known.has(word)) continue;
    latest.set(word, { word, correct: answer.correct === true, kind: answer.kind === 'new' ? 'new' : 'review' });
  }

  if (latest.size === 0) {
    return { recorded: 0, correctCount: 0, wrongCount: 0, date: today };
  }

  const words = [...latest.keys()];
  const states = await statesOf(userId, bookId, words);
  const stateByWord = new Map(states.map(s => [s.word, s]));
  const now = new Date();

  const rows = words.map(word => {
    const answer = latest.get(word)!;
    const state = stateByWord.get(word) ?? null;
    const snapshot: SrsSnapshot | null = state ? { familiarity: state.familiarity, intervalDays: state.intervalDays } : null;
    const next = applyAnswer(snapshot, answer.correct, today);
    return { word, next, correct: answer.correct, kind: answer.kind };
  });

  const values = rows.map(row => Prisma.sql`(
    gen_random_uuid()::text, ${userId}, ${bookId}, ${row.word},
    ${row.next.familiarity}, ${row.next.intervalDays}, ${row.next.nextReviewAt},
    ${row.next.isWrong}, ${row.correct ? 0 : 1}, ${now}, ${now}, ${now}
  )`);

  const upsertStates = prisma.$executeRaw(Prisma.sql`
    INSERT INTO "WordState" (
      "id", "userId", "bookId", "word", "familiarity", "intervalDays",
      "nextReviewAt", "isWrong", "wrongCount", "lastReviewAt", "learnedAt", "updatedAt"
    ) VALUES ${Prisma.join(values)}
    ON CONFLICT ("userId", "bookId", "word") DO UPDATE SET
      "familiarity" = EXCLUDED."familiarity",
      "intervalDays" = EXCLUDED."intervalDays",
      "nextReviewAt" = EXCLUDED."nextReviewAt",
      "isWrong" = EXCLUDED."isWrong",
      "wrongCount" = "WordState"."wrongCount" + EXCLUDED."wrongCount",
      "lastReviewAt" = EXCLUDED."lastReviewAt",
      "updatedAt" = EXCLUDED."updatedAt"
  `);

  const correctCount = rows.filter(r => r.correct).length;
  const wrongCount = rows.length - correctCount;
  const newCount = rows.filter(r => r.kind === 'new').length;
  const reviewCount = rows.length - newCount;

  const upsertDay = prisma.studyDay.upsert({
    where: { userId_date: { userId, date: today } },
    create: { userId, date: today, newCount, reviewCount, correctCount, wrongCount },
    update: {
      newCount: { increment: newCount },
      reviewCount: { increment: reviewCount },
      correctCount: { increment: correctCount },
      wrongCount: { increment: wrongCount },
    },
  });

  await prisma.$transaction([upsertStates, upsertDay]);
  return { recorded: rows.length, correctCount, wrongCount, date: today };
}

export type BookProgress = {
  bookId: BookId;
  name: string;
  learned: number;
  wrong: number;
  due: number;
  total: number;
};

export type Overview = {
  today: { date: string; done: number; newCount: number; reviewCount: number; correctCount: number; wrongCount: number };
  totalLearned: number;
  totalWrong: number;
  streakDays: number;
  activeDays: number;
  books: BookProgress[];
  recent: { date: string; done: number }[];
};

export async function getOverview(userId: string, totalsByBook: Record<BookId, number>): Promise<Overview> {
  const today = todayStr();
  const [day, learnedByBook, wrongByBook, dueByBook, history, aggregate] = await Promise.all([
    prisma.studyDay.findUnique({ where: { userId_date: { userId, date: today } } }),
    prisma.wordState.groupBy({
      by: ['bookId'],
      where: { userId, lastReviewAt: { not: null } },
      _count: { _all: true },
    }),
    prisma.wordState.groupBy({ by: ['bookId'], where: { userId, isWrong: true }, _count: { _all: true } }),
    prisma.wordState.groupBy({
      by: ['bookId'],
      where: { userId, lastReviewAt: { not: null }, nextReviewAt: { lte: today } },
      _count: { _all: true },
    }),
    prisma.studyDay.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: 400,
      select: { date: true, newCount: true, reviewCount: true },
    }),
    prisma.studyDay.aggregate({
      where: { userId },
      _sum: { newCount: true, correctCount: true, wrongCount: true },
    }),
  ]);

  const countOf = (rows: { _count: { _all: number }; bookId: string }[]) =>
    new Map(rows.map(r => [r.bookId, r._count._all]));
  const learned = countOf(learnedByBook);
  const wrong = countOf(wrongByBook);
  const due = countOf(dueByBook);

  // 连续打卡：从今（或昨）天往前数连续有学习记录的天数
  const dates = new Set(history.map(h => h.date));
  let streakDays = 0;
  if (dates.has(today) || dates.has(addDays(today, -1))) {
    let cursor = dates.has(today) ? today : addDays(today, -1);
    while (dates.has(cursor)) {
      streakDays += 1;
      cursor = addDays(cursor, -1);
    }
  }

  return {
    today: {
      date: today,
      done: (day?.newCount ?? 0) + (day?.reviewCount ?? 0),
      newCount: day?.newCount ?? 0,
      reviewCount: day?.reviewCount ?? 0,
      correctCount: day?.correctCount ?? 0,
      wrongCount: day?.wrongCount ?? 0,
    },
    totalLearned: aggregate._sum.newCount ?? 0,
    totalWrong: [...wrong.values()].reduce((a, b) => a + b, 0),
    streakDays,
    activeDays: history.length,
    books: BOOKS.map(book => ({
      bookId: book.id,
      name: book.name,
      learned: learned.get(book.id) ?? 0,
      wrong: wrong.get(book.id) ?? 0,
      due: due.get(book.id) ?? 0,
      total: totalsByBook[book.id] ?? 0,
    })),
    recent: history.slice(0, 14).reverse().map(h => ({ date: h.date, done: h.newCount + h.reviewCount })),
  };
}

export async function getMistakeList(userId: string, bookId: BookId, limit = 200) {
  const rows = await prisma.wordState.findMany({
    where: { userId, bookId, isWrong: true },
    orderBy: { updatedAt: 'desc' },
    take: limit,
    select: { word: true, wrongCount: true, updatedAt: true },
  });
  const book = await loadBook(bookId);
  const entryByWord = new Map(book.map(e => [e.w, e]));
  return rows
    .map(row => {
      const entry = entryByWord.get(row.word);
      return entry
        ? { word: row.word, phonetic: entry.p, meaning: entry.t, wrongCount: row.wrongCount, lastAt: row.updatedAt }
        : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
}

/** 一键清空当前词书学习记录 */
export async function resetBookProgress(userId: string, bookId: BookId): Promise<number> {
  const [deleted] = await prisma.$transaction([
    prisma.wordState.deleteMany({ where: { userId, bookId } }),
    prisma.bookSetting.deleteMany({ where: { userId, bookId } }),
  ]);
  return deleted.count;
}
