import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { booksAllowed } from '@/lib/plans';
import { bookById, isBookId } from '@/lib/wordbooks';
import { SessionFlow } from '@/features/study/session';

export const metadata: Metadata = {
  title: '背单词',
  robots: { index: false, follow: false },
};

export default async function SessionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  const bookId = typeof params.book === 'string' && isBookId(params.book) ? params.book : null;
  if (!bookId) redirect('/study');
  if (!booksAllowed(user.membershipExpiresAt).includes(bookId)) {
    redirect(`/study?book=${bookId}&need=membership`);
  }

  const mode = params.mode === 'mistakes' ? 'mistakes' : 'daily';
  const book = bookById(bookId);

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:py-12">
      <SessionFlow bookId={bookId} bookName={book.name} mode={mode} />
    </div>
  );
}
