import crypto from 'node:crypto';
import { alipaySettings } from '@/lib/env';

export class PaymentNotConfigured extends Error {
  constructor() {
    super('payment_not_configured');
    this.name = 'PaymentNotConfigured';
  }
}

export function paymentConfigured(): boolean {
  return alipaySettings().ready;
}

function privateKeyPem(raw: string): string {
  const value = raw.replace(/\r/g, '').trim();
  if (value.includes('BEGIN')) return value;
  const body = value.replace(/\s+/g, '').match(/.{1,64}/g)?.join('\n') ?? '';
  return `-----BEGIN PRIVATE KEY-----\n${body}\n-----END PRIVATE KEY-----\n`;
}

function publicKeyPem(raw: string): string {
  const value = raw.replace(/\r/g, '').trim();
  if (value.includes('BEGIN')) return value;
  const body = value.replace(/\s+/g, '').match(/.{1,64}/g)?.join('\n') ?? '';
  return `-----BEGIN PUBLIC KEY-----\n${body}\n-----END PUBLIC KEY-----\n`;
}

function sign(content: string, privateKey: string): string {
  return crypto.createSign('RSA-SHA256').update(content, 'utf8').sign(privateKeyPem(privateKey)).toString('base64');
}

function verify(content: string, signature: string, publicKey: string): boolean {
  try {
    return crypto
      .createVerify('RSA-SHA256')
      .update(content, 'utf8')
      .verify(publicKeyPem(publicKey), signature, 'base64');
  } catch {
    return false;
  }
}

/** 支付宝要求的时间戳为东八区 YYYY-MM-DD HH:mm:ss */
function alipayTimestamp(now = new Date()): string {
  const local = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  return local.toISOString().slice(0, 19).replace('T', ' ');
}

/** 按 key 升序拼接 k=v，跳过空值与 sign / sign_type */
function buildSignContent(params: Record<string, string>): string {
  return Object.keys(params)
    .filter(key => key !== 'sign' && key !== 'sign_type' && params[key] !== '' && params[key] !== undefined && params[key] !== null)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
}

export type PagePayInput = {
  outTradeNo: string;
  totalAmount: string;
  subject: string;
  productCode?: 'FACE_TO_FACE_PAYMENT' | 'FAST_INSTANT_TRADE_PAY';
};

/** 生成电脑网站支付的跳转地址（GET 方式） */
export function buildPagePayUrl(input: PagePayInput): string {
  const settings = alipaySettings();
  if (!settings.ready) throw new PaymentNotConfigured();

  const params: Record<string, string> = {
    app_id: settings.appId,
    method: 'alipay.trade.page.pay',
    format: 'JSON',
    charset: 'utf-8',
    sign_type: 'RSA2',
    timestamp: alipayTimestamp(),
    version: '1.0',
    notify_url: settings.notifyUrl,
    return_url: settings.returnUrl,
    biz_content: JSON.stringify({
      out_trade_no: input.outTradeNo,
      total_amount: input.totalAmount,
      subject: input.subject,
      product_code: input.productCode ?? 'FAST_INSTANT_TRADE_PAY',
    }),
  };

  params.sign = sign(buildSignContent(params), settings.privateKey);

  const query = Object.entries(params)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
  return `${settings.gateway}?${query}`;
}

export type NotifyParams = {
  params: Record<string, string>;
  valid: boolean;
  tradeStatus: string | null;
  outTradeNo: string | null;
  tradeNo: string | null;
  totalAmount: string | null;
};

/** 校验异步通知签名并解析关键字段 */
export function parseNotify(body: Record<string, unknown>): NotifyParams {
  const settings = alipaySettings();
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(body)) {
    if (typeof value === 'string') params[key] = value;
  }
  const signValue = params.sign;
  const base = buildSignContent(params);
  const valid =
    Boolean(settings.publicKey) &&
    Boolean(signValue) &&
    verify(base, signValue ?? '', settings.publicKey) &&
    params.app_id === settings.appId;

  return {
    params,
    valid,
    tradeStatus: params.trade_status ?? null,
    outTradeNo: params.out_trade_no ?? null,
    tradeNo: params.trade_no ?? null,
    totalAmount: params.total_amount ?? null,
  };
}

/** 同步回跳后主动查询交易状态 */
export async function queryTrade(outTradeNo: string): Promise<{ tradeStatus: string | null; tradeNo: string | null }> {
  const settings = alipaySettings();
  if (!settings.ready) throw new PaymentNotConfigured();

  const params: Record<string, string> = {
    app_id: settings.appId,
    method: 'alipay.trade.query',
    format: 'JSON',
    charset: 'utf-8',
    sign_type: 'RSA2',
    timestamp: alipayTimestamp(),
    version: '1.0',
    biz_content: JSON.stringify({ out_trade_no: outTradeNo }),
  };
  params.sign = sign(buildSignContent(params), settings.privateKey);

  const response = await fetch(settings.gateway, {
    method: 'POST',
    body: new URLSearchParams(params),
    headers: { 'content-type': 'application/x-www-form-urlencoded;charset=utf-8' },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) return { tradeStatus: null, tradeNo: null };

  const payload = (await response.json().catch(() => null)) as {
    alipay_trade_query_response?: { trade_status?: string; trade_no?: string };
    error_response?: unknown;
  } | null;
  const result = payload?.alipay_trade_query_response;
  return { tradeStatus: result?.trade_status ?? null, tradeNo: result?.trade_no ?? null };
}
