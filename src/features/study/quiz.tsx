'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Delete, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { isCorrectSpelling, type QuizMode } from '@/lib/validation';
import { cn } from '@/lib/utils';
import type { QueueItem } from '@/lib/study';

type Verdict = 'pending' | 'correct' | 'wrong';

/** 字母顺序打乱；长度大于 1 时避免与正确拼写完全一致 */
function shuffleLetters(word: string): string[] {
  const letters = [...word];
  for (let i = letters.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [letters[i], letters[j]] = [letters[j], letters[i]];
  }
  if (letters.join('') === word && letters.length > 1) letters.reverse();
  return letters;
}

export function Quiz({
  item,
  mode,
  onResult,
  onAdvance,
  onRetry,
}: {
  item: QueueItem;
  mode: QuizMode;
  onResult: (correct: boolean) => void;
  onAdvance: () => void;
  onRetry: () => void;
}) {
  const [verdict, setVerdict] = useState<Verdict>('pending');
  const [typed, setTyped] = useState('');
  const [picked, setPicked] = useState<number[]>([]);
  const letters = useMemo(() => shuffleLetters(item.word), [item.word]);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setVerdict('pending');
    setTyped('');
    setPicked([]);
    if (mode === 'spelling') inputRef.current?.focus();
  }, [item.word, mode]);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  function judge(correct: boolean) {
    if (verdict !== 'pending') return;
    setVerdict(correct ? 'correct' : 'wrong');
    onResult(correct);
    if (correct) {
      timerRef.current = setTimeout(onAdvance, 720);
    }
  }

  function checkSpelling() {
    if (typed.trim().length === 0) return;
    judge(isCorrectSpelling(typed, item.word));
  }

  function pick(index: number) {
    if (verdict !== 'pending' || picked.includes(index)) return;
    const next = [...picked, index];
    setPicked(next);
    const built = next.map(i => letters[i]).join('');
    if (built.length === item.word.length) judge(isCorrectSpelling(built, item.word));
  }

  // 答错后用右方向键继续下一个
  useEffect(() => {
    if (verdict !== 'wrong') return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        onAdvance();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [verdict, onAdvance]);

  return (
    <div className="animate-slide">
      <p className="rule-label">看释义拼出单词</p>
      <p className="mt-3 text-2xl leading-relaxed sm:text-3xl">{item.meaning}</p>
      {item.phonetic ? <p className="mt-2 text-base text-ink-faint">{item.phonetic}</p> : null}

      {mode === 'spelling' ? (
        <form
          className="mt-7 flex flex-wrap items-center gap-3"
          onSubmit={event => {
            event.preventDefault();
            checkSpelling();
          }}
        >
          <Input
            ref={inputRef}
            value={typed}
            onChange={event => setTyped(event.target.value)}
            placeholder="输入英文单词"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            aria-label="英文单词拼写"
            disabled={verdict !== 'pending'}
            className={cn(
              'word-display h-14 max-w-md flex-1 text-2xl tracking-wide',
              verdict === 'correct' && 'border-correct text-correct',
              verdict === 'wrong' && 'border-wrong text-wrong',
            )}
          />
          <Button type="submit" size="lg" disabled={verdict !== 'pending'}>
            判断
          </Button>
        </form>
      ) : (
        <div className="mt-7">
          <div
            className={cn(
              'word-display flex min-h-16 flex-wrap items-center gap-1.5 rounded-[3px] border-2 border-dashed border-rule px-4 py-3 text-3xl',
              verdict === 'correct' && 'border-correct text-correct',
              verdict === 'wrong' && 'border-wrong text-wrong',
            )}
            aria-label="已选字母"
          >
            {picked.length === 0 ? (
              <span className="text-base text-ink-faint">点击下方字母拼出单词</span>
            ) : (
              picked.map(i => <span key={`${i}-${picked.filter(x => x === i).length}`}>{letters[i]}</span>)
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {letters.map((letter, index) => (
              <button
                key={`${index}-${letter}`}
                type="button"
                onClick={() => pick(index)}
                disabled={picked.includes(index) || verdict !== 'pending'}
                className={cn(
                  'word-display h-12 w-12 rounded-[3px] border text-xl transition-colors',
                  picked.includes(index)
                    ? 'border-rule bg-paper-deep text-ink-faint'
                    : 'border-rule bg-card text-ink hover:border-moss hover:bg-moss-soft',
                )}
              >
                {letter}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPicked(list => list.slice(0, -1))}
              disabled={picked.length === 0 || verdict !== 'pending'}
              className="word-display flex h-12 w-12 items-center justify-center rounded-[3px] border border-rule bg-card text-ink-soft hover:border-moss hover:text-moss disabled:opacity-40"
              aria-label="删除最后一个字母"
            >
              <Delete className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      <div className="mt-7 min-h-16">
        {verdict === 'correct' ? (
          <p className="flex items-center gap-2 text-lg text-correct">
            <CheckCircle2 className="h-6 w-6" />
            回答正确，进入下一个单词
          </p>
        ) : null}

        {verdict === 'wrong' ? (
          <div className="space-y-4">
            <p className="text-lg text-wrong">
              拼写错误，正确单词：<span className="word-display text-ink">{item.word}</span>
            </p>
            <div className="flex flex-wrap gap-3">
              <Button onClick={onAdvance}>继续下一个</Button>
              <Button variant="outline" onClick={onRetry}>
                <RotateCcw className="h-4 w-4" />
                再次练习本词
              </Button>
            </div>
          </div>
        ) : null}

        {verdict === 'pending' ? (
          <p className="text-sm text-ink-faint">
            {mode === 'spelling' ? '回车提交 · 右方向键翻到下一步' : '字母点满后自动判分 · 右方向键翻到下一步'}
          </p>
        ) : null}
      </div>
    </div>
  );
}
