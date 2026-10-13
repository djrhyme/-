export type BookId = 'primary' | 'junior' | 'senior' | 'cet4' | 'cet6' | 'tem8' | 'ielts' | 'toefl';

export type BookMeta = {
  id: BookId;
  name: string;
  stage: string;
  tier: 'free' | 'member';
  /** 词表来源标签，用于版权说明 */
  source: string;
};

export const BOOKS: BookMeta[] = [
  { id: 'primary', name: '小学英语词库', stage: '入门', tier: 'free', source: 'ECDICT 中考/牛津核心标签按词频筛选' },
  { id: 'junior', name: '初中英语词库', stage: '基础', tier: 'free', source: 'ECDICT 标签 zk' },
  { id: 'senior', name: '高中英语词库', stage: '进阶', tier: 'member', source: 'ECDICT 标签 gk' },
  { id: 'cet4', name: '大学四级词库', stage: '进阶', tier: 'member', source: 'ECDICT 标签 cet4' },
  { id: 'cet6', name: '大学六级词库', stage: '高阶', tier: 'member', source: 'ECDICT 标签 cet6' },
  { id: 'tem8', name: '专八词库', stage: '高阶', tier: 'member', source: 'ECDICT 高阶标签（gre）按词频筛选' },
  { id: 'ielts', name: '雅思词库', stage: '高阶', tier: 'member', source: 'ECDICT 标签 ielts' },
  { id: 'toefl', name: '托福词库', stage: '高阶', tier: 'member', source: 'ECDICT 标签 toefl' },
];

export type Word = { w: string; p: string; t: string };

const BOOK_IDS = new Set<string>(BOOKS.map(b => b.id));

export function isBookId(value: unknown): value is BookId {
  return typeof value === 'string' && BOOK_IDS.has(value);
}

export function bookById(id: BookId): BookMeta {
  return BOOKS.find(b => b.id === id)!;
}

export const ECDICT_ATTRIBUTION =
  '词库数据来自开源词典项目 ECDICT（MIT License, Copyright (c) 2025 Linwei），' +
  '本站按考试大纲标签与词频筛选后重新组织，释义仅供参考。' +
  'https://github.com/skywind3000/ECDICT';
