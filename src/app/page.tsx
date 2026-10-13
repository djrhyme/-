import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { LinkButton } from '@/components/ui/button';
import { BOOKS, loadCounts } from '@/lib/wordbooks';
import { SITE_SUMMARY, SITE_TAGLINE, SITE_NAME } from '@/lib/site';

const FEATURES = [
  {
    title: '8 套开源词库',
    body: '从小学到托福，按考试大纲标签整理，词库只读，不抓取任何商业词表。',
  },
  {
    title: '自定义每日背词量',
    body: '填写 5 到 200 个之间的数量，系统按当天队列抽取新词，到期复习词优先排在前。',
  },
  {
    title: '两种拼写测验',
    body: '键盘拼写模式逐字母校验；字母选择模式在打乱的字母块中点选拼出单词。',
  },
  {
    title: '错题自动进复习',
    body: '答错的词进入错题库并把熟悉度重置，第二天回到队列；答对则逐级拉长复习间隔。',
  },
  {
    title: '学习统计',
    body: '累计学习量、今日完成量、错题数量与连续打卡天数，保存在你的账号里。',
  },
  {
    title: '键盘翻页',
    body: '预览页与测验页都支持右箭头键进入下一步，PC 端全程可以不用鼠标。',
  },
];

export default async function HomePage() {
  const counts = await loadCounts();

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <section className="grid items-center gap-10 py-14 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <p className="rule-label">{SITE_TAGLINE}</p>
          <h1 className="mt-3 text-4xl leading-tight text-ink sm:text-5xl">
            把要背的单词
            <br />
            排进每天的队列
          </h1>
          <p className="mt-5 max-w-xl text-[1.05rem] leading-relaxed text-ink-soft">{SITE_SUMMARY}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <LinkButton href="/register" size="lg">
              免费注册开始背词
            </LinkButton>
            <LinkButton href="#wordbooks" variant="outline" size="lg">
              查看词库
            </LinkButton>
          </div>
          <p className="mt-4 text-sm text-ink-faint">
            已有账号？
            <Link href="/login" className="text-moss underline underline-offset-4">
              直接登录
            </Link>
          </p>
        </div>

        <div className="relative">
          <div className="surface rotate-[-1.2deg] p-6">
            <p className="rule-label">预览</p>
            <p className="word-display mt-2 text-4xl text-ink">abandon</p>
            <p className="mt-1 text-sm text-ink-faint">/əˈbændən/</p>
            <p className="mt-3 text-ink-soft">vt. 放弃，抛弃；n. 放任</p>
          </div>
          <div className="surface mt-4 ml-10 w-[85%] rotate-[1.6deg] p-6">
            <p className="rule-label">拼写测验</p>
            <p className="mt-2 text-ink-soft">vt. 放弃，抛弃</p>
            <div className="mt-3 flex items-center gap-2">
              <span className="word-display text-2xl text-moss">aband|</span>
              <span className="inline-flex h-6 w-0.5 animate-pulse bg-moss" aria-hidden />
            </div>
            <p className="mt-3 flex items-center gap-2 text-sm text-correct">
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              拼写正确，已进入下一个单词
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-rule py-12">
        <h2 className="text-2xl text-ink">怎么用</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, index) => (
            <div key={feature.title} className="surface p-5">
              <p className="rule-label">{String(index + 1).padStart(2, '0')}</p>
              <h3 className="mt-2 text-lg text-ink">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{feature.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="wordbooks" className="border-t border-rule py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-2xl text-ink">词库一览</h2>
          <p className="text-sm text-ink-faint">
            共 {Object.values(counts).reduce((a, b) => a + b, 0)} 个词条，来源见
            <Link href="/copyright" className="text-moss underline underline-offset-4">
              词库版权声明
            </Link>
          </p>
        </div>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-rule text-ink-faint">
                <th className="py-3 pr-4 font-medium">词书</th>
                <th className="py-3 pr-4 font-medium">适用阶段</th>
                <th className="py-3 pr-4 text-right font-medium">词条数</th>
                <th className="py-3 pr-4 font-medium">权限</th>
                <th className="py-3 font-medium">入口</th>
              </tr>
            </thead>
            <tbody>
              {BOOKS.map(book => (
                <tr key={book.id} className="border-b border-rule/60">
                  <td className="py-3 pr-4 font-display text-base text-ink">{book.name}</td>
                  <td className="py-3 pr-4 text-ink-soft">{book.stage}</td>
                  <td className="py-3 pr-4 text-right tabular-nums text-ink">{counts[book.id] ?? 0}</td>
                  <td className="py-3 pr-4">
                    <Badge tone={book.tier === 'free' ? 'moss' : 'clay'}>
                      {book.tier === 'free' ? '免费' : '会员'}
                    </Badge>
                  </td>
                  <td className="py-3">
                    <Link href={`/books/${book.id}`} className="text-moss underline underline-offset-4">
                      词表预览
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="border-t border-rule py-12">
        <div className="surface flex flex-wrap items-center justify-between gap-6 p-6">
          <div>
            <h2 className="text-xl text-ink">免费版与会员</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
              免费版可正常使用小学、初中两套词库，每日背词上限 30 个；会员解锁全部 8 套词库，取消每日数量上限，
              并保留完整的间隔复习与错题本功能。会员为手动续费，不会自动扣款。
            </p>
          </div>
          <LinkButton href="/membership" variant="clay">
            查看会员价格
          </LinkButton>
        </div>
        <p className="mt-6 text-sm leading-relaxed text-ink-faint">
          {SITE_NAME}只做单词记忆与拼写练习，不涉及课程讲授、作业辅导或任何形式的学科培训。
        </p>
      </section>
    </div>
  );
}
