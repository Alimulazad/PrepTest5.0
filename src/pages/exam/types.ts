import { Question, UserProgress } from '../../types';

export type ExamFlowStep =
  | 'dashboard'
  | 'topic_select'
  | 'standard_select'
  | 'confirm'
  | 'live'
  | 'battle'
  | 'quick_practice'
  | 'quick_result'
  | 'result_mascot'
  | 'result_milestone'
  | 'result_review';

export interface SubjectItem {
  key: string;
  name: string;
  nameEnglish: string;
  category: 'science' | 'general' | 'business';
  iconType: string;
  color: string;
  bgColor: string;
  borderColor: string;
  totalQuestions: number;
  solvedQuestions: number;
}

export interface SubTopicNode {
  id: string;
  name: string;
  totalQuestions: number;
  solvedQuestions: number;
}

export interface ChapterNode {
  id: string;
  name: string;
  paper: '1st' | '2nd';
  totalQuestions: number;
  solvedQuestions: number;
  subtopics: SubTopicNode[];
}

export interface PaperNode {
  paper: '1st' | '2nd';
  label: string;
  totalQuestions: number;
  solvedQuestions: number;
  chapters: ChapterNode[];
}

export interface PresetExamConfig {
  id: string;
  name: string;
  title: string;
  durationMinutes: number;
  totalQuestions: number;
  mandatorySubjects: { subjectKey: string; name: string; count: number }[];
  optionalSubjects: { subjectKey: string; name: string; count: number }[];
  requiredOptionalCount: number;
}

export interface ExamSetupState {
  subjectKey: string;
  subjectName: string;
  selectedSubTopicIds: string[];
  selectedChapterIds: string[];
  selectedPaperIds: string[];
  questionCount: number;
  standards: string[]; // 'engineering' | 'varsity' | 'medical' | 'academic' | 'main_book'
  questionType: 'mcq' | 'written';
  durationMinutes: number;
  negativeMarking: boolean;
  presetId?: string | null;
  presetOptionalSelected?: string[];
}

export interface ExamSessionResult {
  examTitle: string;
  subjectName: string;
  totalQuestions: number;
  score: number;
  totalMarks: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  pointsEarned: number;
  timeTakenMinutes: number;
  timeTakenSeconds: number;
  questions: Question[];
  userAnswers: Record<string, 'A' | 'B' | 'C' | 'D'>;
  date: string;
}
