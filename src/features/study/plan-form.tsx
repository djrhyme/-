'use client';

import { useState, useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/input';
import { savePlanAction, type PlanState } from '@/features/study/actions';
import { FREE_DAILY_GOAL_MAX, MEMBER_DAILY_GOAL_MAX } from '@/lib/plans';
import { cn } from '@/lib/utils';

const EMPTY: PlanState = {};
const QUICK_GOALS = [20, 50, 100];

export type BookOption = {
  id: string;
  name: string;
  total: number;
  locked: boolean;
  due: number;
  learned: number;
};

export function PlanForm({
  books,
  current,
  goalLimit,
}: {
  books: BookOption[];
  current: { bookId: string; dailyGoal: number; quizMode: string };
  goalLimit: number;
}) {
  const [state, formAction, pending] = useActionState(savePlanAction, EMPTY);
  const [bookId, setBookId] = useState(current.bookId);
  const [goal, setGoal] = useState(String(current.dailyGoal));
  const [quizMode, setQuizMode] = useState(current.quizMode);

  const selected = books.find(b => b.id === bookId);

  return (
    <form action={formAction} className="space-y-6">
      <Field label="选择词书" htmlFor="bookId">
        <Select id="bookId" name="bookId" value={bookId} onChange={event => setBookId(event.target.value)}>
          {books.map(book => (
            <option key={book.id} value={book.id} disabled={book.locked}>
              {book.name} · {book.total} 词{book.locked ? '（需会员）' : ''}
            </option>
          ))}
        </Select>
      </Field>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field
          label="每日计划单词数量"
          htmlFor="dailyGoal"
          hint={`新词按此数量抽取，到期复习词会优先排在前面。免费版上限 ${FREE_DAILY_GOAL_MAX} 个，会员上限 ${MEMBER_DAILY_GOAL_MAX} 个。`}
        >
          <Input
            id="dailyGoal"
            name="dailyGoal"
            type="number"
            min={5}
            max={goalLimit}
            value={goal}
            onChange={event => setGoal(event.target.value)}
            className="tabular-nums"
          />
          <div className="mt-2 flex gap-2">
            {QUICK_GOALS.filter(value => value <= goalLimit).map(value => (
              <button
                key={value}
                type="button"
                onClick={() => setGoal(String(value))}
                className={cn(
                  'rounded-[3px] border px-3 py-1 text-sm transition-colors',
                  goal === String(value)
                    ? 'border-moss bg-moss-soft text-moss'
                    : 'border-rule bg-card text-ink-soft hover:border-moss',
                )}
              >
                {value}
              </button>
            ))}
          </div>
        </Field>

        <Field label="测验模式" hint="进入学习后仍可切换，两种模式的判分规则一致。">
          <div className="flex gap-3">
            {[
              { value: 'spelling', label: '键盘拼写' },
              { value: 'letters', label: '字母选择' },
            ].map(mode => (
              <button
                key={mode.value}
                type="button"
                onClick={() => setQuizMode(mode.value)}
                className={cn(
                  'h-11 flex-1 rounded-[3px] border text-[0.95rem] transition-colors',
                  quizMode === mode.value
                    ? 'border-moss bg-moss text-white'
                    : 'border-rule bg-card text-ink-soft hover:border-moss hover:text-moss',
                )}
              >
                {mode.label}
              </button>
            ))}
          </div>
          <input type="hidden" name="quizMode" value={quizMode} />
        </Field>
      </div>

      <div className="surface flex flex-wrap items-center justify-between gap-4 bg-paper-deep/40 p-4 text-sm">
        <p className="text-ink-soft">
          词书：{selected?.name ?? '未选择'}
          <span className="mx-2 text-rule">|</span>
          已学 {selected?.learned ?? 0} / {selected?.total ?? 0}
          <span className="mx-2 text-rule">|</span>
          今日到期复习 {selected?.due ?? 0}
        </p>
        <p className="text-ink-faint">队列顺序：到期复习词优先，再补新词</p>
      </div>

      {state.error ? <p className="text-sm text-wrong">{state.error}</p> : null}

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? '生成今日队列' : '确认并开始学习'}
      </Button>
    </form>
  );
}
