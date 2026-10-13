import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { LinkButton } from '@/components/ui/button';
import { BOOKS, bookById, isBookId, loadBook, loadCounts, type BookId } from '@/lib/wordbooks';
import { SITE_NAME } from '@/lib/site';

export function generateStaticParams(): { bookId: BookId }[] {
  return BOOKS.map(book => ({ bookId: book.id }));
}

type Params = { params: Promise<{ bookId: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { bookId } = await params;
  if (!isBookId(bookId)) return { title: '词库不存在' };
  const book = bookById(bookId);
  const counts = await loadCounts();
  return {
    title: book.name,
    description: `${SITE_NAME} ${book.name}，共 ${counts[bookId] ?? 0} 个词条，含音标与中文释义，支持键盘拼写、字母选择测验与错题间隔复习。`,
  };
}

export default async function BookPage({ params }: Params) {
  const { bookId } = await params;
  if (!isBookId(bookId)) notFound();

  const book = bookById(bookId);
  const [words, counts] = await Promise.all([loadBook(bookId), loadCounts()]);
  const preview = words.slice(0, 120);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-rule pb-6">
        <div>
          <p className="rule-label">词库预览</p>
          <h1 className="mt-2 text-3xl text-ink">{book.name}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-3 text-sm text-ink-soft">
            <span>阶段：{book.stage}</span>
            <span>词条数：{counts[bookId] ?? 0}</span>
            <Badge tone={book.tier === 'free' ? 'moss' : 'clay'}>{book.tier === 'free' ? '免费可用' : '会员可用'}</Badge>
          </p>
          <p className="mt-2 max-w-2xl text-sm text-ink-faint">来源：{book.source}</p>
        </div>
        <LinkButton href={book.tier === 'free' ? '/register' : '/membership'}>
          {book.tier === 'free' ? '注册后开始背这本' : '开通会员后开始背'}
        </LinkButton>
      </div>

      <h2 className="mt-8 text-lg text-ink">前 {preview.length} 个单词</h2>
      <ul className="mt-4 grid gap-x-8 gap-y-1 sm:grid-cols-2">
        {preview.map(word => (
          <li key={word.w} className="flex items-baseline gap-3 border-b border-rule/50 py-2 text-sm">
            <span className="word-display w-28 shrink-0 text-base text-ink">{word.w}</span>
            <span className="shrink-0 text-xs text-ink-faint">{word.p}</span>
            <span className="truncate text-ink-soft" title={word.t}>
              {word.t}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-8 flex flex-wrap gap-4 text-sm">
        <Link href="/copyright" className="text-moss underline underline-offset-4">
          词库来源与协议
        </Link>
        <Link href="/study" className="text-moss underline underline-offset-4">
          去学习配置
        </Link>
        <Link href="/" className="text-ink-faint hover:text-moss">
          返回介绍页
        </Link>
      </div>
    </div>
  );
}
