import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { BookId, Word } from '@/lib/book-catalog';

export * from '@/lib/book-catalog';

async function readJsonFile(file: string): Promise<string> {
  return readFile(path.join(process.cwd(), 'public', 'wordbooks', file), 'utf8');
}

export async function loadBook(id: BookId): Promise<Word[]> {
  return JSON.parse(await readJsonFile(`${id}.json`)) as Word[];
}

export async function loadCounts(): Promise<Record<BookId, number>> {
  const index = JSON.parse(await readJsonFile('index.json')) as {
    books: { id: BookId; count: number }[];
  };
  return Object.fromEntries(index.books.map(b => [b.id, b.count])) as Record<BookId, number>;
}
