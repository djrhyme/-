import { randomInt } from 'node:crypto';
import { isProduction, mailSettings } from '@/lib/env';
import { SITE_NAME } from '@/lib/site';

export function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

export type MailResult = { ok: true; devCode?: string } | { ok: false; error: string };

function template(code: string, minutes: number): string {
  return `<p>您正在使用 ${SITE_NAME}（英语单词记忆练习工具）。</p>
<p>验证码：<b style="font-size:20px;letter-spacing:2px">${code}</b></p>
<p>${minutes} 分钟内有效。如果不是您本人操作，请忽略本邮件。</p>`;
}

export async function sendCodeMail(email: string, code: string, subject: string): Promise<MailResult> {
  const settings = mailSettings();
  const ttlMinutes = 10;

  if (settings.usesConsole) {
    if (isProduction) return { ok: false, error: 'mail_not_configured' };
    console.log(`[开发模式] 验证码邮件 ${email} → ${code}（${subject}）`);
    return { ok: true, devCode: code };
  }

  if (!settings.user || !settings.apiKey || !settings.fromEmail) {
    return { ok: false, error: 'mail_not_configured' };
  }

  const body = new URLSearchParams({
    apiUser: settings.user,
    apiKey: settings.apiKey,
    from: settings.fromEmail,
    fromName: settings.fromName,
    to: email,
    subject,
    html: template(code, ttlMinutes),
    login: '1',
  });

  try {
    const response = await fetch('https://api.sendcloud.net/apiv2/mail/send', {
      method: 'POST',
      body,
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return { ok: false, error: 'mail_send_failed' };
    const result = (await response.json().catch(() => null)) as { result?: boolean } | null;
    return result?.result === true ? { ok: true } : { ok: false, error: 'mail_send_failed' };
  } catch {
    return { ok: false, error: 'mail_send_failed' };
  }
}
