import { describe, it, expect } from 'vitest';
import {
  registerSchema,
  loginSchema,
  adminLoginSchema,
  questionCreateUpdateSchema,
} from '../server/validation/schemas.js';

describe('Zod Request Validation Schemas', () => {
  describe('registerSchema', () => {
    it('passes valid student registration payload', () => {
      const valid = {
        phone: '01711223344',
        password: 'securePassword123',
        name: 'রাফি আলিম',
        target_university: 'du_a',
        exam_year: '2025',
      };
      const result = registerSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects registration with short phone or missing name', () => {
      const invalid = {
        phone: '123',
        password: '123',
        name: '',
      };
      const result = registerSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThanOrEqual(2);
      }
    });
  });

  describe('loginSchema', () => {
    it('accepts valid phone and password', () => {
      const result = loginSchema.safeParse({ phone: '01711223344', password: 'secret' });
      expect(result.success).toBe(true);
    });

    it('rejects empty credentials', () => {
      const result = loginSchema.safeParse({ phone: '', password: '' });
      expect(result.success).toBe(false);
    });
  });

  describe('adminLoginSchema', () => {
    it('requires non-empty password', () => {
      expect(adminLoginSchema.safeParse({ password: 'admin' }).success).toBe(true);
      expect(adminLoginSchema.safeParse({ password: '' }).success).toBe(false);
    });
  });

  describe('questionCreateUpdateSchema', () => {
    it('validates a complete question object', () => {
      const q = {
        subject: 'physics_1',
        paper: 1,
        chapterId: 'chap_1',
        questionText: 'কাজ-শক্তি উপপাদ্য কী?',
        correctAnswer: 'A',
        options: [
          { id: 'A', text: 'অপশন ক' },
          { id: 'B', text: 'অপশন খ' },
        ],
        difficulty: 'medium',
      };
      const result = questionCreateUpdateSchema.safeParse(q);
      expect(result.success).toBe(true);
    });

    it('fails when question text or correct answer is omitted', () => {
      const invalidQ = {
        subject: 'physics_1',
        chapterId: 'chap_1',
        questionText: '',
      };
      const result = questionCreateUpdateSchema.safeParse(invalidQ);
      expect(result.success).toBe(false);
    });
  });
});
