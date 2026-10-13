'use client';

import { useState, useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/input';
import { resetBookAction, type ResetState } from '@/features/me/actions';

const EMPTY: ResetState = {};

export function ResetBookForm({
  books,
  defaultBookId,
}: {
  books: { id: string; name: string; learned: number }[];
  defaultBookId: string;
}) {
  const [state, formAction, pending] = useActionState(resetBookAction, EMPTY);
  const [bookId, setBookId] = useState(defaultBookId);
  const [confirmed, setConfirmed] = useState(false);
  const target = books.find(book => book.id === bookId);

  return (
    <form action={formAction} className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1">
          <label htmlFor="resetBook" className="mb-2 block text-sm font-medium">
            选择词书
          </label>
          <Select id="resetBook" name="bookId" value={bookId} onChange={event => setBookId(event.target.value)}>
            {books.map(book => (
              <option key={book.id} value={book.id}>
                {book.name}（已学 {book.learned} 词）
              </option>
            ))}
          </Select>
        </div>
        <Button type="submit" variant="danger" disabled={pending || !confirmed}>
          {pending ? '正在清空' : '清空学习记录'}
        </Button>
      </div>

      <label className="flex items-start gap-2 text-sm text-ink-soft">
        <input
          type="checkbox"
          name="confirm"
          value="yes"
          checked={confirmed}
          onChange={event => setConfirmed(event.target.checked)}
          className="mt-1 accent-[var(--color-wrong)]"
        />
        <span>
          我确认清空「{target?.name ?? ''}」的全部学习记录。该操作不可撤销：进度、熟悉度、复习间隔和错题本都会归零，
          账号内其他词书不受影响。
        </span>
      </label>

      {state.error ? <p className="text-sm text-wrong">{state.error}</p> : null}
      {state.message ? <p className="text-sm text-moss">{state.message}</p> : null}
    </form>
  );
}
