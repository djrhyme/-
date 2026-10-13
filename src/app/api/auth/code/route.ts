import { fail, ok, readJson } from '@/features/api/http';
import { requestVerificationCode } from '@/features/auth/actions';

export async function POST(request: Request) {
  const body = await readJson(request, 4096);
  if (!body) return fail(400, '请求格式不正确');

  const purpose = body.purpose === 'reset' ? 'reset' : 'register';
  const result = await requestVerificationCode(body.email, purpose, body.invite);
  if (!result.ok) return fail(400, result.error);
  return ok({ sent: true, devCode: result.devCode ?? null });
}
