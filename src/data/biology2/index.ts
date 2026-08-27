import { BIOLOGY_2_CHAPTERS } from './topics';
import { BIOLOGY_2_KNOWLEDGE_SNIPPETS } from './knowledge_snippets';
import { CH1_QUESTIONS } from './ch1_questions';
import { CH2_QUESTIONS } from './ch2_questions';
import { CH3_QUESTIONS } from './ch3_questions';
import { CH4_QUESTIONS } from './ch4_questions';
import { CH5_7_11_WRITTEN_QUESTIONS } from './ch5_7_11_written_questions';
import { Question } from '../../types';

export const ALL_BIOLOGY_2_QUESTIONS: Question[] = [
  ...CH1_QUESTIONS,
  ...CH2_QUESTIONS,
  ...CH3_QUESTIONS,
  ...CH4_QUESTIONS,
  ...CH5_7_11_WRITTEN_QUESTIONS,
];

export { BIOLOGY_2_CHAPTERS, BIOLOGY_2_KNOWLEDGE_SNIPPETS };
