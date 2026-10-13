'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpenCheck, CloudUpload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button, LinkButton } from '@/components/ui/button';
import { Quiz } from '@/features/study/quiz';
import { todayStr } from '@/lib/dates';
import type { QueueItem } from '@/lib/study';
import type { QuizMode } from '@/lib/validation';
import { cn } from '@/lib/utils';

type Mode = 'daily' | 'mistakes';
type Phase = 'loading' | 'active' | 'done' | 'empty' | 'error';

type PlanCache = {
  items: QueueItem[];
  quizMode: QuizMode;
  reviewCount: number;
  newCount: number;
};

const FLUSH_SIZE = 8;
const MODE_LABEL: Record<QuizMode, string> = { spelling: '键盘拼写', letters: '字母选择' };

/** 同一本词书当天的队列缓存在 sessionStorage，刷新页面不会重新抽新词 */
function cacheKey(bookId: string, mode: Mode): string {
  return `vc-plan:${bookId}:${mode}:${todayStr()}`;
}

function readCache(key: string): PlanCache | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PlanCache;
    return Array.isArray(parsed.items) ? parsed : null;
  } catch {
    return null;
  }
}

function writeCache(key: string, value: PlanCache): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* 隐私模式或超出配额时忽略，队列仍保存在服务端 */
  }
}

export function SessionFlow({ bookId, bookName, mode }: { bookId: string; bookName: string; mode: Mode }) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [message, setMessage] = useState('');
  const [plan, setPlan] = useState<PlanCache | null>(null);
  const [index, setIndex] = useState(0);
  const [step, setStep] = useState<'preview' | 'quiz'>('preview');
  const [attempt, setAttempt] = useState(0);
  const [quizMode, setQuizMode] = useState<QuizMode>('spelling');
  const [stats, setStats] = useState({ correct: 0, wrong: 0 });
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'failed'>('idle');

  const bufferRef = useRef<{ word: string; correct: boolean; kind: 'new' | 'review' }[]>([]);
  const planRef = useRef<PlanCache | null>(null);
  planRef.current = plan;

  const flush = useCallback(
    async (keepalive = false) => {
      const batch = bufferRef.current;
      if (batch.length === 0) return;
      bufferRef.current = [];
      setSaveState('saving');
      try {
        const response = await fetch('/api/study/submit', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ bookId, answers: batch }),
          keepalive,
        });
        if (!response.ok) throw new Error('rejected');
        setSaveState('idle');
      } catch {
        bufferRef.current = [...batch, ...bufferRef.current];
        setSaveState('failed');
      }
    },
    [bookId],
  );

  // 载入今日队列
  useEffect(() => {
    let cancelled = false;
    async function start() {
      const key = cacheKey(bookId, mode);
      const cached = readCache(key);
      if (cached) {
        if (cancelled) return;
        setPlan(cached);
        setQuizMode(cached.quizMode);
        setPhase(cached.items.length > 0 ? 'active' : 'empty');
        return;
      }
      try {
        const response = await fetch('/api/study/plan', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ bookId, mode }),
        });
        const data = (await response.json().catch(() => null)) as
          | (PlanCache & { ok?: boolean; error?: string })
          | null;
        if (cancelled) return;
        if (!response.ok || !data || data.ok === false) {
          setMessage(data?.error || '队列生成失败，请稍后重试');
          setPhase('error');
          return;
        }
        const next: PlanCache = {
          items: data.items,
          quizMode: data.quizMode === 'letters' ? 'letters' : 'spelling',
          reviewCount: data.reviewCount,
          newCount: data.newCount,
        };
        writeCache(key, next);
        setPlan(next);
        setQuizMode(next.quizMode);
        setPhase(next.items.length > 0 ? 'active' : 'empty');
      } catch {
        if (cancelled) return;
        setMessage('网络异常，队列生成失败');
        setPhase('error');
      }
    }
    void start();
    return () => {
      cancelled = true;
    };
  }, [bookId, mode]);

  // 未保存的答题记录：定期批量提交，离开页面前用 keepalive 兜底
  useEffect(() => {
    const timer = setInterval(() => void flush(), FLUSH_SIZE * 1000);
    const onHide = () => void flush(true);
    window.addEventListener('pagehide', onHide);
    return () => {
      clearInterval(timer);
      window.removeEventListener('pagehide', onHide);
    };
  }, [flush]);

  const items = plan?.items ?? [];
  const current = items[index];

  const advance = useCallback(() => {
    setStep('preview');
    setAttempt(0);
    if (index + 1 >= items.length) {
      void flush();
      sessionStorage.removeItem(cacheKey(bookId, mode));
      setPhase('done');
      return;
    }
    setIndex(value => value + 1);
  }, [bookId, flush, index, items.length, mode]);

  const record = useCallback(
    (correct: boolean) => {
      if (!current) return;
      bufferRef.current.push({ word: current.word, correct, kind: current.kind });
      setStats(value => (correct ? { ...value, correct: value.correct + 1 } : { ...value, wrong: value.wrong + 1 }));
      if (bufferRef.current.length >= FLUSH_SIZE) void flush();
    },
    [current, flush],
  );

  // 预览页右方向键进入测验
  useEffect(() => {
    if (phase !== 'active' || step !== 'preview') return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        setStep('quiz');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, step]);

  async function switchMode(next: QuizMode) {
    if (next === quizMode) return;
    setQuizMode(next);
    try {
      await fetch('/api/study/settings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ bookId, quizMode: next }),
      });
    } catch {
      /* 模式偏好保存失败不影响本次练习 */
    }
  }

  if (phase === 'loading') {
    return (
      <div className="surface mx-auto max-w-2xl p-10 text-center text-ink-soft">
        <BookOpenCheck className="mx-auto mb-3 h-7 w-7 text-ink-faint" />
        正在生成今日队列…
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="surface mx-auto max-w-2xl space-y-5 p-8 text-center">
        <p className="text-lg text-wrong">{message}</p>
        <div className="flex justify-center gap-3">
          <LinkButton href={`/study?book=${bookId}`} variant="outline">
            返回计划设置
          </LinkButton>
          <Button onClick={() => location.reload()}>重新尝试</Button>
        </div>
      </div>
    );
  }

  if (phase === 'empty') {
    return (
      <div className="surface mx-auto max-w-2xl space-y-4 p-10 text-center">
        <h2 className="text-2xl">{bookName}：暂时没有要背的单词</h2>
        <p className="text-ink-soft">
          {mode === 'mistakes'
            ? '这本词书还没有错题，先去完成今日计划吧。'
            : '今日新词已到量，也没有到期需要复习的单词。可以明天再来，或调整每日数量。'}
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <LinkButton href={`/study?book=${bookId}`}>调整每日计划</LinkButton>
          <LinkButton href="/mistakes" variant="outline">
            错题复习
          </LinkButton>
        </div>
      </div>
    );
  }

  if (phase === 'done') {
    const total = stats.correct + stats.wrong;
    return (
      <div className="surface mx-auto max-w-2xl space-y-6 p-8 text-center sm:p-10">
        <div>
          <p className="rule-label">本轮完成</p>
          <h2 className="mt-2 text-3xl">{bookName} 队列已完成</h2>
        </div>
        <dl className="grid grid-cols-3 gap-4 border-y border-rule py-5 text-center">
          <div>
            <dt className="text-sm text-ink-faint">练习单词</dt>
            <dd className="word-display text-3xl">{total}</dd>
          </div>
          <div>
            <dt className="text-sm text-ink-faint">答对</dt>
            <dd className="word-display text-3xl text-correct">{stats.correct}</dd>
          </div>
          <div>
            <dt className="text-sm text-ink-faint">答错</dt>
            <dd className="word-display text-3xl text-wrong">{stats.wrong}</dd>
          </div>
        </dl>
        <p className="text-sm text-ink-faint">
          答错的单词已进入错题本，复习间隔会自动缩短；答对的单词下次复习会更晚出现。
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <LinkButton href={`/study?book=${bookId}`}>返回每日计划</LinkButton>
          {stats.wrong > 0 ? (
            <LinkButton href={`/mistakes?book=${bookId}`} variant="outline">
              立即复习错题
            </LinkButton>
          ) : null}
          <LinkButton href="/me" variant="ghost">
            查看学习统计
          </LinkButton>
        </div>
      </div>
    );
  }

  const percent = Math.round(((index + (step === 'quiz' ? 0.5 : 0)) / items.length) * 100);

  return (
    <div className="mx-auto w-full max-w-2xl">
      <header className="mb-5">
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-ink-soft">
          <p className="flex items-center gap-2">
            <span className="word-display text-lg text-ink">{bookName}</span>
            <Badge tone={current?.kind === 'new' ? 'moss' : 'clay'}>
              {current?.kind === 'new' ? `新词 ${index + 1 - (plan?.reviewCount ?? 0)}` : '复习'}
            </Badge>
          </p>
          <div className="flex items-center gap-4">
            <p className="tabular-nums">
              {index + 1} / {items.length}
            </p>
            <div className="flex overflow-hidden rounded-[3px] border border-rule">
              {(['spelling', 'letters'] as QuizMode[]).map(value => (
                <button
                  key={value}
                  type="button"
                  onClick={() => void switchMode(value)}
                  className={cn(
                    'px-3 py-1 text-sm transition-colors',
                    quizMode === value ? 'bg-moss text-white' : 'bg-card text-ink-soft hover:text-moss',
                  )}
                >
                  {MODE_LABEL[value]}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-3 h-1 w-full rounded-full bg-rule/70">
          <div className="h-1 rounded-full bg-moss transition-[width] duration-300" style={{ width: `${percent}%` }} />
        </div>
      </header>

      {step === 'preview' ? (
        <section className="surface animate-pop p-8 sm:p-10">
          <p className="rule-label">页面 A · 单词预览</p>
          <h2 className="word-display mt-4 text-5xl sm:text-6xl">{current!.word}</h2>
          {current!.phonetic ? <p className="mt-3 text-lg text-ink-faint">{current!.phonetic}</p> : null}
          <p className="mt-6 border-t border-rule pt-6 text-xl leading-relaxed">{current!.meaning}</p>
          <p className="mt-6 text-sm text-ink-faint">先记住拼写和释义，本页面不判分。</p>
          <div className="mt-6 flex items-center gap-3">
            <Button size="lg" onClick={() => setStep('quiz')}>
              开始测验
              <ArrowRight className="h-4 w-4" />
            </Button>
            <span className="text-sm text-ink-faint">或按右方向键</span>
          </div>
        </section>
      ) : (
        <section className="surface p-8 sm:p-10">
          <p className="rule-label mb-4">页面 B · {MODE_LABEL[quizMode]}测验</p>
          <Quiz
            key={`${current!.word}-${quizMode}-${attempt}`}
            item={current!}
            mode={quizMode}
            onResult={record}
            onAdvance={advance}
            onRetry={() => setAttempt(value => value + 1)}
          />
        </section>
      )}

      <footer className="mt-6 flex items-center justify-between gap-4 text-sm text-ink-faint">
        <p className="flex items-center gap-2">
          <CloudUpload className={cn('h-4 w-4', saveState === 'failed' && 'text-wrong')} />
          {saveState === 'saving'
            ? '正在保存学习记录…'
            : saveState === 'failed'
              ? '学习记录暂未保存，将自动重试'
              : '学习记录已同步'}
        </p>
        <Link href={`/study?book=${bookId}`} className="hover:text-moss">
          退出学习
        </Link>
      </footer>
    </div>
  );
}
