'use client';

import { useEffect, useRef, useState, useActionState, useTransition } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { registerAction, type AuthState } from '@/features/auth/actions';

const EMPTY: AuthState = {};

function requestSendCode(email: string, purpose: 'register' | 'reset', invite?: string) {
  return fetch('/api/auth/code', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, purpose, invite }),
  }).then(async response => {
    const result = (await response.json().catch(() => null)) as {
      ok?: boolean;
      error?: string;
      devCode?: string | null;
    } | null;
    if (!result?.ok) return { ok: false as const, message: result?.error ?? '验证码发送失败，请稍后重试' };
    if (result.devCode) return { ok: true as const, message: `验证码已发送（本地开发模式）：${result.devCode}`, code: result.devCode };
    return { ok: true as const, message: '验证码已发送到邮箱，10 分钟内有效' };
  });
}

export function CodeField({
  purpose,
  getCode,
  invite,
}: {
  purpose: 'register' | 'reset';
  getCode: (code: string) => void;
  invite?: string;
}) {
  const emailRef = useRef<HTMLInputElement>(null);
  const [seconds, setSeconds] = useState(0);
  const [message, setMessage] = useState('');
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = window.setTimeout(() => setSeconds(value => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [seconds]);

  return (
    <div className="space-y-2">
      <div className="flex gap-3">
        <Input
          id={`${purpose}-email`}
          name="email"
          ref={emailRef}
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
        />
        <Button
          variant="outline"
          className="h-11 shrink-0"
          disabled={seconds > 0 || pending}
          onClick={() =>
            startTransition(async () => {
              setMessage('');
              try {
                const result = await requestSendCode(emailRef.current?.value ?? '', purpose, invite);
                setMessage(result.message);
                if ('code' in result && result.code) getCode(result.code);
                if (result.ok) setSeconds(60);
              } catch {
                setMessage('网络异常，请稍后重试');
              }
            })
          }
        >
          {seconds > 0 ? `${seconds} 秒后可重发` : pending ? '发送中' : '获取验证码'}
        </Button>
      </div>
      <p className="text-sm text-ink-faint">{message || '先填写邮箱，再获取 6 位验证码'}</p>
    </div>
  );
}

export function RegisterForm({ inviteRequired = false }: { inviteRequired?: boolean }) {
  const [state, formAction, pending] = useActionState(registerAction, EMPTY);
  const [agreed, setAgreed] = useState(false);
  const [codeValue, setCodeValue] = useState('');
  const [invite, setInvite] = useState('');

  return (
    <form action={formAction} className="space-y-5">
      {inviteRequired ? (
        <Field label="邀请码" htmlFor="invite" hint="本站当前为邀请制，请填写发给你的邀请码">
          <Input
            id="invite"
            name="invite"
            value={invite}
            onChange={event => setInvite(event.target.value.trim())}
            autoComplete="off"
            required
            placeholder="邀请码"
          />
        </Field>
      ) : null}

      <Field label="邮箱地址">
        <CodeField purpose="register" getCode={setCodeValue} invite={invite} />
      </Field>

      <Field label="验证码" htmlFor="code">
        <Input
          id="code"
          name="code"
          value={codeValue}
          onChange={event => setCodeValue(event.target.value.replace(/\D/g, '').slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          placeholder="000000"
        />
      </Field>

      <Field label="设置密码" htmlFor="password" hint="8 到 64 位，需同时包含字母和数字">
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={64} />
      </Field>

      <label className="flex items-start gap-2 text-sm text-ink-soft">
        <input
          type="checkbox"
          name="agree"
          checked={agreed}
          onChange={event => setAgreed(event.target.checked)}
          className="mt-1.5 accent-[#1f5c46]"
        />
        <span>
          我已阅读并同意
          <Link href="/privacy" className="text-moss underline underline-offset-4">
            隐私政策
          </Link>
          、
          <Link href="/disclaimer" className="text-moss underline underline-offset-4">
            免责声明
          </Link>
          与
          <Link href="/copyright" className="text-moss underline underline-offset-4">
            词库版权声明
          </Link>
        </span>
      </label>

      {state.error ? <p className="text-sm text-wrong">{state.error}</p> : null}

      <Button type="submit" size="lg" block disabled={pending || !agreed}>
        {pending ? '注册中' : '注册并开始背单词'}
      </Button>

      <p className="text-center text-sm text-ink-faint">
        已有账号？
        <Link href="/login" className="text-moss underline underline-offset-4">
          直接登录
        </Link>
      </p>
    </form>
  );
}
