import { redirect } from 'next/navigation';
import { AuthShell } from '@/components/auth-shell';
import { LoginForm } from '@/features/auth/login-form';
import { getCurrentUser } from '@/lib/auth';

export const metadata = { title: '登录', robots: { index: false, follow: false } };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect('/study');
  const { next } = await searchParams;

  return (
    <AuthShell title="登录" lead="登录后继续当天的背诵队列，学习记录保存在你的账号里。">
      <LoginForm next={next} />
    </AuthShell>
  );
}
