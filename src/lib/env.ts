function read(name: string): string {
  const value = process.env[name];
  return typeof value === 'string' ? value.trim() : '';
}

export const isProduction = process.env.NODE_ENV === 'production';

export function siteUrl(): string {
  return (read('NEXT_PUBLIC_SITE_URL') || 'http://localhost:3000').replace(/\/+$/, '');
}

/** 邀请码：设置后注册必须携带，用于「先私有，只给受邀者」 */
export function inviteCode(): string {
  return read('SITE_INVITE_CODE');
}

export function mailSettings() {
  const provider = (read('MAIL_PROVIDER') || 'console').toLowerCase();
  return {
    provider,
    usesConsole: provider === 'console',
    user: read('SENDCLOUD_USER'),
    apiKey: read('SENDCLOUD_API_KEY'),
    fromEmail: read('SENDCLOUD_FROM_EMAIL'),
    fromName: read('SENDCLOUD_FROM_NAME') || '记词本',
  };
}

export function alipaySettings() {
  const settings = {
    appId: read('ALIPAY_APP_ID'),
    privateKey: read('ALIPAY_PRIVATE_KEY'),
    publicKey: read('ALIPAY_PUBLIC_KEY'),
    gateway: read('ALIPAY_GATEWAY') || 'https://openapi.alipay.com/gateway.do',
    notifyUrl: read('ALIPAY_NOTIFY_URL'),
    returnUrl: read('ALIPAY_RETURN_URL') || `${siteUrl()}/membership`,
  };
  return {
    ...settings,
    ready: Boolean(settings.appId && settings.privateKey && settings.publicKey && settings.notifyUrl),
  };
}
