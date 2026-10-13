'use server';

import { redirect } from 'next/navigation';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { hashPassword, signOut, startSession, verifyPassword } from '@/lib/auth';
import { consumeCode, issueCode } from '@/lib/verification';
import { checkInvite } from '@/lib/invite';
import { checkPassword, isVerificationCode, normalizeEmail } from '@/lib/validation';

export type AuthState = { error?: string; notice?: string };

const GENERIC_LOGIN_ERROR = '邮箱或密码不正确';

export async function registerAction(prev: AuthState, formData: FormData): Promise<AuthState> {
  void prev;
  const email = normalizeEmail(formData.get('email'));
  const code = formData.get('code');
  const password = formData.get('password');
  const agree = formData.get('agree');

  if (!email) return { error: '请填写正确的邮箱地址' };
  if (!isVerificationCode(code)) return { error: '请填写 6 位验证码' };
  const passwordError = checkPassword(password);
  if (passwordError) return { error: passwordError };
  if (agree !== 'on') return { error: '注册前请阅读并同意隐私协议与免责声明' };

  const inviteError = checkInvite(formData.get('invite'));
  if (inviteError) return { error: inviteError };

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return { error: '该邮箱已注册，请直接登录' };

  const verified = await consumeCode(email, 'register', code);
  if (!verified.ok) return { error: verified.error };

  try {
    const user = await prisma.user.create({
      data: { id: crypto.randomUUID(), email, passwordHash: await hashPassword(String(password)) },
    });
    await startSession(user.id);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return { error: '该邮箱已注册，请直接登录' };
    }
    return { error: '注册失败，请稍后重试' };
  }

  redirect('/study');
}

export async function loginAction(prev: AuthState, formData: FormData): Promise<AuthState> {
  void prev;
  const email = normalizeEmail(formData.get('email'));
  const password = formData.get('password');
  if (!email || typeof password !== 'string' || password.length === 0) {
    return { error: GENERIC_LOGIN_ERROR };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: GENERIC_LOGIN_ERROR };
  }

  await startSession(user.id);
  const next = formData.get('next');
  redirect(typeof next === 'string' && next.startsWith('/study') ? next : '/study');
}

export async function resetPasswordAction(prev: AuthState, formData: FormData): Promise<AuthState> {
  void prev;
  const email = normalizeEmail(formData.get('email'));
  const code = formData.get('code');
  const password = formData.get('password');

  if (!email) return { error: '请填写正确的邮箱地址' };
  if (!isVerificationCode(code)) return { error: '请填写 6 位验证码' };
  const passwordError = checkPassword(password);
  if (passwordError) return { error: passwordError };

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) return { error: '该邮箱尚未注册' };

  const verified = await consumeCode(email, 'reset', code);
  if (!verified.ok) return { error: verified.error };

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(String(password)) },
  });
  // 重置密码后原有会话全部失效
  await prisma.session.deleteMany({ where: { userId: user.id } });

  redirect('/login');
}

export async function logoutAction(): Promise<void> {
  await signOut();
  redirect('/');
}

/** 供 /api/auth/code 调用，保持验证码发放逻辑只在服务端 */
export async function requestVerificationCode(
  rawEmail: unknown,
  purpose: 'register' | 'reset',
  rawInvite?: unknown,
) {
  const email = normalizeEmail(rawEmail);
  if (!email) return { ok: false as const, error: '请填写正确的邮箱地址' };
  if (purpose === 'register') {
    const inviteError = checkInvite(rawInvite);
    if (inviteError) return { ok: false as const, error: inviteError };
  }

  const exists = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (purpose === 'register' && exists) return { ok: false as const, error: '该邮箱已注册，请直接登录' };
  if (purpose === 'reset' && !exists) return { ok: false as const, error: '该邮箱尚未注册' };

  const result = await issueCode(email, purpose);
  return result.ok ? { ok: true as const, devCode: result.devCode } : { ok: false as const, error: result.error };
}
