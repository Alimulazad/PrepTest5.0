import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

// Middleware generator to validate request bodies with Zod
export function validateBody<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const formattedErrors = result.error.issues.map((err) => {
        const pathStr = err.path.join('.');
        let rowInfo = '';
        if (typeof err.path[0] === 'number') {
          rowInfo = `Row ${err.path[0] + 1} (Item index ${err.path[0]}): `;
        } else if ((err.path[0] === 'questions' || err.path[0] === 'data') && typeof err.path[1] === 'number') {
          rowInfo = `Row ${err.path[1] + 1} (Item index ${err.path[1]}): `;
        }
        return {
          path: pathStr,
          message: `${rowInfo}${err.message}`,
        };
      });
      return res.status(400).json({
        error: 'Validation failed',
        details: formattedErrors,
      });
    }
    req.body = result.data;
    next();
  };
}

// User & Auth Schemas
export const registerSchema = z.object({
  phone: z.string().min(6, 'Phone number must be at least 6 digits').max(20),
  password: z.string().min(4, 'Password must be at least 4 characters'),
  name: z.string().min(1, 'Name is required').max(100),
  target_university: z.string().optional().default('buet'),
  exam_year: z.string().optional().default('2025'),
});

export const loginSchema = z.object({
  phone: z.string().min(1, 'Phone is required'),
  password: z.string().min(1, 'Password is required'),
});

export const adminLoginSchema = z.object({
  password: z.string().min(1, 'Admin password is required'),
});

export const userProfileUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  target_university: z.string().optional(),
  exam_year: z.string().optional(),
  avatar_seed: z.string().optional(),
  avatar_bg_color: z.string().optional(),
});

// Question & Topic Mutation Schemas
export const questionOptionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
});

export const questionCreateUpdateSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  paper: z.number().int().min(1).max(2).optional().default(1),
  chapterId: z.string().min(1, 'Chapter ID is required'),
  topic: z.string().optional().default(''),
  questionText: z.string().min(1, 'Question text is required'),
  questionType: z.enum(['mcq', 'written']).optional().default('mcq'),
  options: z.array(questionOptionSchema).optional(),
  correctAnswer: z.string().min(1, 'Correct answer is required'),
  explanation: z.string().optional().default(''),
  university: z.string().optional().default(''),
  year: z.string().optional().default(''),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional().default('medium'),
  tags: z.array(z.string()).optional().default([]),
});

export const batchQuestionsCreateSchema = z.object({
  questions: z.array(questionCreateUpdateSchema).min(1, 'At least 1 question is required'),
});

export const bulkQuestionItemSchema = z
  .object({
    id: z.string().optional(),
    subject_id: z.string().optional(),
    subject: z.string().optional(),
    subject_name: z.string().optional(),
    paper: z.union([z.number(), z.string()]).optional(),
    chapter_id: z.string().optional(),
    chapterId: z.string().optional(),
    chapter_name: z.string().optional(),
    topic_id: z.string().optional(),
    topic_name: z.string().optional(),
    topic: z.string().optional(),
    category: z.string().optional(),
    question_text: z.string().optional(),
    questionText: z.string().optional(),
    math_formula_latex: z.string().nullable().optional(),
    options: z.union([
      z.record(z.string(), z.any()),
      z.array(
        z.object({
          id: z.string(),
          text: z.string().optional().default(''),
          label: z.string().optional(),
        })
      ),
    ]),
    correct_ans: z.string().optional(),
    correctAnswer: z.string().optional(),
    explanation: z.string().optional(),
    explanation_latex: z.string().nullable().optional(),
    question_image_url: z.string().nullable().optional(),
    explanation_image_url: z.string().nullable().optional(),
    tags: z.union([z.array(z.string()), z.string()]).optional(),
    star_rating: z.union([z.number(), z.string()]).optional(),
    type: z.enum(['mcq', 'written']).optional(),
    questionType: z.enum(['mcq', 'written']).optional(),
    difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
    university: z.string().optional(),
    year: z.string().optional(),
  })
  .refine(
    (data) => Boolean((data.question_text && data.question_text.trim()) || (data.questionText && data.questionText.trim())),
    { message: 'Question text is required (question_text or questionText)', path: ['question_text'] }
  )
  .refine(
    (data) => Boolean((data.correct_ans && data.correct_ans.trim()) || (data.correctAnswer && data.correctAnswer.trim())),
    { message: 'Correct answer is required (correct_ans or correctAnswer)', path: ['correct_ans'] }
  )
  .refine(
    (data) => Boolean((data.subject_id && data.subject_id.trim()) || (data.subject && data.subject.trim())),
    { message: 'Subject is required (subject_id or subject)', path: ['subject_id'] }
  );

export const bulkQuestionsImportSchema = z.union([
  z.array(bulkQuestionItemSchema).min(1, 'JSON array must contain at least 1 question'),
  z.object({
    questions: z.array(bulkQuestionItemSchema).min(1, 'Questions array must contain at least 1 question'),
  }),
  z.object({
    data: z.array(bulkQuestionItemSchema).min(1, 'Data array must contain at least 1 question'),
  }),
]);

// ---------------- WRITTEN QUESTION SCHEMAS ----------------
export const writtenQuestionCreateUpdateSchema = z.object({
  id: z.string().optional(),
  subject_id: z.string().min(1, 'Subject ID is required (e.g. physics_1, physics_2)'),
  subject_name: z.string().min(1, 'Subject name is required'),
  paper: z.enum(['1st', '2nd', 'all']).optional().default('1st'),
  chapter_id: z.string().min(1, 'Chapter ID is required (e.g. phy1_ch2)'),
  chapter_name: z.string().min(1, 'Chapter name is required'),
  topic_id: z.string().optional(),
  topic_name: z.string().optional(),
  question_number: z.number().int().positive().optional(),
  question_text: z.string().min(1, 'Question text is required (supports LaTeX $...$ / $$...$$)'),
  question_image_url: z.string().url().nullable().optional().or(z.literal('')),
  explanation: z.string().min(1, 'Explanation and step-by-step solution is required'),
  explanation_latex: z.string().nullable().optional(),
  explanation_image_urls: z.array(z.string()).optional().default([]),
  tags: z.array(z.string()).optional().default([]),
  category: z.enum(['academic', 'main_book', 'engineering', 'medical', 'varsity_a']).optional().default('engineering'),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional().default('medium'),
  star_rating: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional().default(1),
  is_active: z.boolean().optional().default(true),
});

export const bulkWrittenQuestionItemSchema = z.object({
  id: z.string().optional(),
  subject_id: z.string().min(1, 'Subject ID is required (e.g. physics_1, math_2)'),
  subject_name: z.string().min(1, 'Subject name is required'),
  paper: z.union([z.literal('1st'), z.literal('2nd'), z.literal('all'), z.number().transform((n) => (n === 2 ? '2nd' : '1st'))]).default('1st'),
  chapter_id: z.string().min(1, 'Chapter ID is required (e.g. phy2_ch1)'),
  chapter_name: z.string().min(1, 'Chapter name is required'),
  topic_id: z.string().optional(),
  topic_name: z.string().optional(),
  question_number: z.union([z.number(), z.string().transform((s) => parseInt(s, 10))]).optional(),
  question_text: z.string().min(1, 'Question text is required'),
  question_image_url: z.string().nullable().optional(),
  explanation: z.string().min(1, 'Detailed solution is required'),
  explanation_latex: z.string().nullable().optional(),
  explanation_image_urls: z.union([
    z.array(z.string()),
    z.string().transform((str) => {
      try {
        const parsed = JSON.parse(str);
        return Array.isArray(parsed) ? parsed : [str];
      } catch {
        return str.split(',').map((s) => s.trim()).filter(Boolean);
      }
    }),
  ]).optional(),
  tags: z.union([
    z.array(z.string()),
    z.string().transform((str) => {
      try {
        const parsed = JSON.parse(str);
        return Array.isArray(parsed) ? parsed : [str];
      } catch {
        return str.split(',').map((s) => s.trim()).filter(Boolean);
      }
    }),
  ]).optional().default([]),
  category: z.string().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional().default('medium'),
  star_rating: z.union([z.number(), z.string().transform((s) => parseInt(s, 10))]).optional().default(1),
  is_active: z.boolean().optional().default(true),
});

export const bulkWrittenQuestionsImportSchema = z.union([
  z.array(bulkWrittenQuestionItemSchema).min(1, 'JSON array must contain at least 1 written question'),
  z.object({
    written_questions: z.array(bulkWrittenQuestionItemSchema).min(1, 'Array must contain at least 1 written question'),
  }),
  z.object({
    questions: z.array(bulkWrittenQuestionItemSchema).min(1, 'Array must contain at least 1 written question'),
  }),
  z.object({
    data: z.array(bulkWrittenQuestionItemSchema).min(1, 'Array must contain at least 1 written question'),
  }),
]);

export const draftCreateSchema = z.object({
  source: z.string().optional().default('manual'),
  chapterId: z.string().optional(),
  subject: z.string().optional(),
  content: z.record(z.string(), z.any()),
});

export const draftReviewSchema = z.object({
  action: z.enum(['approve', 'reject']),
  reviewedContent: z.record(z.string(), z.any()).optional(),
});

// AI Request Schemas
export const aiChatSchema = z.object({
  message: z.string().min(1, 'Message is required'),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'model', 'assistant']),
        content: z.string(),
      })
    )
    .optional()
    .default([]),
  context: z.record(z.string(), z.any()).optional(),
});

export const aiExplainQuestionSchema = z.object({
  question: questionCreateUpdateSchema.partial().extend({
    questionText: z.string().min(1),
    correctAnswer: z.string().min(1),
  }),
  userSelectedAns: z.string().optional(),
});

export const aiSolvePhotoSchema = z.object({
  image: z.string().min(1, 'Image data is required'),
  prompt: z.string().optional(),
});

export const adminApiKeySaveSchema = z.object({
  keys: z.array(
    z.object({
      id: z.string().min(1),
      provider: z.string().min(1),
      label: z.string().min(1),
      key_full: z.string().optional(),
      key_masked: z.string().optional(),
      priority: z.number().int().optional(),
      is_active: z.boolean().optional(),
      model: z.string().optional(),
    })
  ),
});

export const adminApiKeyTestSchema = z.object({
  key: z.string().min(1, 'Key is required to test'),
  provider: z.string().optional().default('openrouter'),
  model: z.string().optional().default('anthropic/claude-3.5-sonnet'),
});
