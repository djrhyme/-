import { redirect } from 'next/navigation';
import { AuthShell } from '@/components/auth-shell';
import { RegisterForm } from '@/features/auth/register-form';
import { getCurrentUser } from '@/lib/auth';
import { inviteCode } from '@/lib/env';

export const metadata = { title: '注册', robots: { index: false, follow: false } };

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect('/study');
  const inviteRequired = inviteCode().length > 0;

  return (
    <AuthShell
      title="注册账号"
      lead={
        inviteRequired
          ? '本站当前为邀请制注册。注册即可使用小学、初中两套词库，每日背词上限 30 个。邮箱只用于登录与找回密码。'
          : '注册即可使用小学、初中两套词库，每日背词上限 30 个。邮箱只用于登录与找回密码。'
      }
    >
      <RegisterForm inviteRequired={inviteRequired} />
    </AuthShell>
  );
}
