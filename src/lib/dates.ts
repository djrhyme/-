const OFFSET_MS = 8 * 60 * 60 * 1000; // 全站统一使用东八区日期

/** YYYY-MM-DD（东八区） */
export function todayStr(now = new Date()): string {
  return new Date(now.getTime() + OFFSET_MS).toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const base = Date.parse(`${date}T00:00:00Z`);
  if (Number.isNaN(base)) throw new Error('invalid date');
  return new Date(base + days * 86_400_000).toISOString().slice(0, 10);
}

export function diffDays(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

export function formatCnDate(value: string | Date): string {
  const iso = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? value
    : new Date(value).toISOString().slice(0, 10);
  const [y, m, d] = iso.split('-');
  return `${y}年${Number(m)}月${Number(d)}日`;
}

export function formatDateTime(value: Date | string): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  const local = new Date(date.getTime() + OFFSET_MS);
  return local.toISOString().slice(0, 16).replace('T', ' ');
}
