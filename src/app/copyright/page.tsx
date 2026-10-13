import { LegalPage, contactLine } from '@/components/legal-page';
import { BOOKS, loadCounts } from '@/lib/wordbooks';

export const metadata = { title: '词库版权声明' };

const MIT_LICENSE = `MIT License

Copyright (c) 2025 Linwei

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;

export default async function CopyrightPage() {
  const counts = await loadCounts();

  return (
    <LegalPage
      title="词库版权声明"
      intro="本站全部词书均来自可商用的开源数据集，未使用任何商业产品的词表。"
      sections={[
        {
          heading: '一、数据来源',
          body: (
            <>
              <p>
                词库基于开源英汉词典项目 <strong>ECDICT</strong>（作者 Linwei，仓库
                github.com/skywind3000/ECDICT），采用 MIT License 发布，允许商用、修改与再分发，条件是保留其版权声明与许可声明，
                本站已在页面底部与本声明中完整保留。
              </p>
              <p>ECDICT 数据集本身标注了各词条所属的考试大纲标签与语料库词频，本站按这些公开字段进行筛选，不额外抓取其他来源。</p>
            </>
          ),
        },
        {
          heading: '二、每本词书的筛选方式',
          body: (
            <>
              <p>生成规则：读取 ECDICT 词条的 tag（考试标签）与 frq（当代语料库词频）字段，剔除含空格、连字符与词形变化派生词，只保留单词原形与中文释义，按词频升序排列后取前 N 个；中文释义最多保留 3 个义项，并过滤计算机、医学等专业领域义项。脚本随代码仓库保留，可复查。</p>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[560px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-rule text-ink-faint">
                      <th className="py-2 pr-4 font-medium">词书</th>
                      <th className="py-2 pr-4 font-medium">来源标签</th>
                      <th className="py-2 text-right font-medium">词条数</th>
                    </tr>
                  </thead>
                  <tbody>
                    {BOOKS.map(book => (
                      <tr key={book.id} className="border-b border-rule/60">
                        <td className="py-2 pr-4 text-ink">{book.name}</td>
                        <td className="py-2 pr-4 text-ink-soft">{book.source}</td>
                        <td className="py-2 text-right tabular-nums text-ink">{counts[book.id] ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3">
                说明：「小学」与「专八」两套词表在 ECDICT 中没有对应的大纲标签，分别由中考／牛津核心标签的短小高频词、
                高阶标签（gre）按词频筛选生成，属于学习参考范围，不代表任何官方大纲词表。
              </p>
            </>
          ),
        },
        {
          heading: '三、我们不使用的素材',
          body: (
            <>
              <p>不使用、不抓取任何商业背词产品的词表、例句或界面素材；不收录收费词库的导出内容。</p>
              <p>一期不含单词发音、AI 生成例句或 AI 释义，因此不涉及声音授权与生成内容版权风险。</p>
            </>
          ),
        },
        {
          heading: '四、许可声明原文',
          body: (
            <pre className="surface overflow-x-auto whitespace-pre-wrap p-4 text-xs leading-relaxed text-ink-soft">
              {MIT_LICENSE}
            </pre>
          ),
        },
        {
          heading: '五、异议与更正',
          body: (
            <p>
              若你认为本站某部分词表或释义的来源标注有误，请提供具体词书与词条信息。{contactLine()} 核实后我们会在下一次构建词库时移除或更正，并更新本声明。
            </p>
          ),
        },
      ]}
    />
  );
}
