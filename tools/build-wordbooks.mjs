// Build per-book word lists from the MIT-licensed ECDICT dictionary.
// Input: ecdict.csv at project root (local only, never published).
// Output: public/wordbooks/<id>.json
import fs from 'node:fs';
import path from 'node:path';

const SRC = process.argv[2] ?? 'ecdict.csv';
const OUT = 'public/wordbooks';

function parseRow(line) {
  const out = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } else q = false;
      } else cur += c;
    } else if (c === '"') q = true;
    else if (c === ',') { out.push(cur); cur = ''; } else cur += c;
  }
  out.push(cur);
  return out;
}

const BOOKS = [
  { id: 'primary', name: '小学基础词', tag: null, max: 600, basicOnly: true },
  { id: 'junior', name: '中考英语词', tag: 'zk', max: 1600 },
  { id: 'senior', name: '高考英语词', tag: 'gk', max: 3600 },
  { id: 'cet4', name: '大学英语四级', tag: 'cet4', max: 3800 },
  { id: 'cet6', name: '大学英语六级', tag: 'cet6', max: 5400 },
  { id: 'tem8', name: '高阶词汇（专业八级水平）', tag: 'gre', max: 6000 },
  { id: 'ielts', name: '雅思词汇', tag: 'ielts', max: 5000 },
  { id: 'toefl', name: '托福词汇', tag: 'toefl', max: 6900 },
];

const raw = fs.readFileSync(SRC, 'utf8');
const lines = raw.split(/\r?\n/);
const header = parseRow(lines[0]);
const I = Object.fromEntries(header.map((h, i) => [h, i]));

const entries = [];
for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  if (!line) continue;
  const f = parseRow(line);
  const word = f[I.word];
  if (!/^[A-Za-z]{2,17}$/.test(word)) continue;
  const translation = (f[I.translation] || '').replace(/\\n/g, '\n').trim();
  if (!translation) continue;
  const frqNum = Number.parseInt(f[I.frq] || '0', 10);
  entries.push({
    word,
    lower: word.toLowerCase(),
    phonetic: (f[I.phonetic] || '').trim(),
    translation,
    tags: (f[I.tag] || '').trim() ? (f[I.tag] || '').trim().split(/\s+/) : [],
    oxford: f[I.oxford] === '1',
    exchange: (f[I.exchange] || '').trim(),
    frq: Number.isSafeInteger(frqNum) && frqNum > 0 ? frqNum : 9_999_999,
  });
}

const byLower = new Map();
for (const e of entries) if (!byLower.has(e.lower)) byLower.set(e.lower, e);

// 基础词表里剔除纯语法功能词
const GRAMMAR_WORDS = new Set(['be', 'have', 'do', 'say', 'not', 'that', 'this', 'there', 'they', 'them', 'their', 'what', 'when', 'where', 'which', 'who', 'whom', 'why', 'how', 'too', 'also', 'only', 'just', 'very', 'more', 'most', 'some', 'any', 'many', 'much', 'each', 'other', 'such', 'still', 'again', 'ever', 'never', 'almost', 'enough', 'both', 'either', 'none', 'one', 'two', 'three', 'first', 'last', 'next', 'back', 'well', 'home', 'here', 'about', 'after', 'before', 'between', 'because', 'although', 'though', 'if', 'or', 'but', 'so', 'because', 'with', 'without', 'within', 'against']);
function cleanMeaning(text) {
  const parts = text.split('\n')
    .map(s => s.trim())
    .filter(Boolean)
    .filter(s => !s.startsWith('[') && !s.includes('人名') && !s.includes('[计]') && !s.includes('[医]') && !s.includes('[化]'));

  // 测验页需要在首屏读完释义：最多 3 个词性、每个词性 3 个义项
  return parts.slice(0, 3).map(part => {
    const matched = /^([A-Za-z]+\.)\s*(.*)$/.exec(part);
    const head = matched ? `${matched[1]} ` : '';
    const body = matched ? matched[2] : part;
    const senses = body.split(/[,，;；]/).map(s => s.trim()).filter(Boolean).slice(0, 3).join(', ');
    return head + senses;
  }).filter(Boolean).join('；');
}

function cleanPhonetic(raw) {
  const value = raw.replace(/^\/+|\/+$/g, '').trim();
  return value ? `/${value}/` : '';
}

fs.mkdirSync(OUT, { recursive: true });
const report = [];
for (const book of BOOKS) {
  let picked;
  if (book.basicOnly) {
    // 小学：从中考标签与牛津核心词里取短小、高频的名词/动词/形容词原形
    picked = [...byLower.values()].filter(e => {
      const meaning = cleanMeaning(e.translation);
      return (e.tags.includes('zk') || e.oxford)
        && e.word.length <= 8
        && e.frq <= 8000
        && !/^0:/.test(e.exchange)
        && /^[a-z]+$/.test(e.lower)
        && !GRAMMAR_WORDS.has(e.lower)
        && !!meaning
        && /^(n\.|v\.|vt\.|vi\.|a\.|adj\.)/.test(meaning);
    });
  } else {
    picked = [...byLower.values()].filter(e => e.tags.includes(book.tag));
  }
  picked.sort((a, b) => a.frq - b.frq || a.lower.localeCompare(b.lower));
  picked = picked
    .map(e => ({ w: e.lower, p: cleanPhonetic(e.phonetic), t: cleanMeaning(e.translation) }))
    .filter(e => e.t)
    // 只由冠词、介词、连词、代词、感叹词构成的语法词不适合拼写练习
    .filter(e => !e.t.split('；').every(part => /^(art|prep|conj|pron|int)\./.test(part)))
    .slice(0, book.max);
  fs.writeFileSync(path.join(OUT, `${book.id}.json`), JSON.stringify(picked), 'utf8');
  report.push({ id: book.id, name: book.name, count: picked.length, kb: Math.round(fs.statSync(path.join(OUT, `${book.id}.json`)).size / 1024) });
}

const index = {
  generatedFrom: 'ECDICT (MIT License, Copyright (c) 2025 Linwei) https://github.com/skywind3000/ECDICT',
  books: report.map(r => ({ id: r.id, name: r.name, count: r.count })),
};
fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(index, null, 2), 'utf8');
console.table(report);
