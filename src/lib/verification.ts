import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { generateCode, sendCodeMail } from '@/lib/mail';

export type CodePurpose = 'register' | 'reset';

const TTL_MINUTES = 10;
const RESEND_WAIT_MS = 60_000;
const MAX_ATTEMPTS = 5;

const SUBJECT: Record<CodePurpose, string> = {
  register: '注册验证码 · 记词本',
  reset: '重置密码验证码 · 记词本',
};

export type IssueResult = { ok: true; devCode?: string } | { ok: false; error: string };
export type VerifyResult = { ok: true } | { ok: false; error: string };

export async function issueCode(email: string, purpose: CodePurpose): Promise<IssueResult> {
  const latest = await prisma.verification.findFirst({
    where: { email, purpose },
    orderBy: { createdAt: 'desc' },
  });
  if (latest && !latest.consumedAt && Date.now() - latest.createdAt.getTime() < RESEND_WAIT_MS) {
    return { ok: false, error: '验证码已发送，请 1 分钟后再试' };
  }

  await prisma.verification.deleteMany({ where: { email, purpose, consumedAt: null } });
  const code = generateCode();
  await prisma.verification.create({
    data: {
      email,
      purpose,
      codeHash: await bcrypt.hash(code, 8),
      expiresAt: new Date(Date.now() + TTL_MINUTES * 60_000),
    },
  });

  const sent = await sendCodeMail(email, code, SUBJECT[purpose]);
  if (!sent.ok) {
    if (sent.error === 'mail_not_configured') {
      return { ok: false, error: '邮件服务未配置，暂时无法发送验证码' };
    }
    return { ok: false, error: '验证码发送失败，请稍后重试' };
  }
  return { ok: true, devCode: 'devCode' in sent ? sent.devCode : undefined };
}

export async function consumeCode(email: string, purpose: CodePurpose, code: string): Promise<IssueResult & { ok: boolean }> {
  const record = await prisma.verification.findFirst({
    where: { email, purpose, consumedAt: null },
    orderBy: { createdAt: 'desc' },
  });
  if (!record) return { ok: false, error: '请先获取验证码' };
  if (record.expiresAt.getTime() < Date.now()) return { ok: false, error: '验证码已过期，请重新获取' };
  if (record.attempts >= MAX_ATTEMPTS) return { ok: false, error: '验证次数已达上限，请重新获取验证码' };

  const matched = await bcrypt.compare(code.trim(), record.codeHash);
  if (!matched) {
    await prisma.verification.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } });
    return { ok: false, error: '验证码不正确' };
  }

  await prisma.verification.update({ where: { id: record.id }, data: { consumedAt: new Date() } });
  return { ok: true };
}
