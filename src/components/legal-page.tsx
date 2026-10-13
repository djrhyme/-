import type { ReactNode } from 'react';

export function LegalPage({
  title,
  intro,
  sections,
}: {
  title: string;
  intro: string;
  sections: { heading: string; body: ReactNode }[];
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <p className="rule-label">条款与说明</p>
      <h1 className="mt-3 text-3xl text-ink">{title}</h1>
      <p className="mt-4 leading-relaxed text-ink-soft">{intro}</p>
      <div className="mt-8 space-y-8">
        {sections.map(section => (
          <section key={section.heading}>
            <h2 className="text-lg text-ink">{section.heading}</h2>
            <div className="mt-2 space-y-2 text-[0.98rem] leading-relaxed text-ink-soft">
              {section.body}
            </div>
          </section>
        ))}
      </div>
      <p className="mt-10 text-sm text-ink-faint">最近更新日期：2026 年 10 月 13 日</p>
    </div>
  );
}

export function contactLine(): string {
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim();
  return email ? `如有疑问，可发送邮件至 ${email}。` : '如有疑问，请从你的注册邮箱联系站点管理员。';
}
