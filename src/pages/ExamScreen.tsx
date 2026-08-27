import React, { useState, useEffect } from 'react';
import { Question, UserProgress, ExamHistoryItem, User as UserType, MistakeLog } from '../types';
import { ExamFlowStep, ExamSetupState, ExamSessionResult, PresetExamConfig } from './exam/types';
import { QuickPracticeFlow } from './exam/QuickPracticeFlow';
import { QuickPracticeQuiz } from './exam/QuickPracticeQuiz';
import { QuickPracticeResultLeaderboard } from './exam/QuickPracticeResultLeaderboard';
import { ExamTopicSelectPage } from './exam/ExamTopicSelectPage';
import { ExamStandardSelectPage } from './exam/ExamStandardSelectPage';
import { ExamConfirmPage } from './exam/ExamConfirmPage';
import { ExamLivePage } from './exam/ExamLivePage';
import { ExamResultMascotPage } from './exam/ExamResultMascotPage';
import { ExamMilestonePage } from './exam/ExamMilestonePage';
import { ExamReviewPage } from './exam/ExamReviewPage';
import { LiveBattleArena } from './LiveBattleArena';
import { BattleOrSoloModal } from '../components/BattleOrSoloModal';
import { EXAM_SUBJECTS } from './exam/examData';
import { INITIAL_QUESTIONS } from '../data/admissionData';
import { calculateExamScore } from '../utils/scoring';

interface ExamScreenProps {
  questions: Question[];
  progress: UserProgress;
  currentUser?: UserType | null;
  initialChapterId?: string | null;
  onSaveProgress: (updated: UserProgress) => void;
  onAskAI?: (question: Question) => void;
  onFlowStateChange?: (isInSetupOrExam: boolean) => void;
}

export const ExamScreen: React.FC<ExamScreenProps> = ({
  questions,
  progress,
  currentUser = null,
  initialChapterId,
  onSaveProgress,
  onAskAI,
  onFlowStateChange,
}) => {
  const [currentStep, setCurrentStep] = useState<ExamFlowStep>('dashboard');

  // Setup State for Mock Exams
  const [setupState, setSetupState] = useState<ExamSetupState>({
    subjectKey: 'chemistry',
    subjectName: 'রসায়ন',
    selectedSubTopicIds: [],
    selectedChapterIds: [],
    selectedPaperIds: [],
    questionCount: 30,
    standards: ['varsity', 'medical'],
    questionType: 'mcq',
    durationMinutes: 30,
    negativeMarking: true,
  });

  // Quick Practice Active State
  const [quickPracticeState, setQuickPracticeState] = useState<{
    chapterId: string;
    chapterName: string;
    subjectKey: string;
    subjectName: string;
  }>({
    chapterId: '',
    chapterName: '',
    subjectKey: 'physics',
    subjectName: 'পদার্থবিজ্ঞান',
  });

  // Quick Practice Score summary for leaderboard
  const [quickPracticeScore, setQuickPracticeScore] = useState<{
    pointsEarned: number;
    avgTimeSeconds: number;
    accuracy: number;
    totalAnswered: number;
    correctCount: number;
  }>({
    pointsEarned: 16.0,
    avgTimeSeconds: 2,
    accuracy: 27,
    totalAnswered: 15,
    correctCount: 8,
  });

  // Track solved progress for chapters locally
  const [solvedChapterMap, setSolvedChapterMap] = useState<Record<string, number>>({
    phy1_ch1: 18,
    chem1_ch2: 25,
  });

  // Battle Modal State
  const [isBattleModalOpen, setIsBattleModalOpen] = useState(false);
  const [battleModalData, setBattleModalData] = useState<{
    subjectKey: string;
    subjectName: string;
    chapterId: string;
    chapterName: string;
  } | null>(null);

  // Active Exam / Practice Questions
  const [activeQuestions, setActiveQuestions] = useState<Question[]>([]);
  const [examResult, setExamResult] = useState<ExamSessionResult | null>(null);

  // Notify App.tsx about flow state (to hide BottomNav during setup & live exam steps)
  useEffect(() => {
    const isExamActiveOrSetup = currentStep !== 'dashboard';

    if (onFlowStateChange) {
      onFlowStateChange(isExamActiveOrSetup);
    }

    return () => {
      if (onFlowStateChange) {
        onFlowStateChange(false);
      }
    };
  }, [currentStep, onFlowStateChange]);

  // Handle Initial Subject/Chapter if passed from other tabs
  useEffect(() => {
    if (initialChapterId) {
      let subjKey = 'chemistry';
      let subjName = 'রসায়ন';

      if (initialChapterId.startsWith('chem')) {
        subjKey = 'chemistry';
        subjName = 'রসায়ন';
      } else if (initialChapterId.startsWith('phy')) {
        subjKey = 'physics';
        subjName = 'পদার্থবিজ্ঞান';
      } else if (initialChapterId.startsWith('m') || initialChapterId.startsWith('math')) {
        subjKey = 'math';
        subjName = 'উচ্চতর গণিত';
      } else if (initialChapterId.startsWith('bio')) {
        subjKey = 'biology';
        subjName = 'জীববিজ্ঞান';
      }

      setSetupState((prev) => ({ ...prev, subjectKey: subjKey, subjectName: subjName }));

      setBattleModalData({
        subjectKey: subjKey,
        subjectName: subjName,
        chapterId: initialChapterId,
        chapterName: 'অধ্যায়ভিত্তিক প্রস্তুতি',
      });
      setIsBattleModalOpen(true);
    }
  }, [initialChapterId]);

  // Helper to filter / prepare questions
  const prepareQuestions = (config: ExamSetupState): Question[] => {
    let pool = questions && questions.length > 0 ? [...questions] : [];

    if (config.subjectKey && config.subjectKey !== 'preset') {
      const subjectMapping: Record<string, string[]> = {
        chemistry: ['chemistry_1', 'chemistry_2', 'chemistry'],
        physics: ['physics_1', 'physics_2', 'physics'],
        math: ['math_1', 'math_2', 'math', 'higher_math'],
        biology: ['biology_1', 'biology_2', 'biology'],
        bangla: ['bangla'],
        english: ['english'],
        gk: ['gk'],
        ict: ['ict'],
        agriculture: ['agriculture'],
        statistics: ['statistics'],
      };

      const validSubjectIds = subjectMapping[config.subjectKey] || [config.subjectKey];
      const filteredBySubject = pool.filter(
        (q) => validSubjectIds.includes(q.subject_id) || validSubjectIds.some((s) => q.subject_id.startsWith(s))
      );
      if (filteredBySubject.length > 0) {
        pool = filteredBySubject;
      }
    }

    if (pool.length === 0) {
      return [];
    }

    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const count = Math.min(shuffled.length, config.questionCount || 15);
    return shuffled.slice(0, count);
  };

  // --- Quick Practice Launch Handlers ---
  const handleStartQuickPracticeSolo = (chapterId: string, chapterName: string, subjectKey: string) => {
    const subj = EXAM_SUBJECTS.find((s) => s.key === subjectKey);
    setQuickPracticeState({
      chapterId,
      chapterName,
      subjectKey,
      subjectName: subj?.name || 'পদার্থবিজ্ঞান',
    });

    const prepared = prepareQuestions({
      ...setupState,
      subjectKey,
      questionCount: 15,
    });

    setActiveQuestions(prepared);
    setCurrentStep('quick_practice');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartQuickPracticeBattle = (chapterId: string, chapterName: string, subjectKey: string) => {
    const subj = EXAM_SUBJECTS.find((s) => s.key === subjectKey);
    const prepared = prepareQuestions({
      ...setupState,
      subjectKey,
      questionCount: 10,
    });

    setBattleModalData({
      subjectKey,
      subjectName: subj?.name || 'পদার্থবিজ্ঞান',
      chapterId,
      chapterName,
    });

    setActiveQuestions(prepared);
    setCurrentStep('battle');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Finish Quick Practice & Move to Leaderboard Screen (Step 7)
  const handleFinishQuickQuiz = (results: {
    totalAnswered: number;
    correctCount: number;
    wrongCount: number;
    pointsEarned: number;
    avgTimeSeconds: number;
    accuracy: number;
    wrongQuestionIds: string[];
  }) => {
    setQuickPracticeScore(results);

    // Update solved chapter progress bar
    if (quickPracticeState.chapterId) {
      setSolvedChapterMap((prev) => ({
        ...prev,
        [quickPracticeState.chapterId]: Math.min(100, (prev[quickPracticeState.chapterId] || 0) + 20),
      }));
    }

    // Save past mistakes to progress
    const newMistakes: MistakeLog[] = results.wrongQuestionIds.map((qId) => ({
      questionId: qId,
      selectedAns: 'A',
      timestamp: Date.now(),
      resolved: false,
    }));

    const updatedProgress: UserProgress = {
      ...progress,
      points: +( (progress.points || 0) + results.pointsEarned ).toFixed(2),
      totalCorrect: (progress.totalCorrect || 0) + results.correctCount,
      totalWrong: (progress.totalWrong || 0) + results.wrongCount,
      pastMistakes: [...newMistakes, ...(progress.pastMistakes || [])],
      streakDays: Math.max(1, progress.streakDays || 1),
    };

    onSaveProgress(updatedProgress);
    setCurrentStep('quick_result');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Proceed from Leaderboard back to Chapter List
  const handleProceedFromLeaderboard = () => {
    setCurrentStep('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- Mock Exam Flow Handlers ---
  const handleSelectTopicSelectForMock = (subjectKey: string) => {
    const subj = EXAM_SUBJECTS.find((s) => s.key === subjectKey);
    setSetupState((prev) => ({
      ...prev,
      subjectKey,
      subjectName: subj?.name || 'রসায়ন',
      presetId: null,
      presetOptionalSelected: [],
    }));
    setCurrentStep('topic_select');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartPresetExam = (preset: PresetExamConfig, optionalSelected: string[]) => {
    setSetupState({
      subjectKey: 'preset',
      subjectName: preset.title,
      selectedSubTopicIds: [],
      selectedChapterIds: [],
      selectedPaperIds: [],
      questionCount: preset.totalQuestions,
      standards: ['varsity', 'engineering'],
      questionType: 'mcq',
      durationMinutes: preset.durationMinutes,
      negativeMarking: true,
      presetId: preset.id,
      presetOptionalSelected: optionalSelected,
    });

    const allShuffled = [...questions].sort(() => Math.random() - 0.5);
    const presetQuestions = allShuffled.slice(0, Math.min(preset.totalQuestions, allShuffled.length));

    setActiveQuestions(presetQuestions);
    setCurrentStep('live');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTopicSelectNext = (data: {
    selectedSubTopicIds: string[];
    selectedChapterIds: string[];
    selectedPaperIds: string[];
    questionCount: number;
  }) => {
    setSetupState((prev) => ({
      ...prev,
      ...data,
    }));
    setCurrentStep('standard_select');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStandardSelectNext = (standards: string[]) => {
    setSetupState((prev) => ({
      ...prev,
      standards,
    }));
    setCurrentStep('confirm');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleConfirmStartExam = (finalState: ExamSetupState) => {
    setSetupState(finalState);
    const prepared = prepareQuestions(finalState);
    setActiveQuestions(prepared);
    setCurrentStep('live');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFinishExam = (
    answers: Record<string, 'A' | 'B' | 'C' | 'D'>,
    timeTakenSeconds: number
  ) => {
    const scoring = calculateExamScore(
      answers,
      activeQuestions,
      setupState.negativeMarking ? 0.25 : 0
    );

    const resultSummary: ExamSessionResult = {
      examTitle: setupState.presetId ? setupState.subjectName : 'মক পরীক্ষা',
      subjectName: setupState.subjectName,
      totalQuestions: scoring.totalMarks,
      score: scoring.score,
      totalMarks: scoring.totalMarks,
      correctCount: scoring.correctCount,
      wrongCount: scoring.wrongCount,
      skippedCount: scoring.skippedCount,
      pointsEarned: scoring.pointsEarned,
      timeTakenMinutes: Math.ceil(timeTakenSeconds / 60),
      timeTakenSeconds,
      questions: activeQuestions,
      userAnswers: answers,
      date: new Date().toLocaleDateString('bn-BD'),
    };

    setExamResult(resultSummary);

    const newHistoryItem: ExamHistoryItem = {
      id: 'exam_' + Date.now(),
      title: resultSummary.examTitle,
      subject: setupState.subjectName,
      totalQuestions: resultSummary.totalQuestions,
      score: resultSummary.score,
      correctCount: resultSummary.correctCount,
      wrongCount: resultSummary.wrongCount,
      skippedCount: resultSummary.skippedCount,
      timeTakenSeconds,
      date: new Date().toLocaleDateString('bn-BD'),
      tag: setupState.presetId ? 'Preset' : 'Mock Test',
    };

    const updatedProgress: UserProgress = {
      ...progress,
      points: (progress.points || 0) + scoring.pointsEarned,
      examsCompleted: (progress.examsCompleted || 0) + 1,
      totalCorrect: (progress.totalCorrect || 0) + scoring.correctCount,
      totalWrong: (progress.totalWrong || 0) + scoring.wrongCount,
      streakDays: Math.max(1, progress.streakDays || 1),
      examHistory: [newHistoryItem, ...(progress.examHistory || [])],
    };

    onSaveProgress(updatedProgress);
    setCurrentStep('result_mascot');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBattleFinished = (score: number, won: boolean, pointsEarned: number) => {
    const updatedProgress: UserProgress = {
      ...progress,
      points: (progress.points || 0) + pointsEarned,
      streakDays: Math.max(1, progress.streakDays || 1),
      totalCorrect: (progress.totalCorrect || 0) + Math.round(score / 10),
    };
    onSaveProgress(updatedProgress);
  };

  return (
    <>
      {/* Battle Modal from external triggers */}
      {battleModalData && (
        <BattleOrSoloModal
          isOpen={isBattleModalOpen}
          onClose={() => setIsBattleModalOpen(false)}
          subjectName={battleModalData.subjectName}
          chapterTitle={battleModalData.chapterName}
          onSelectBattle={() => {
            setIsBattleModalOpen(false);
            handleStartQuickPracticeBattle(
              battleModalData.chapterId,
              battleModalData.chapterName,
              battleModalData.subjectKey
            );
          }}
          onSelectSolo={() => {
            setIsBattleModalOpen(false);
            handleStartQuickPracticeSolo(
              battleModalData.chapterId,
              battleModalData.chapterName,
              battleModalData.subjectKey
            );
          }}
        />
      )}

      {/* Main View Router */}
      {(() => {
        switch (currentStep) {
          case 'dashboard':
            return (
              <QuickPracticeFlow
                onStartSoloPractice={handleStartQuickPracticeSolo}
                onStartBattle={handleStartQuickPracticeBattle}
                onStartPresetExam={handleStartPresetExam}
                onSelectTopicSelectForMock={handleSelectTopicSelectForMock}
                solvedChapterMap={solvedChapterMap}
              />
            );

          case 'quick_practice':
            return (
              <QuickPracticeQuiz
                chapterTitle={quickPracticeState.chapterName}
                subjectName={quickPracticeState.subjectName}
                questions={activeQuestions.length > 0 ? activeQuestions : questions}
                onFinishQuiz={handleFinishQuickQuiz}
                onExit={() => {
                  setCurrentStep('dashboard');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                bookmarkedIds={progress.bookmarks}
                onBookmarkQuestion={(qId) => {
                  const isBookmarked = progress.bookmarks.includes(qId);
                  const updatedBookmarks = isBookmarked
                    ? progress.bookmarks.filter((id) => id !== qId)
                    : [...progress.bookmarks, qId];
                  onSaveProgress({
                    ...progress,
                    bookmarks: updatedBookmarks,
                  });
                }}
              />
            );

          case 'quick_result':
            return (
              <QuickPracticeResultLeaderboard
                scoreResults={quickPracticeScore}
                currentUser={currentUser}
                onProceed={handleProceedFromLeaderboard}
              />
            );

          case 'topic_select':
            return (
              <ExamTopicSelectPage
                subjectKey={setupState.subjectKey}
                onBack={() => {
                  setCurrentStep('dashboard');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onNext={handleTopicSelectNext}
                onAddAnotherSubject={() => {
                  setCurrentStep('dashboard');
                }}
                onOpenChapterBattle={(chId, chName) =>
                  handleStartQuickPracticeBattle(chId, chName, setupState.subjectKey)
                }
              />
            );

          case 'standard_select':
            return (
              <ExamStandardSelectPage
                initialStandards={setupState.standards}
                onBack={() => {
                  setCurrentStep('topic_select');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onNext={handleStandardSelectNext}
              />
            );

          case 'confirm':
            return (
              <ExamConfirmPage
                setupData={setupState}
                onBack={() => {
                  setCurrentStep('standard_select');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onStartExam={handleConfirmStartExam}
              />
            );

          case 'live':
            return (
              <ExamLivePage
                title={setupState.presetId ? setupState.subjectName : setupState.subjectName || 'মক পরীক্ষা'}
                durationMinutes={setupState.durationMinutes}
                questions={activeQuestions}
                onFinishExam={handleFinishExam}
                onExit={() => {
                  setCurrentStep('dashboard');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            );

          case 'battle':
            return (
              <LiveBattleArena
                questions={activeQuestions.length > 0 ? activeQuestions : questions}
                subjectName={battleModalData?.subjectName || setupState.subjectName}
                chapterTitle={battleModalData?.chapterName || 'অধ্যায় ভিত্তিক লড়াই'}
                currentUser={currentUser}
                progress={progress}
                onExit={() => {
                  setCurrentStep('dashboard');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onBattleFinished={handleBattleFinished}
              />
            );

          case 'result_mascot':
            if (!examResult) return null;
            return (
              <ExamResultMascotPage
                result={examResult}
                onNext={() => {
                  setCurrentStep('result_milestone');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            );

          case 'result_milestone':
            return (
              <ExamMilestonePage
                progress={progress}
                onNext={() => {
                  setCurrentStep('result_review');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            );

          case 'result_review':
            if (!examResult) return null;
            return (
              <ExamReviewPage
                result={examResult}
                bookmarkedIds={progress.bookmarks}
                onBookmarkQuestion={(qId) => {
                  const isBookmarked = progress.bookmarks.includes(qId);
                  const updatedBookmarks = isBookmarked
                    ? progress.bookmarks.filter((id) => id !== qId)
                    : [...progress.bookmarks, qId];
                  onSaveProgress({
                    ...progress,
                    bookmarks: updatedBookmarks,
                  });
                }}
                onBackToDashboard={() => {
                  setCurrentStep('dashboard');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            );

          default:
            return (
              <QuickPracticeFlow
                onStartSoloPractice={handleStartQuickPracticeSolo}
                onStartBattle={handleStartQuickPracticeBattle}
                onStartPresetExam={handleStartPresetExam}
                onSelectTopicSelectForMock={handleSelectTopicSelectForMock}
                solvedChapterMap={solvedChapterMap}
              />
            );
        }
      })()}
    </>
  );
};

export default ExamScreen;
