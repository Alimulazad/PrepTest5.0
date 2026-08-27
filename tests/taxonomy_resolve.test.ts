import { describe, it, expect } from 'vitest';
import {
  normalizeBangla,
  normalizeBanglaKey,
  calculateSimilarity,
  resolveSubject,
  resolveChapter,
  resolveTopic,
  buildTaxonomyTree,
  SubjectEntity,
  ChapterEntity,
  TopicEntity,
} from '../packages/shared/src/taxonomy/resolve.js';

describe('Taxonomy Resolution & Bangla Normalization Engine', () => {
  describe('normalizeBangla()', () => {
    it('handles extra whitespaces, tabs, and trims cleanly', () => {
      const input = '   পদার্থ    বিজ্ঞান   ১ম   পত্র   ';
      expect(normalizeBangla(input)).toBe('পদার্থ বিজ্ঞান ১ম পত্র');
    });

    it('strips invisible Unicode zero-width characters (ZWJ, ZWNJ, BOM) and unifies য-ফলা/য়', () => {
      // \u200C (ZWNJ), \u200D (ZWJ), \uFEFF (BOM)
      const inputWithZwj = 'রসায়ন\u200C ১ম \uFEFFপত্র';
      expect(normalizeBangla(inputWithZwj)).toBe('রসায়ন ১ম পত্র');
    });

    it('handles NFC vs NFD Bengali glyph decompositions', () => {
      const nfc = 'ভেক্টর';
      const nfd = nfc.normalize('NFD');
      expect(normalizeBangla(nfd)).toBe('ভেক্টর');
      expect(normalizeBangla(nfd)).toBe(normalizeBangla(nfc));
    });

    it('normalizes compound conjuncts (যুক্তাক্ষর)', () => {
      const text1 = 'গতিবিদ্যা';
      const text2 = 'গতিবিদ্যা'.normalize('NFD');
      expect(normalizeBangla(text1)).toBe(normalizeBangla(text2));
    });
  });

  describe('normalizeBanglaKey() & calculateSimilarity()', () => {
    it('recognizes identical concepts regardless of internal spaces (পদার্থবিজ্ঞান vs পদার্থ বিজ্ঞান)', () => {
      const s1 = 'পদার্থবিজ্ঞান';
      const s2 = 'পদার্থ বিজ্ঞান';
      expect(normalizeBanglaKey(s1)).toBe(normalizeBanglaKey(s2));
      expect(calculateSimilarity(s1, s2)).toBeGreaterThanOrEqual(0.95);
    });

    it('calculates proper similarity for substring or closely spelled topics', () => {
      const sim = calculateSimilarity('ভেক্টর যোগের নিয়ম', 'ভেক্টর যোগ');
      expect(sim).toBeGreaterThanOrEqual(0.7);
    });
  });

  describe('resolveSubject()', () => {
    const mockSubjects: SubjectEntity[] = [
      { id: 'physics_1', name: 'Physics 1st Paper', bangla_name: 'পদার্থবিজ্ঞান', paper: '1st' },
      { id: 'physics_2', name: 'Physics 2nd Paper', bangla_name: 'পদার্থবিজ্ঞান', paper: '2nd' },
      { id: 'chemistry_1', name: 'Chemistry 1st Paper', bangla_name: 'রসায়ন', paper: '1st' },
      { id: 'chemistry_2', name: 'Chemistry 2nd Paper', bangla_name: 'রসায়ন', paper: '2nd' },
      { id: 'math_1', name: 'Higher Math 1st Paper', bangla_name: 'উচ্চতর গণিত', paper: '1st' },
    ];

    it('resolves exact match by ID', () => {
      const res = resolveSubject({ id: 'physics_1' }, mockSubjects);
      expect(res.matched?.id).toBe('physics_1');
      expect(res.confidence).toBe('exact_id');
    });

    it('flags mismatch when ID conflicts drastically with provided name', () => {
      const res = resolveSubject({ id: 'physics_1', bangla_name: 'উচ্চতর গণিত' }, mockSubjects);
      expect(res.matched).toBeNull();
      expect(res.candidates.length).toBeGreaterThan(0);
      expect(res.message).toContain('matches');
    });

    it('resolves by Bangla name + paper (dealing with space differences)', () => {
      const res = resolveSubject({ bangla_name: 'পদার্থ বিজ্ঞান', paper: '1st' }, mockSubjects);
      expect(res.matched?.id).toBe('physics_1');
      expect(res.confidence).toBe('exact_name');
    });

    it('returns ranked candidates when no exact match exists', () => {
      const res = resolveSubject({ bangla_name: 'পদার্থবিদ্যা' }, mockSubjects);
      expect(res.matched).toBeNull();
      expect(res.candidates.length).toBeGreaterThan(0);
      expect(res.candidates[0].id).toContain('physics');
    });
  });

  describe('resolveChapter()', () => {
    const mockChapters: ChapterEntity[] = [
      { id: 'phy1_ch2', subject_id: 'physics_1', name: 'Vectors', bangla_name: 'ভেক্টর', chapter_number: 2 },
      { id: 'phy1_ch3', subject_id: 'physics_1', name: 'Dynamics', bangla_name: 'গতিবিদ্যা', chapter_number: 3 },
      { id: 'chem1_ch2', subject_id: 'chemistry_1', name: 'Qualitative Chemistry', bangla_name: 'গুণগত রসায়ন', chapter_number: 2 },
    ];

    it('resolves exact chapter under specific subject', () => {
      const res = resolveChapter({ subject_id: 'physics_1', bangla_name: 'ভেক্টর' }, mockChapters);
      expect(res.matched?.id).toBe('phy1_ch2');
      expect(res.confidence).toBe('exact_name');
    });

    it('resolves with noisy Unicode spaces / ZWJ in chapter name', () => {
      const res = resolveChapter(
        { subject_id: 'physics_1', bangla_name: '  ভেক্টর\u200C  ' },
        mockChapters
      );
      expect(res.matched?.id).toBe('phy1_ch2');
      expect(res.confidence).toBe('exact_name');
    });

    it('returns top 5 candidates on chapter typo', () => {
      const res = resolveChapter({ subject_id: 'physics_1', bangla_name: 'ভেক্টর রাশি' }, mockChapters);
      expect(res.matched).toBeNull();
      expect(res.candidates.length).toBeGreaterThan(0);
      expect(res.candidates[0].id).toBe('phy1_ch2');
    });
  });

  describe('resolveTopic()', () => {
    const mockTopics: TopicEntity[] = [
      { id: 't_vec_add', chapter_id: 'phy1_ch2', name: 'Vector Addition', bangla_name: 'ভেক্টর যোজন ও বিয়োজন' },
      { id: 't_vec_dot', chapter_id: 'phy1_ch2', name: 'Dot Product', bangla_name: 'ডট গুণন ও ক্রস গুণন' },
      { id: 't_dyn_proj', chapter_id: 'phy1_ch3', name: 'Projectile', bangla_name: 'প্রাস ও গতি' },
    ];

    it('resolves exact topic within chapter', () => {
      const res = resolveTopic(
        { chapter_id: 'phy1_ch2', bangla_name: 'ভেক্টর যোজন ও বিয়োজন' },
        mockTopics
      );
      expect(res.matched?.id).toBe('t_vec_add');
      expect(res.confidence).toBe('exact_name');
    });

    it('returns candidates when match is incomplete or approximate', () => {
      const res = resolveTopic({ chapter_id: 'phy1_ch2', bangla_name: 'ডট গুণন' }, mockTopics);
      expect(res.matched).toBeNull();
      expect(res.candidates.length).toBeGreaterThan(0);
      expect(res.candidates[0].id).toBe('t_vec_dot');
    });
  });

  describe('buildTaxonomyTree()', () => {
    it('constructs a nested hierarchical tree for cascading picker', () => {
      const subjects: SubjectEntity[] = [
        { id: 'physics_1', name: 'Physics 1', bangla_name: 'পদার্থবিজ্ঞান', paper: '1st' },
      ];
      const chapters: ChapterEntity[] = [
        { id: 'phy1_ch2', subject_id: 'physics_1', name: 'Vectors', bangla_name: 'ভেক্টর' },
      ];
      const topics: TopicEntity[] = [
        { id: 't1', chapter_id: 'phy1_ch2', name: 'Vector Add', bangla_name: 'ভেক্টর যোজন' },
      ];

      const tree = buildTaxonomyTree(subjects, chapters, topics);
      expect(tree.length).toBe(1);
      expect(tree[0].chapters.length).toBe(1);
      expect(tree[0].chapters[0].topics.length).toBe(1);
      expect(tree[0].chapters[0].topics[0].id).toBe('t1');
    });
  });
});
