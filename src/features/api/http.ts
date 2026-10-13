import { NextResponse } from 'next/server';

const NO_STORE = { 'cache-control': 'no-store' };

export function ok(data: Record<string, unknown> = {}) {
  return NextResponse.json({ ok: true, ...data }, { headers: NO_STORE });
}

export function fail(status: number, error: string) {
  return NextResponse.json({ ok: false, error }, { status, headers: NO_STORE });
}

/** 读取并限制 JSON 请求体大小，避免超大载荷进入校验逻辑 */
export async function readJson(request: Request, maxBytes = 32_000): Promise<Record<string, unknown> | null> {
  const length = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(length) && length > maxBytes) return null;
  const text = await request.text();
  if (text.length > maxBytes) return null;
  try {
    const parsed = JSON.parse(text) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    /* 交给调用方返回统一错误 */
  }
  return null;
}
