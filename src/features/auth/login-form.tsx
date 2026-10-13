'use client';

import Link from 'next/link';
import { useState, useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { loginAction, resetPasswordAction, type AuthState } from '@/features/auth/actions';
import { CodeField } from '@/features/auth/register-form';

const EMPTY: AuthState = {};

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState(loginAction, EMPTY);
  return (
    <form action={formAction} className="space-y-5">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <Field label="邮箱地址" htmlFor="login-email">
        <Input id="login-email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
      </Field>
      <Field label="密码" htmlFor="login-password">
        <Input id="login-password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      {state.error ? <p className="text-sm text-wrong">{state.error}</p> : null}
      <Button type="submit" size="lg" block disabled={pending}>
        {pending ? '登录中' : '登录'}
      </Button>
      <div className="flex items-center justify-between text-sm text-ink-faint">
        <Link href="/forgot" className="hover:text-moss">
          忘记密码
        </Link>
        <Link href="/register" className="text-moss underline underline-offset-4">
          免费注册一个新账号
        </Link>
      </div>
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(resetPasswordAction, EMPTY);
  const [codeValue, setCodeValue] = useState('');

  return (
    <form action={formAction} className="space-y-5">
      <Field label="注册邮箱">
        <CodeField purpose="reset" getCode={setCodeValue} />
      </Field>
      <Field label="验证码" htmlFor="reset-code">
        <Input
          id="reset-code"
          name="code"
          value={codeValue}
          onChange={event => setCodeValue(event.target.value.replace(/\D/g, '').slice(0, 6))}
          inputMode="numeric"
          required
          placeholder="000000"
        />
      </Field>
      <Field label="新密码" htmlFor="reset-password" hint="8 到 64 位，需同时包含字母和数字">
        <Input id="reset-password" name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={64} />
      </Field>
      {state.error ? <p className="text-sm text-wrong">{state.error}</p> : null}
      <Button type="submit" size="lg" block disabled={pending}>
        {pending ? '提交中' : '重置密码并登录'}
      </Button>
      <p className="text-center text-sm text-ink-faint">
        想起来了？
        <Link href="/login" className="text-moss underline underline-offset-4">
          返回登录
        </Link>
      </p>
    </form>
  );
}
