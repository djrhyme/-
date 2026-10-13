import { redirect } from 'next/navigation';
import { AuthShell } from '@/components/auth-shell';
import { ResetPasswordForm } from '@/features/auth/login-form';
import { getCurrentUser } from '@/lib/auth';

export const metadata = { title: '重置密码', robots: { index: false, follow: false } };

export default async function ForgotPage() {
  if (await getCurrentUser()) redirect('/study');

  return (
    <AuthShell title="重置密码" lead="用注册邮箱获取验证码，设置新密码。重置后其他设备上的登录状态会全部失效。">
      <ResetPasswordForm />
    </AuthShell>
  );
}
