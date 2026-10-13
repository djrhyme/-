'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { resetBookProgress } from '@/lib/study';
import { bookById, isBookId } from '@/lib/wordbooks';

export type ResetState = { message?: string; error?: string };

export async function resetBookAction(previous: ResetState, formData: FormData): Promise<ResetState> {
  const user = await requireUser();
  const bookId = formData.get('bookId');
  if (!isBookId(bookId)) return { error: '请选择要清空的词书' };
  if (formData.get('confirm') !== 'yes') return { error: '请勾选确认后再清空' };

  const removed = await resetBookProgress(user.id, bookId);
  revalidatePath('/me');
  revalidatePath('/mistakes');
  return {
    message: `已清空「${bookById(bookId).name}」的 ${removed} 条学习记录（含错题本），从下一题开始重新计算复习间隔。`,
  };
}
