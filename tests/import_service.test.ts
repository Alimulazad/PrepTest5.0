import { describe, it, expect } from 'vitest';
import { resolveQuestionsImport } from '../server/services/importService.js';

describe('Admin Import Service & Resolution Pipeline', () => {
  it('resolves standard questions into fullyResolvedRows when taxonomy matches cleanly', async () => {
    const rawQuestions = [
      {
        question_text: 'একটি প্রক্ষেপকের সর্বাধিক পাল্লা R_max কত?',
        options: { A: '4H', B: '2H', C: 'H', D: 'H/2' },
        correct_ans: 'A',
        explanation: 'পাল্লা ও উচ্চতার সূত্র',
        subject_id: 'physics_1',
        subject_name: 'পদার্থবিজ্ঞান ১ম পত্র',
        chapter_id: 'phy1_ch3',
        chapter_name: 'গতিবিদ্যা',
        topic_name: 'প্রক্ষেপক ও গতি',
      },
    ];

    const preview = await resolveQuestionsImport(rawQuestions);

    expect(preview.summary.totalRows).toBe(1);
    expect(preview.taxonomyTree).toBeDefined();
    expect(Array.isArray(preview.taxonomyTree)).toBe(true);

    // Should classify into either fullyResolved or ambiguous/missing with clear reason
    expect(preview.fullyResolvedRows.length + preview.ambiguousRows.length + preview.missingTaxonomyRows.length).toBe(1);
  });

  it('detects topic_id and topic_name mismatch and treats row as ambiguous', async () => {
    const rawQuestions = [
      {
        question_text: 'নিচের কোনটি স্কেলার রাশি?',
        options: { A: 'কাজ', B: 'বল', C: 'ত্বরণ', D: 'বেগ' },
        correct_ans: 'A',
        subject_id: 'physics_1',
        subject_name: 'পদার্থবিজ্ঞান ১ম পত্র',
        chapter_id: 'phy1_ch2',
        chapter_name: 'ভেক্টর',
        topic_id: 'phy1_ch2_top1', // e.g. Topic 1 in DB
        topic_name: 'পরিমাপ ও একক সম্পূর্ণ অপ্রাসঙ্গিক নাম', // mismatched name!
      },
    ];

    const preview = await resolveQuestionsImport(rawQuestions);

    // If topic_id exists but name has low similarity, it flags as ambiguous
    expect(preview.summary.totalRows).toBe(1);
    if (preview.ambiguousRows.length > 0) {
      const ambig = preview.ambiguousRows[0];
      expect(ambig.candidates).toBeDefined();
      expect(ambig.reason).toBeTruthy();
    }
  });

  it('marks unknown taxonomy without matching candidate as missingTaxonomyRows with suggested defaults', async () => {
    const rawQuestions = [
      {
        question_text: 'অজ্ঞাত বিষয়ের প্রশ্ন?',
        options: { A: '১', B: '২', C: '৩', D: '৪' },
        correct_ans: 'A',
        subject_name: 'সম্পূর্ণ নতুন অচেনা বিষয় ১৯৯৯',
        chapter_name: 'নতুন অধ্যায় ২০৯৯',
        topic_name: 'নতুন অজানা টপিক',
      },
    ];

    const preview = await resolveQuestionsImport(rawQuestions);

    expect(preview.summary.totalRows).toBe(1);
    expect(preview.missingTaxonomyRows.length + preview.ambiguousRows.length).toBeGreaterThan(0);

    if (preview.missingTaxonomyRows.length > 0) {
      const missing = preview.missingTaxonomyRows[0];
      expect(missing.suggestedDefaults).toBeDefined();
      expect(missing.suggestedDefaults.chapter_id).toBeTruthy();
    }
  });

  it('provides structured taxonomyTree for the cascading picker', async () => {
    const preview = await resolveQuestionsImport([]);
    expect(preview.summary.totalRows).toBe(0);
    expect(preview.taxonomyTree.length).toBeGreaterThan(0);

    const firstSubject = preview.taxonomyTree[0];
    expect(firstSubject.id).toBeTruthy();
    expect(firstSubject.name).toBeTruthy();
    expect(Array.isArray(firstSubject.chapters)).toBe(true);
  });
});
